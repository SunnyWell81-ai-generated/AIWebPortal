import { VERSION, validateSettings, COLORS, SPECIALS } from './settings.js';
import { PHASES } from './gameEngine.js';
export const KEYS = { settings: 'chromix.settings.v1', game: 'chromix.game.v1' };
const invalid = () => { throw new Error('セーブデータが破損しているか、対応していない形式です。'); };
const integer = (x, min, max) => Number.isSafeInteger(x) && x >= min && x <= max;
export function validateState(input) {
  if (!input || input.version !== VERSION) invalid();
  const s = structuredClone(input); s.settings = validateSettings(s.settings);
  const n = s.settings.players.length;
  if (!Array.isArray(s.players) || s.players.length !== n || !PHASES.includes(s.phase) || !integer(s.current, 0, n - 1) || ![1, -1].includes(s.direction) || !integer(s.penalty, 0, 100000) || !integer(s.batch, 0, 1e8)) invalid();
  for (const key of ['turn', 'turnToken', 'revision', 'logSerial']) if (!integer(s[key], 0, Number.MAX_SAFE_INTEGER)) invalid();
  if (!integer(s.startedAt, 0, Number.MAX_SAFE_INTEGER) || !s.stats || !integer(s.stats.refills, 0, 1e8)) invalid();
  const colors = COLORS.slice(0, s.settings.colorCount).map(c => c.id), ids = new Set();
  function card(c, unique = true) {
    if (!c || typeof c.id !== 'string' || !/^\d+:\d+$/.test(c.id) || c.id.length > 40) invalid();
    if (Number(c.id.split(':')[0]) > s.batch) invalid();
    if (unique && ids.has(c.id)) invalid();
    if (unique) ids.add(c.id);
    if (c.type === 'number') {
      if (!colors.includes(c.color) || !integer(c.value, 0, s.settings.maxNumber)) invalid();
    } else {
      if (!Object.hasOwn(SPECIALS, c.type) || !s.settings.specials[c.type] || c.value !== null) invalid();
      if (['skip', 'reverse', 'draw2'].includes(c.type) ? !colors.includes(c.color) : c.color !== null) invalid();
    }
  }
  function cards(list) {
    if (!Array.isArray(list) || list.length > 30000) invalid();
    list.forEach(c => card(c));
  }
  cards(s.deck); cards(s.discard);
  if (!s.discard.length || !colors.includes(s.currentColor)) invalid();
  s.players.forEach((p, i) => {
    cards(p.hand);
    if (typeof p.uno !== 'boolean' || typeof p.name !== 'string' || p.name !== s.settings.players[i].name || p.type !== s.settings.players[i].type || p.difficulty !== s.settings.players[i].difficulty || !p.stats) invalid();
    if (p.uno && (p.hand.length < 2 || i !== s.current || s.phase !== 'ACTION')) invalid();
    for (const key of ['played', 'drawn', 'specials', 'unoCalls', 'missedUno', 'wins']) if (!integer(p.stats[key], 0, Number.MAX_SAFE_INTEGER)) invalid();
  });
  if (['COLOR', 'TARGET'].includes(s.phase)) {
    if (!s.pending || s.pending.player !== s.current || s.pending.card?.id !== s.discard.at(-1).id || !['wild', 'draw4', 'swap', 'redraw'].includes(s.pending.card.type)) invalid();
    card(s.pending.card, false);
    if (JSON.stringify(s.pending.card) !== JSON.stringify(s.discard.at(-1))) invalid();
    if (s.phase === 'TARGET' && !['swap', 'redraw'].includes(s.pending.card.type)) invalid();
  } else if (s.pending !== null) invalid();
  if (s.drawnId !== null && (s.phase !== 'ACTION' || !s.players[s.current].hand.some(c => c.id === s.drawnId))) invalid();
  if (s.phase === 'GAME_OVER') {
    if (!integer(s.winner, 0, n - 1) || s.players[s.winner].hand.length !== 0) invalid();
  } else if (s.winner !== null || s.players.some(p => p.hand.length === 0 && !(s.pending?.card.type === 'swap' && s.pending.player === s.players.indexOf(p)))) invalid();
  if (s.phase === 'HANDOFF' && (s.players[s.current].type !== 'human' || s.players.filter(p => p.type === 'human').length < 2)) invalid();
  if (s.callWindow !== null && (!integer(s.callWindow?.offender, 0, n - 1) || !integer(s.callWindow.openedTurn, 0, s.turn) || s.players[s.callWindow.offender].hand.length !== 1)) invalid();
  if (!Array.isArray(s.logs) || s.logs.length > 240 || s.logs.some(l => !integer(l.id, 0, Number.MAX_SAFE_INTEGER) || !integer(l.turn, 0, s.turn) || typeof l.text !== 'string' || l.text.length > 500 || typeof l.kind !== 'string' || l.kind.length > 30)) invalid();
  return s;
}
export function serializeState(state) { return JSON.stringify({ game: 'CHROMIX', version: VERSION, state: validateState(state) }); }
export function deserializeState(text) {
  if (typeof text !== 'string' || text.length > 8000000) invalid();
  const data = JSON.parse(text);
  if (data?.game !== 'CHROMIX' || data.version !== VERSION) invalid();
  return validateState(data.state);
}
export function saveGame(state, store) {
  try { store ??= globalThis.localStorage; store.setItem(KEYS.game, serializeState(state)); return true; } catch { return false; }
}
export function loadGame(store) {
  try { store ??= globalThis.localStorage; const raw = store.getItem(KEYS.game); return { state: raw ? deserializeState(raw) : null, error: null }; }
  catch { return { state: null, error: '保存された対戦を読み込めませんでした。新しいゲームを開始できます。' }; }
}
export function saveSettings(settings, store) {
  try { store ??= globalThis.localStorage; store.setItem(KEYS.settings, JSON.stringify({ version: VERSION, settings: validateSettings(settings) })); return true; } catch { return false; }
}
export function loadSettings(store) {
  try { store ??= globalThis.localStorage; const data = JSON.parse(store.getItem(KEYS.settings)); return data?.version === VERSION ? validateSettings(data.settings) : null; } catch { return null; }
}
