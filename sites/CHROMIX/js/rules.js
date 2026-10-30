import { isWild, isDraw } from './cards.js';
export function canPlay(card, context) {
  const { topCard, currentColor, penalty, settings, handSize, drawnId } = context;
  if (!card || (drawnId && card.id !== drawnId)) return false;
  if (handSize === 1 && card.type !== 'number' && !settings.specialFinish) return false;
  if (penalty > 0) return isDraw(card);
  if (isWild(card)) return true;
  return card.color === currentColor || (card.type === 'number' && topCard.type === 'number' && card.value === topCard.value) || (card.type !== 'number' && card.type === topCard.type);
}
export function ruleContext(state, player = state.current) {
  return { topCard: state.discard.at(-1), currentColor: state.currentColor, penalty: state.penalty, settings: state.settings, handSize: state.players[player].hand.length, drawnId: state.drawnId };
}
/** A group is atomic: the first card must be legal, then only its number may follow. */
export function canPlayGroup(cards, context) {
  return Array.isArray(cards) && cards.length >= 2 && !context.penalty && !context.drawnId
    && cards.every(c => c?.type === 'number' && c.value === cards[0].value)
    && new Set(cards.map(c => c.id)).size === cards.length
    && canPlay(cards[0], context);
}
