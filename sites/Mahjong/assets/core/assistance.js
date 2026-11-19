import { counts, kindsInUse, windOf } from './tiles.js';
import { waits, isClosed } from './hand.js';
import { publicTileCounts } from './engine.js';
import { indicators } from './wall.js';
import { evaluateWin } from './scoring.js';
/** Explicitly select known fields: no opponents' hands, live wall, ura indicators or wall seed. */
export function waitKnowledge(s, who) {
    const p = s.players[who];
    return { hand: p.hand, melds: p.melds, riverKinds: p.river.map(d => d.tile.kind), visible: publicTileCounts(s, who), doraIndicators: indicators(s.wall), rules: s.config.rules, players: s.config.players, seatWind: windOf(who, s.dealer, s.players.length), roundWind: (27 + Math.floor(s.round / s.players.length)), riichi: p.riichi, doubleRiichi: p.doubleRiichi, temporaryFuriten: p.temporaryFuriten, riichiFuriten: p.riichiFuriten, nuki: p.nuki.length };
}
export function waitReport(k, discardId, declaringRiichi = false) {
    const discard = k.hand.find(t => t.id === discardId), hand = discard ? k.hand.filter(t => t.id !== discard.id) : k.hand, c = counts(hand);
    const owned = counts([...hand, ...k.melds.flatMap(m => m.tiles)]);
    const kinds = waits(c, k.melds.length, kindsInUse(k.players, k.rules).filter(kind => owned[kind] < 4));
    const river = [...k.riverKinds, ...(discard ? [discard.kind] : [])], reasons = [];
    if (kinds.some(kind => river.includes(kind)))
        reasons.push('自分の河に待ち牌があります');
    if (k.riichiFuriten)
        reasons.push('リーチ後の見逃し');
    else if (k.temporaryFuriten)
        reasons.push('同巡の見逃し（次のツモまで）');
    const context = (kind, tsumo) => {
        const winning = { id: -1, kind, red: false };
        return { rules: k.rules, hand: [...hand, winning], melds: k.melds, winning, tsumo, seatWind: k.seatWind, roundWind: k.roundWind, riichi: k.riichi || declaringRiichi, doubleRiichi: k.doubleRiichi, ippatsu: false, rinshan: false, chankan: false, lastTile: false, heavenly: false, earthly: false, doraIndicators: k.doraIndicators, uraIndicators: [], nuki: k.nuki, players: k.players };
    };
    const evaluated = kinds.map(kind => ({ kind, ron: evaluateWin(context(kind, false)), tsumo: evaluateWin(context(kind, true)) }));
    // The engine's no-atozuke definition requires ordinary yaku on every possible wait.
    const sakizuke = k.rules.atozuke || isClosed(k.melds) || evaluated.every(e => e.ron !== null);
    const tiles = evaluated.map(e => ({ kind: e.kind, remaining: Math.max(0, 4 - k.visible[e.kind]), hasRonYaku: !!e.ron && sakizuke, hasTsumoYaku: !!e.tsumo && sakizuke, ron: !!e.ron && sakizuke && !reasons.length, tsumo: !!e.tsumo && sakizuke }));
    return { tiles, total: tiles.reduce((sum, t) => sum + t.remaining, 0), furiten: reasons.length > 0, furitenReasons: reasons, afterDiscard: !!discard, declaringRiichi };
}
