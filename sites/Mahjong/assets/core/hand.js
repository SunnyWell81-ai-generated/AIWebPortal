import { counts, ORPHANS } from './tiles.js';
/** Exact regular/chiitoitsu/kokushi shanten. Cache belongs to a worker or UI isolate. */
const cache = new Map();
export function shanten(c, open = 0) {
    const key = `${open}:${c.join('')}`;
    const hit = cache.get(key);
    if (hit !== undefined)
        return hit;
    let best = 8, nodes = 0;
    const walk = (at, m, t, p) => {
        while (at < 34 && !c[at])
            at++;
        if (at === 34) {
            best = Math.min(best, 8 - 2 * (m + open) - Math.min(t, 4 - m - open) - p);
            return;
        }
        if (m + open > 4 || t > 4 || p > 1)
            return;
        if (c[at] >= 3) {
            c[at] -= 3;
            walk(at, m + 1, t, p);
            c[at] += 3;
        }
        if (at < 27 && at % 9 < 7 && c[at + 1] && c[at + 2]) {
            c[at]--;
            c[at + 1]--;
            c[at + 2]--;
            walk(at, m + 1, t, p);
            c[at]++;
            c[at + 1]++;
            c[at + 2]++;
        }
        if (c[at] >= 2) {
            c[at] -= 2;
            if (!p)
                walk(at, m, t, 1);
            walk(at, m, t + 1, p);
            c[at] += 2;
        }
        if (at < 27 && at % 9 < 8 && c[at + 1]) {
            c[at]--;
            c[at + 1]--;
            walk(at, m, t + 1, p);
            c[at]++;
            c[at + 1]++;
        }
        if (at < 27 && at % 9 < 7 && c[at + 2]) {
            c[at]--;
            c[at + 2]--;
            walk(at, m, t + 1, p);
            c[at]++;
            c[at + 2]++;
        }
        c[at]--;
        walk(at, m, t, p);
        c[at]++;
        nodes++;
    };
    walk(0, 0, 0, 0);
    if (!open) {
        const pairs = c.filter(n => n >= 2).length, unique = c.filter(Boolean).length;
        best = Math.min(best, 6 - pairs + Math.max(0, 7 - unique), 13 - ORPHANS.filter(k => c[k]).length - (ORPHANS.some(k => c[k] >= 2) ? 1 : 0));
    }
    if (cache.size > 40000)
        cache.clear();
    cache.set(key, best);
    return best;
}
export const handShanten = (hand, melds) => shanten(counts(hand), melds.length);
export function shapes(c, melds = []) {
    const out = [], total = c.reduce((a, b) => a + b, 0);
    if (total !== 14 - melds.length * 3)
        return out;
    if (!melds.length) {
        if (c.filter(n => n === 2).length === 7)
            out.push({ type: 'chiitoi', pair: -1, groups: [] });
        if (ORPHANS.every(k => c[k] > 0) && ORPHANS.some(k => c[k] === 2) && c.every((n, k) => !n || ORPHANS.includes(k)))
            out.push({ type: 'kokushi', pair: ORPHANS.find(k => c[k] === 2), groups: [] });
    }
    const fixed = melds.map(m => ({ type: m.type === 'chi' ? 'sequence' : m.type === 'pon' ? 'triplet' : 'quad', kind: Math.min(...m.tiles.map(t => t.kind)), open: m.type !== 'ankan' }));
    const rec = (groups, pair) => {
        const k = c.findIndex(n => n > 0);
        if (k < 0) {
            if (groups.length + fixed.length === 4 && pair >= 0)
                out.push({ type: 'standard', pair, groups: [...groups, ...fixed] });
            return;
        }
        if (pair < 0 && c[k] >= 2) {
            c[k] -= 2;
            rec(groups, k);
            c[k] += 2;
        }
        if (groups.length + fixed.length >= 4)
            return;
        if (c[k] >= 3) {
            c[k] -= 3;
            rec([...groups, { type: 'triplet', kind: k, open: false }], pair);
            c[k] += 3;
        }
        if (k < 27 && k % 9 < 7 && c[k + 1] && c[k + 2]) {
            c[k]--;
            c[k + 1]--;
            c[k + 2]--;
            rec([...groups, { type: 'sequence', kind: k, open: false }], pair);
            c[k]++;
            c[k + 1]++;
            c[k + 2]++;
        }
    };
    rec([], -1);
    return out;
}
export function waits(c, open = 0, available = Array.from({ length: 34 }, (_, i) => i)) {
    if (c.reduce((a, b) => a + b, 0) !== 13 - open * 3)
        return [];
    return available.filter(k => { if (c[k] >= 4)
        return false; c[k]++; const yes = shanten(c, open) === -1; c[k]--; return yes; });
}
export function effectiveTiles(c, open, remaining, available) {
    const base = shanten(c, open), kinds = [];
    let count = 0;
    for (const k of available) {
        if (c[k] >= 4 || remaining[k] <= 0)
            continue;
        c[k]++;
        const s = shanten(c, open);
        c[k]--;
        if (s < base) {
            kinds.push(k);
            count += remaining[k];
        }
    }
    return { kinds, count };
}
export function isClosed(melds) { return melds.every(m => m.type === 'ankan'); }
