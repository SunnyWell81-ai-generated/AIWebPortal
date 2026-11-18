import { counts, nextDora, windOf } from './tiles.js';
import { shapes } from './hand.js';
import { indicators } from './wall.js';
import { evaluateShape } from './yaku.js';
export const round100 = (n) => Math.ceil(n / 100) * 100;
export function basePoints(han, fu, yakuman, r) {
    if (yakuman)
        return { base: 8000 * yakuman, limit: yakuman === 1 ? '役満' : `${yakuman}倍役満` };
    if (han >= 13 && r.kazoe !== 'sanbaiman')
        return { base: 8000 * (r.kazoe === 'multiple' ? Math.floor(han / 13) : 1), limit: '数え役満' };
    if (han >= 11)
        return { base: 6000, limit: '三倍満' };
    if (han >= 8)
        return { base: 4000, limit: '倍満' };
    if (han >= 6)
        return { base: 3000, limit: '跳満' };
    const raw = fu * 2 ** (han + 2);
    if (han >= 5 || raw >= 2000 || (r.kiriage && raw === 1920))
        return { base: 2000, limit: '満貫' };
    return { base: raw, limit: '' };
}
function assignments(shape, ctx) {
    if (shape.type !== 'standard')
        return [-2];
    const out = [];
    if (shape.pair === ctx.winning.kind)
        out.push(-1);
    shape.groups.forEach((g, i) => { if (i >= 4 - ctx.melds.length)
        return; if (g.type === 'triplet' && g.kind === ctx.winning.kind || g.type === 'sequence' && ctx.winning.kind >= g.kind && ctx.winning.kind <= g.kind + 2)
        out.push(i); });
    return out;
}
export function evaluateWin(ctx) {
    const all = [...ctx.hand, ...ctx.melds.flatMap(m => m.tiles)], c = counts(all), r = ctx.rules;
    let best = null;
    for (const shape of shapes(counts(ctx.hand), ctx.melds))
        for (const at of assignments(shape, ctx)) {
            const result = evaluateShape(shape, ctx, at);
            if (!result.yaku.length)
                continue;
            let yakuman = result.yaku.reduce((a, y) => a + y.yakuman, 0);
            if (!r.compoundYakuman)
                yakuman = Math.max(...result.yaku.map(y => y.yakuman));
            const dora = yakuman ? 0 : ctx.doraIndicators.reduce((a, t) => a + c[nextDora(t.kind, ctx.players, r)], 0);
            const ura = yakuman || !ctx.riichi || !r.ura ? 0 : ctx.uraIndicators.slice(0, r.kanUra ? undefined : 1).reduce((a, t) => a + c[nextDora(t.kind, ctx.players, r)], 0);
            const red = yakuman ? 0 : all.filter(t => t.red).length;
            // 抜き北は北が表示ドラのときにも1枚として加算する。
            const nuki = yakuman ? 0 : ctx.nuki * ((r.nukiDora ? 1 : 0) + ctx.doraIndicators.filter(t => nextDora(t.kind, ctx.players, r) === 30).length + (ctx.riichi && r.ura ? ctx.uraIndicators.slice(0, r.kanUra ? undefined : 1).filter(t => nextDora(t.kind, ctx.players, r) === 30).length : 0));
            const han = result.yaku.reduce((a, y) => a + y.han, 0) + dora + ura + red + nuki;
            const bp = basePoints(han, result.fu, yakuman, r), e = { ...result, han, yakuman, ...bp, dora, ura, red, nuki };
            const value = round100(e.base * (ctx.seatWind === 27 ? 6 : 4));
            const old = best ? round100(best.base * (ctx.seatWind === 27 ? 6 : 4)) : -1;
            if (value > old || value === old && (e.han > (best?.han ?? 0) || e.han === best?.han && e.fu > (best?.fu ?? 0)))
                best = e;
        }
    return best;
}
export function contextFor(s, who, tile, tsumo) {
    const p = s.players[who], re = s.reaction, initial = p.turns === 0 && !s.interrupted;
    return { rules: s.config.rules, hand: tsumo ? [...p.hand] : [...p.hand, tile], melds: p.melds, winning: tile, tsumo,
        seatWind: windOf(who, s.dealer, s.players.length), roundWind: (27 + Math.floor(s.round / s.players.length)),
        riichi: p.riichi, doubleRiichi: p.doubleRiichi, ippatsu: p.ippatsu,
        rinshan: tsumo && (s.lastDraw === 'rinshan' || s.lastDraw === 'nuki' && s.config.rules.nukiRinshan),
        chankan: !tsumo && !!re && ['kakan', 'ankan'].includes(re.kind), lastTile: s.wall.live.length === 0 && s.lastDraw !== 'rinshan' && (!re || re.kind === 'discard'),
        heavenly: tsumo && initial && who === s.dealer, earthly: tsumo && initial && who !== s.dealer,
        renhou: !tsumo && initial && who !== s.dealer, tsubame: !tsumo && !!re?.pendingRiichi, kanburi: !tsumo && s.lastDraw === 'rinshan',
        doraIndicators: indicators(s.wall), uraIndicators: indicators(s.wall, true), nuki: p.nuki.length, players: s.config.players };
}
export function winPayments(e, winner, loser, dealer, n, honba, r) {
    const delta = Array(n).fill(0), parent = winner === dealer;
    if (loser !== null) {
        const v = round100(e.base * (parent ? 6 : 4)) + honba * r.honbaRon;
        delta[loser] -= v;
        delta[winner] += v;
    }
    else
        for (let i = 0; i < n; i++)
            if (i !== winner) {
                let coefficient = parent ? 2 : i === dealer ? 2 : 1;
                if (n === 3 && !r.tsumoLoss)
                    coefficient = parent ? 3 : i === dealer ? 2.5 : 1.5;
                const v = round100(e.base * coefficient) + honba * r.honbaTsumo;
                delta[i] -= v;
                delta[winner] += v;
            }
    return delta;
}
export function notenPayments(tenpai, n, pool) {
    if (!tenpai.length || tenpai.length === n)
        return Array(n).fill(0);
    return Array.from({ length: n }, (_, i) => tenpai.includes(i) ? pool / tenpai.length : -pool / (n - tenpai.length));
}
