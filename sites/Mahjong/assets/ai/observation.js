import { legalActions, publicTileCounts } from '../core/engine.js';
import { indicators } from '../core/wall.js';
import { kindsInUse, windOf } from '../core/tiles.js';
export function observe(s, who) {
    const p = s.players[who];
    return structuredClone({ player: who, hand: p.hand, melds: p.melds, nuki: p.nuki, riichi: p.riichi, drawnId: p.drawnId,
        opponents: s.players.filter(q => q.seat !== who).map(q => ({ seat: q.seat, score: q.score, riichi: q.riichi, river: q.river, melds: q.melds, nuki: q.nuki, handCount: q.hand.length, wind: windOf(q.seat, s.dealer, s.players.length) })),
        ownRiver: p.river, visible: publicTileCounts(s, who), available: kindsInUse(s.config.players, s.config.rules), doraIndicators: indicators(s.wall),
        roundWind: 27 + Math.floor(s.round / s.players.length), seatWind: windOf(who, s.dealer, s.players.length), remaining: s.wall.live.length, honba: s.honba, round: s.round,
        scores: s.players.map(q => q.score), rules: s.config.rules, choices: legalActions(s, who), level: p.config.level, personality: p.config.personality, seed: p.hand.reduce((hash, t) => Math.imul(hash ^ t.id, 16777619) >>> 0, (s.actionNumber * 997 + who * 17 + 2166136261) >>> 0) });
}
