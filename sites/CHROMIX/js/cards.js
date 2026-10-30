import { COLORS, SPECIALS } from './settings.js';
export const isWild = card => ['wild', 'draw4', 'swap', 'redraw'].includes(card.type);
export const isDraw = card => ['draw2', 'draw4'].includes(card.type);
export function shuffle(cards, random = Math.random) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
export function generateDeck(settings, batch = 0, random = Math.random) {
  const cards = [];
  const add = (type, color = null, value = null) => cards.push({ id: `${batch}:${cards.length}`, type, color, value });
  for (const color of COLORS.slice(0, settings.colorCount)) {
    for (let n = 0; n <= settings.maxNumber; n++) {
      add('number', color.id, n);
      if (n > 0) add('number', color.id, n);
    }
    for (const type of ['skip', 'reverse', 'draw2']) if (settings.specials[type]) {
      add(type, color.id); add(type, color.id);
    }
  }
  for (const type of ['wild', 'draw4', 'swap', 'redraw']) if (settings.specials[type]) for (let n = 0; n < 4; n++) add(type);
  return shuffle(cards, random);
}
export function cardLabel(card) {
  return `${COLORS.find(c => c.id === card.color)?.name ?? ''} ${card.type === 'number' ? card.value : SPECIALS[card.type]?.name ?? ''}`.trim();
}
