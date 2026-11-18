import { createTiles, seededRandom } from './tiles.js';
export function createWall(players, rules, seed) {
    const tiles = createTiles(players, rules), random = seededRandom(seed);
    for (let i = tiles.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    return { live: tiles.slice(0, -14), dead: tiles.slice(-14), rinshanUsed: 0, doraCount: 1 };
}
export function drawLive(w) { const t = w.live.shift(); if (!t)
    throw new Error('生牌がありません'); return t; }
export function drawRinshan(w) {
    if (w.rinshanUsed >= 4 || !w.live.length)
        throw new Error('嶺上牌がありません');
    const at = w.rinshanUsed++;
    const t = w.dead[at];
    w.dead[at] = w.live.pop();
    return t;
}
export function indicators(w, ura = false) { return Array.from({ length: w.doraCount }, (_, i) => w.dead[4 + i * 2 + (ura ? 1 : 0)]); }
