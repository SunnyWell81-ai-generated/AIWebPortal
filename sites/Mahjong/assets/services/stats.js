import { finalPoints, ranking } from '../core/round.js';
import { winPayments } from '../core/scoring.js';
export function addStats(stats, s) {
    const who = s.players.findIndex(p => p.config.human);
    if (who < 0 || s.phase !== 'matchEnd' || stats.entries.some(e => e.id === s.id))
        return stats;
    const p = s.players[who], levels = s.players.filter(p => !p.config.human).map(p => p.config.level).sort();
    const e = { id: s.id, date: new Date().toISOString(), names: s.players.map(p => p.config.name), players: s.config.players, format: s.config.format, levels, levelSignature: levels.join('/'), rank: ranking(s).indexOf(who) + 1, score: p.score, point: finalPoints(s)[who], hands: s.records.length, wins: 0, dealIns: 0, calls: 0, riichi: 0, winPoints: 0, lossPoints: 0, tsumo: 0, ron: 0, draws: 0, tenpai: 0, yaku: {}, yakuman: 0 };
    for (const rec of s.records) {
        const r = rec.result;
        if (rec.riichi.includes(who))
            e.riichi++;
        if (rec.calls.includes(who))
            e.calls++;
        if (r.winners.includes(who)) {
            e.wins++;
            e.winPoints += winPayments(r.evaluations[who] ?? { base: 2000 }, who, r.loser ?? null, rec.dealer, s.players.length, 0, s.config.rules)[who];
            if (r.loser === undefined)
                e.tsumo++;
            else
                e.ron++;
            const ev = r.evaluations[who];
            if (ev) {
                for (const y of ev.yaku)
                    e.yaku[y.id] = (e.yaku[y.id] ?? 0) + 1;
                e.yakuman += ev.yakuman > 0 || ev.han >= 13 && s.config.rules.kazoe !== 'sanbaiman' ? 1 : 0;
            }
            else
                e.yaku.nagashi = (e.yaku.nagashi ?? 0) + 1;
        }
        if (r.loser === who) {
            e.dealIns++;
            e.lossPoints -= r.winners.reduce((total, w) => total + winPayments(r.evaluations[w], w, who, rec.dealer, s.players.length, 0, s.config.rules)[who], 0);
        }
        if (!r.winners.length && !r.abortive) {
            e.draws++;
            if (r.tenpai.includes(who))
                e.tenpai++;
        }
    }
    return { version: 1, entries: [...stats.entries, e] };
}
export function aggregate(stats, filter = {}) {
    const entries = stats.entries.filter(e => (!filter.players || e.players === filter.players) && (!filter.format || e.format === filter.format) && (!filter.level || e.levels.includes(filter.level)) && (!filter.signature || e.levelSignature === filter.signature));
    const n = entries.length, sum = (k) => entries.reduce((a, e) => a + Number(e[k]), 0), hands = sum('hands'), wins = sum('wins'), losses = sum('dealIns');
    return { entries, n, hands, rankRates: [1, 2, 3, 4].map(r => n ? entries.filter(e => e.rank === r).length / n : 0), averageRank: n ? sum('rank') / n : 0, averageScore: n ? sum('score') / n : 0, max: n ? Math.max(...entries.map(e => e.score)) : 0, min: n ? Math.min(...entries.map(e => e.score)) : 0,
        winRate: hands ? wins / hands : 0, dealInRate: hands ? losses / hands : 0, callRate: hands ? sum('calls') / hands : 0, riichiRate: hands ? sum('riichi') / hands : 0, averageWin: wins ? sum('winPoints') / wins : 0, averageLoss: losses ? sum('lossPoints') / losses : 0, tsumoRate: wins ? sum('tsumo') / wins : 0, ronRate: wins ? sum('ron') / wins : 0, tenpaiRate: sum('draws') ? sum('tenpai') / sum('draws') : 0, yakuman: sum('yakuman'), yaku: entries.reduce((a, e) => { for (const [k, v] of Object.entries(e.yaku))
            a[k] = (a[k] ?? 0) + v; return a; }, {}) };
}
