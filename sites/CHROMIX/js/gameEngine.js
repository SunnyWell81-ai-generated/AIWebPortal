import { validateSettings, VERSION, COLORS } from './settings.js';
import { generateDeck, isWild, cardLabel } from './cards.js';
import { canPlay, canPlayGroup, ruleContext } from './rules.js';
import { nextPlayer, needsHandoff } from './turnManager.js';
export const PHASES = ['ACTION', 'COLOR', 'TARGET', 'HANDOFF', 'GAME_OVER'];
function log(s, text, kind = 'info') {
  s.logs.push({ id: s.logSerial++, turn: s.turn, text, kind });
  if (s.logs.length > 240) s.logs.shift();
}
function drawCards(s, player, count, random) {
  for (let i = 0; i < count; i++) {
    if (!s.deck.length) { s.batch++; s.deck = generateDeck(s.settings, s.batch, random); s.stats.refills++; }
    s.players[player].hand.push(s.deck.pop());
  }
  s.players[player].uno = false;
  s.players[player].stats.drawn += count;
  if (s.callWindow?.offender === player) s.callWindow = null;
}
function beginTurn(s) {
  s.drawnId = null; s.pending = null; s.turn++; s.turnToken++;
  s.players[s.current].uno = false;
  s.phase = needsHandoff(s) ? 'HANDOFF' : 'ACTION';
}
function advance(s, steps = 1) { s.players[s.current].uno = false; s.current = nextPlayer(s, steps); beginTurn(s); }
function win(s, player) {
  s.winner = player; s.phase = 'GAME_OVER'; s.pending = null; s.callWindow = null; s.drawnId = null; s.penalty = 0;
  s.players[player].stats.wins++;
  log(s, `${s.players[player].name} の勝利！`, 'win');
}
export function createGame(input, random = Math.random) {
  const settings = validateSettings(input);
  const s = {
    version: VERSION, settings, players: settings.players.map(p => ({ ...p, hand: [], uno: false, stats: { played: 0, drawn: 0, specials: 0, unoCalls: 0, missedUno: 0, wins: 0 } })),
    deck: generateDeck(settings, 0, random), discard: [], batch: 0, current: 0, direction: 1,
    currentColor: null, penalty: 0, phase: 'ACTION', pending: null, drawnId: null, callWindow: null,
    winner: null, logs: [], logSerial: 0, turn: 0, turnToken: 0, revision: 0,
    stats: { refills: 0 }, startedAt: Date.now(),
  };
  for (let n = 0; n < settings.initialHand; n++) for (let i = 0; i < s.players.length; i++) drawCards(s, i, 1, random);
  // The initial face-up card is always a number. Its effects never run.
  if (!s.deck.some(c => c.type === 'number')) { s.batch++; s.deck.push(...generateDeck(settings, s.batch, random)); s.stats.refills++; }
  const index = s.deck.findIndex(c => c.type === 'number');
  const top = s.deck.splice(index, 1)[0]; s.discard.push(top); s.currentColor = top.color;
  // Dealing is not counted as voluntarily drawn cards.
  s.players.forEach(p => p.stats.drawn = 0);
  log(s, '新しいゲームを開始しました。'); beginTurn(s);
  return s;
}
function finishPlay(s, random) {
  const { card, player, target } = s.pending;
  const p = s.players[player];
  let steps = 1;
  // A final swap is resolved before victory: the empty hand belongs to its recipient.
  if (card.type === 'swap') {
    const other = s.players[target];
    [p.hand, other.hand] = [other.hand, p.hand]; p.uno = false; other.uno = false;
    s.callWindow = null;
    log(s, `${p.name} と ${other.name} が手札を入れ替え`, 'swap');
  } else if (card.type === 'redraw') {
    const other = s.players[target], count = other.hand.length;
    s.discard.splice(Math.max(0, s.discard.length - 1), 0, ...other.hand);
    other.hand = []; drawCards(s, target, count, random);
    log(s, `${other.name} の手札 ${count}枚を引き直し`, 'redraw');
  }
  const empty = s.players.findIndex(p => p.hand.length === 0);
  if (empty >= 0) { win(s, empty); return; }
  if (card.type === 'skip') {
    steps = 2; log(s, `${s.players[nextPlayer(s)].name} をスキップ`, 'skip');
  }
  if (card.type === 'reverse') {
    s.direction *= -1;
    if (s.players.length === 2 && s.settings.reverseTwo === 'skip') steps = 2;
    log(s, 'ターン方向が反転しました', 'reverse');
  }
  if (card.type === 'draw2' || card.type === 'draw4') {
    s.penalty += card.type === 'draw2' ? 2 : 4;
    log(s, `ドローペナルティ 合計 +${s.penalty}`, 'penalty');
  }
  s.pending = null; advance(s, steps);
}
function afterColor(s, random) {
  if (['swap', 'redraw'].includes(s.pending.card.type)) {
    if (s.settings.targetMode === 'choose') { s.phase = 'TARGET'; return; }
    s.pending.target = nextPlayer(s);
  }
  finishPlay(s, random);
}
function endCallWindow(s) { s.callWindow = null; }
export function transition(state, action, random = Math.random) {
  if (!state || !action || state.phase === 'GAME_OVER') return state;
  if (action.revision !== undefined && action.revision !== state.revision) return state;
  if (action.turnToken !== undefined && action.turnToken !== state.turnToken) return state;
  const actor = state.current, original = state.players[actor];
  const s = structuredClone(state), p = s.players[actor];
  let changed = false;
  if (action.type === 'REVEAL' && s.phase === 'HANDOFF') { s.phase = 'ACTION'; changed = true; }
  else if (action.type === 'CALL_UNO' && s.callWindow && ['ACTION', 'HANDOFF'].includes(s.phase)) {
    const caller = action.player;
    if (!Number.isInteger(caller) || caller < 0 || caller >= s.players.length || caller === s.callWindow.offender) return state;
    const offender = s.callWindow.offender;
    drawCards(s, offender, 5, random); s.players[offender].stats.missedUno++;
    log(s, `${s.players[caller].name} が指摘！ ${s.players[offender].name} に +5枚`, 'uno');
    s.callWindow = null; changed = true;
  } else if (action.type === 'UNO' && s.phase === 'ACTION' && !p.uno && (p.hand.length === 2 || (
    Array.isArray(action.cardIds) && action.cardIds.length === p.hand.length - 1
    && canPlayGroup(action.cardIds.map(id => original.hand.find(c => c.id === id)), ruleContext(state))
  ))) {
    p.uno = true; p.stats.unoCalls++; log(s, `${p.name} が UNO を宣言`, 'uno'); changed = true;
  } else if (['PLAY', 'PLAY_MANY'].includes(action.type) && s.phase === 'ACTION') {
    const ids = action.type === 'PLAY' ? [action.cardId] : action.cardIds;
    if (!Array.isArray(ids) || ids.length > original.hand.length) return state;
    const cards = ids.map(id => original.hand.find(c => c.id === id));
    if (action.type === 'PLAY' ? !canPlay(cards[0], ruleContext(state)) : !canPlayGroup(cards, ruleContext(state))) return state;
    endCallWindow(s);
    p.hand = p.hand.filter(c => !ids.includes(c.id));
    const card = cards.at(-1);
    s.discard.push(...cards);
    // Bound retained discard history without affecting the future deck or hand identities.
    if (s.discard.length > 500) s.discard.splice(0, s.discard.length - 500);
    p.stats.played += cards.length; if (card.type !== 'number') p.stats.specials++;
    log(s, cards.length > 1
      ? `${p.name} が数字 ${card.value} を ${cards.length}枚まとめ出し → ${COLORS.find(c => c.id === card.color).name}`
      : `${p.name} が ${cardLabel(card)} をプレイ`, 'play');
    if (p.hand.length === 1 && !p.uno) {
      if (s.settings.unoMode === 'auto') {
        drawCards(s, actor, 5, random); p.stats.missedUno++;
        log(s, `${p.name} の UNO 宣言忘れ：+5枚`, 'uno');
      } else {
        s.callWindow = { offender: actor, openedTurn: s.turn };
        log(s, `${p.name} が UNO 未宣言。次のプレイ／ドローまで指摘できます`, 'uno');
      }
    }
    p.uno = false; s.drawnId = null;
    s.pending = { card, player: actor, target: null };
    if (!isWild(card)) s.currentColor = card.color;
    if (p.hand.length === 0 && card.type !== 'swap') { win(s, actor); }
    else if (isWild(card)) { s.phase = 'COLOR'; }
    else { s.currentColor = card.color; finishPlay(s, random); }
    changed = true;
  } else if (action.type === 'COLOR' && s.phase === 'COLOR') {
    if (!COLORS.slice(0, s.settings.colorCount).some(c => c.id === action.color)) return state;
    s.currentColor = action.color;
    log(s, `現在の色：${COLORS.find(c => c.id === action.color).name}`, 'color');
    afterColor(s, random); changed = true;
  } else if (action.type === 'TARGET' && s.phase === 'TARGET') {
    if (!Number.isInteger(action.target) || action.target === actor || action.target < 0 || action.target >= s.players.length) return state;
    s.pending.target = action.target; finishPlay(s, random); changed = true;
  } else if ((action.type === 'DRAW' || action.type === 'TIMEOUT') && s.phase === 'ACTION') {
    endCallWindow(s);
    if (s.penalty) {
      const count = s.penalty; drawCards(s, actor, count, random); s.penalty = 0;
      log(s, `${p.name} がペナルティ ${count}枚を引き、ターン終了`, 'draw'); advance(s);
    } else if (s.drawnId) {
      if (action.type !== 'TIMEOUT') return state;
      log(s, `${p.name} が時間切れでパス`, 'pass'); advance(s);
    } else {
      drawCards(s, actor, 1, random); s.drawnId = p.hand.at(-1).id;
      log(s, `${p.name} が1枚ドロー`, 'draw');
      if (action.type === 'TIMEOUT' || !canPlay(p.hand.at(-1), ruleContext(s))) advance(s);
    }
    changed = true;
  } else if (action.type === 'PASS' && s.phase === 'ACTION' && s.drawnId) {
    log(s, `${p.name} がパス`, 'pass'); advance(s); changed = true;
  }
  // Selection phases also expire safely. Defaults never reveal hidden hands.
  else if (action.type === 'TIMEOUT' && s.phase === 'COLOR') {
    s.currentColor = COLORS.slice(0, s.settings.colorCount)[0].id;
    log(s, `時間切れ：${COLORS[0].name} を選択`, 'color'); afterColor(s, random); changed = true;
  } else if (action.type === 'TIMEOUT' && s.phase === 'TARGET') {
    s.pending.target = nextPlayer(s); log(s, '時間切れ：次のプレイヤーを選択'); finishPlay(s, random); changed = true;
  }
  if (!changed) return state;
  s.revision++; return s;
}
