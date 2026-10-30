import { canPlay } from './rules.js';
import { COLORS } from './settings.js';
import { nextPlayer } from './turnManager.js';
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
/** Capability boundary. Never pass engine state to chooseMove. No deck or opponent hands. */
export function createCpuView(state) {
  const own = state.players[state.current];
  return freeze(structuredClone({
    self: state.current, difficulty: own.difficulty, phase: state.phase,
    hand: own.hand, topCard: state.discard.at(-1), currentColor: state.currentColor,
    players: state.players.map(p => ({ name: p.name, count: p.hand.length })),
    direction: state.direction, next: nextPlayer(state), penalty: state.penalty,
    drawnId: state.drawnId, uno: own.uno,
    callWindow: state.callWindow,
    history: state.logs.map(({ text, kind, turn }) => ({ text, kind, turn })),
    rules: {
      colorCount: state.settings.colorCount, specialFinish: state.settings.specialFinish,
      reverseTwo: state.settings.reverseTwo, targetMode: state.settings.targetMode,
      unoMode: state.settings.unoMode,
    },
  }));
}
const pick = (list, random) => list[Math.floor(random() * list.length)];
export function chooseColor(view, random = Math.random) {
  const colors = COLORS.slice(0, view.rules.colorCount);
  if (view.difficulty === 'easy') return pick(colors, random).id;
  const scores = Object.fromEntries(colors.map(c => [c.id, 0]));
  view.hand.forEach(c => { if (c.color) scores[c.color] += c.type === 'number' ? 1 : 1.2; });
  return colors.reduce((best, c) => scores[c.id] > scores[best.id] ? c : best).id;
}
export function chooseTarget(view) {
  if (view.rules.targetMode === 'next') return view.next;
  const others = view.players.map((p, id) => ({ ...p, id })).filter(p => p.id !== view.self);
  // Swapping is useful with the fewest cards; redrawing pressures the next threat.
  return others.reduce((a, b) => b.count < a.count ? b : a).id;
}
export function legalCards(view) {
  const ctx = { topCard: view.topCard, currentColor: view.currentColor, penalty: view.penalty, settings: view.rules, handSize: view.hand.length, drawnId: view.drawnId };
  return view.hand.filter(c => canPlay(c, ctx));
}
export function chooseMove(view, random = Math.random) {
  if (view.phase === 'HANDOFF') return { type: 'REVEAL' };
  if (view.phase === 'COLOR') return { type: 'COLOR', color: chooseColor(view, random) };
  if (view.phase === 'TARGET') return { type: 'TARGET', target: chooseTarget(view) };
  if (view.phase !== 'ACTION') return null;
  if (view.callWindow && view.callWindow.offender !== view.self && (view.difficulty !== 'easy' || random() > 0.4)) return { type: 'CALL_UNO', player: view.self };
  const legal = legalCards(view);
  if (!legal.length) return { type: view.drawnId ? 'PASS' : 'DRAW' };
  let card;
  if (view.difficulty === 'easy') card = pick(legal, random);
  else {
    const counts = Object.fromEntries(COLORS.map(c => [c.id, view.hand.filter(h => h.color === c.id).length]));
    const threat = view.players[view.next].count <= 2;
    const target = chooseTarget(view);
    const score = c => {
      let value = c.color ? counts[c.color] * 2 + 3 : -2;
      if (c.type === 'number') value += c.value / 30 + (!view.penalty && !view.drawnId ? view.hand.filter(h => h.type === 'number' && h.value === c.value).length * 4 : 0);
      if (c.type === 'skip' || c.type === 'reverse') value += threat ? 9 : 1;
      if (c.type === 'draw2' || c.type === 'draw4') value += view.penalty ? 25 : threat ? 14 : -1;
      if (c.type === 'swap') value += view.hand.length - 1 - view.players[target].count > 0 ? 18 : -18;
      if (c.type === 'redraw') value += threat ? 5 : -3;
      if (view.difficulty === 'hard') {
        if (c.color) value += counts[c.color] ** 1.5;
        if (view.hand.length <= 3 && !view.rules.specialFinish && c.type !== 'number') value += 18;
        // All evidence below is public. Infer a next player's preferred color from played cards.
        const nextName = view.players[view.next].name;
        const recent = view.history.slice(-18).filter(h => h.kind === 'play' && h.text.startsWith(`${nextName} が`));
        if (c.color && recent.some(h => h.text.includes(COLORS.find(x => x.id === c.color).name))) value -= 3;
        if (view.hand.length === 1) value += 100;
      }
      return value;
    };
    card = legal.reduce((best, c) => score(c) > score(best) ? c : best);
  }
  const group = card.type === 'number' && !view.penalty && !view.drawnId
    ? [card, ...view.hand.filter(c => c.id !== card.id && c.type === 'number' && c.value === card.value)] : [card];
  if (view.hand.length - group.length === 1 && !view.uno && (view.difficulty !== 'easy' || random() > 0.22)) {
    return { type: 'UNO', ...(group.length > 1 ? { cardIds: group.map(c => c.id) } : {}) };
  }
  return group.length > 1 ? { type: 'PLAY_MANY', cardIds: group.map(c => c.id) } : { type: 'PLAY', cardId: card.id };
}
