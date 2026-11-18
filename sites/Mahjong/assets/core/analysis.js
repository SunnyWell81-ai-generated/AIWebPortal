import { counts } from './tiles.js';
import { effectiveTiles, shanten, waits } from './hand.js';
/** 公開情報からの受け入れ。14枚形では打牌後の候補ごとに算出する。 */
export function analyzeHand(hand, melds, remaining, available, allowedIds) {
    const c = counts(hand), base = shanten(c, melds.length);
    if (hand.length !== 14 - melds.length * 3) {
        const eff = effectiveTiles(c, melds.length, remaining, available);
        return { shanten: base, discards: [], ...eff, waits: waits(c, melds.length, available) };
    }
    const discards = hand.filter(t => !allowedIds || allowedIds.includes(t.id)).map(tile => {
        c[tile.kind]--;
        const s = shanten(c, melds.length), eff = effectiveTiles(c, melds.length, remaining, available), w = waits(c, melds.length, available);
        c[tile.kind]++;
        return { tile, shanten: s, ...eff, waits: w };
    }).sort((a, b) => a.shanten - b.shanten || b.count - a.count);
    const best = discards[0];
    return { shanten: base, discards, kinds: best?.kinds ?? [], count: best?.count ?? 0, waits: best?.waits ?? [] };
}
