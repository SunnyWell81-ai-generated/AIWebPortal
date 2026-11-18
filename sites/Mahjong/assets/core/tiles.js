export const WIND_NAMES = ['東', '南', '西', '北'];
export const HONOR_NAMES = ['東', '南', '西', '北', '白', '發', '中'];
export const ORPHANS = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];
export const kindName = (k) => k < 27 ? `${k % 9 + 1}${['萬', '筒', '索'][Math.floor(k / 9)]}` : HONOR_NAMES[k - 27];
export const tileName = (t) => `${t.red ? '赤' : ''}${kindName(t.kind)}`;
export const isHonor = (k) => k >= 27;
export const isTerminal = (k) => k < 27 && (k % 9 === 0 || k % 9 === 8);
export const isOutside = (k) => isHonor(k) || isTerminal(k);
export const sortTiles = (a) => [...a].sort((x, y) => x.kind - y.kind || Number(y.red) - Number(x.red) || x.id - y.id);
export function counts(tiles) { const out = Array(34).fill(0); for (const t of tiles)
    out[t.kind]++; return out; }
export function kindsInUse(players, r) { return Array.from({ length: 34 }, (_, i) => i).filter(i => players !== 3 || r.sanmaManzu || i === 0 || i >= 8); }
export function createTiles(players, r) {
    return kindsInUse(players, r).flatMap(kind => Array.from({ length: 4 }, (_, copy) => ({ id: kind * 4 + copy, kind, red: kind < 27 && kind % 9 === 4 && copy < [r.redMan, r.redPin, r.redSou][Math.floor(kind / 9)] })));
}
export function nextDora(k, players, r) {
    if (players === 3 && !r.sanmaManzu && (k === 0 || k === 8))
        return k === 0 ? 8 : 0;
    if (k < 27)
        return Math.floor(k / 9) * 9 + (k % 9 + 1) % 9;
    if (k < 31)
        return 27 + (k - 27 + 1) % 4;
    return 31 + (k - 31 + 1) % 3;
}
export function windOf(seat, dealer, n) { return (27 + (seat - dealer + n) % n); }
export function seededRandom(seed) {
    let a = seed >>> 0;
    return () => { a += 0x6D2B79F5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
