import { counts, isOutside, isTerminal } from './tiles.js';
import { isClosed } from './hand.js';
export const YAKU_CATALOG = [
    ['riichi', '立直', 1, 0, '門前・テンパイで千点を供託し宣言'], ['doubleRiichi', 'ダブル立直', 2, 0, '鳴きのない第一打で立直'], ['ippatsu', '一発', 1, 0, 'リーチ後、鳴きの入らない一巡以内'], ['menzenTsumo', '門前清自摸和', 1, 0, '門前のツモ和了'], ['tanyao', '断么九', 1, 1, '2〜8の数牌だけで構成'], ['pinfu', '平和', 1, 0, '4順子・役牌でない雀頭・両面待ち'], ['iipeikou', '一盃口', 1, 0, '同一順子を2組'], ['yakuhai', '役牌', 1, 1, '自風・場風・三元牌の刻子（連風は2翻）'], ['rinshan', '嶺上開花', 1, 1, '槓の嶺上牌でツモ和了'], ['chankan', '槍槓', 1, 1, '加槓牌でロン。暗槓は国士のみ'], ['haitei', '海底摸月', 1, 1, '最後の生牌でツモ和了'], ['houtei', '河底撈魚', 1, 1, '最後の生牌直後の捨て牌でロン'], ['chiitoi', '七対子', 2, 0, '異なる7組の対子・25符固定'], ['toitoi', '対々和', 2, 2, '4刻子・槓子'], ['sanankou', '三暗刻', 2, 2, '暗刻・暗槓を3組。ロン刻子は含めない'], ['sanshokuDoukou', '三色同刻', 2, 2, '3色で同じ数字の刻子・槓子'], ['sanshoku', '三色同順', 2, 1, '3色で同じ順子'], ['ittsu', '一気通貫', 2, 1, '同色の123・456・789'], ['chanta', '混全帯么九', 2, 1, '全組に么九牌・字牌を含む。順子あり'], ['junchan', '純全帯么九', 3, 2, '全組に老頭牌を含み字牌なし。順子あり'], ['honroutou', '混老頭', 2, 2, '老頭牌・字牌だけ'], ['shousangen', '小三元', 2, 2, '三元牌の2刻子と雀頭（役牌と複合）'], ['sankantsu', '三槓子', 2, 2, '3槓子'], ['ryanpeikou', '二盃口', 3, 0, '同一順子2組の組み合わせを2つ'], ['honitsu', '混一色', 3, 2, '1種類の数牌と字牌'], ['chinitsu', '清一色', 6, 5, '1種類の数牌だけ'],
].map(([id, name, closedHan, openHan, description]) => ({ id: String(id), name: String(name), closedHan: Number(closedHan), openHan: Number(openHan), description: String(description) }));
for (const [id, name, description] of [
    ['kokushi', '国士無双', '么九牌13種とそのうち1種の対子。十三面は設定倍率'], ['suuankou', '四暗刻', '4暗刻・暗槓。ロンは単騎待ちのみ'], ['daisangen', '大三元', '三元牌3刻子・槓子'], ['shousuushii', '小四喜', '風牌3刻子と雀頭'], ['daisuushii', '大四喜', '風牌4刻子・槓子'], ['tsuuiisou', '字一色', '字牌だけ'], ['ryuuiisou', '緑一色', '索子23468と發だけ'], ['chinroutou', '清老頭', '老頭牌だけ'], ['chuuren', '九蓮宝燈', '門前同色1112345678999＋1枚。純正は設定倍率'], ['suukantsu', '四槓子', '4槓子'], ['tenhou', '天和', '親の配牌の第一ツモ和了'], ['chiihou', '地和', '鳴きのない子の第一ツモ和了']
])
    YAKU_CATALOG.push({ id, name, description, closedHan: 0, openHan: 0, yakuman: true });
export function evaluateShape(shape, ctx, winningGroup) {
    const yaku = [], fuItems = [], r = ctx.rules, closed = isClosed(ctx.melds);
    const add = (id, name, han) => yaku.push({ id, name, han, yakuman: 0 });
    const ym = (id, name, m = 1) => yaku.push({ id, name, han: 0, yakuman: r.doubleYakuman ? m : 1 });
    const all = [...ctx.hand, ...ctx.melds.flatMap(m => m.tiles)], c = counts(all), pre = counts(ctx.hand);
    pre[ctx.winning.kind]--;
    const kinds = c.map((n, k) => n ? k : -1).filter(k => k >= 0), hasHonor = kinds.some(k => k >= 27), suits = new Set(kinds.filter(k => k < 27).map(k => Math.floor(k / 9)));
    const groups = shape.groups.map((g, i) => ({ ...g, ronOpen: !ctx.tsumo && i === winningGroup && g.type === 'triplet' }));
    const seq = groups.filter(g => g.type === 'sequence'), trip = groups.filter(g => g.type !== 'sequence');
    const concealed = trip.filter(g => !g.open && !g.ronOpen).length, kans = groups.filter(g => g.type === 'quad').length;
    const multiplier = (n) => r.doubleYakuman ? n : 1;
    const pairValue = (p) => p >= 31 ? 2 : p === ctx.seatWind && p === ctx.roundWind ? r.doubleWindFu : (p === ctx.seatWind || p === ctx.roundWind) ? 2 : 0;
    let waitFu = 0;
    if (shape.type === 'standard') {
        if (winningGroup === -1)
            waitFu = 2;
        else {
            const g = groups[winningGroup];
            if (g.type === 'sequence') {
                const pos = ctx.winning.kind - g.kind;
                if (pos === 1 || (g.kind % 9 === 0 && pos === 2) || (g.kind % 9 === 6 && pos === 0))
                    waitFu = 2;
            }
        }
    }
    const pinfu = shape.type === 'standard' && closed && seq.length === 4 && !pairValue(shape.pair) && !waitFu;
    if (ctx.heavenly)
        ym('tenhou', '天和');
    if (ctx.earthly)
        ym('chiihou', '地和');
    if (shape.type === 'kokushi')
        ym('kokushi', pre.filter(Boolean).length === 13 ? '国士無双十三面待ち' : '国士無双', pre.filter(Boolean).length === 13 ? multiplier(r.kokushi13) : 1);
    if (concealed === 4)
        ym('suuankou', winningGroup === -1 ? '四暗刻単騎' : '四暗刻', winningGroup === -1 ? multiplier(r.suuankouTanki) : 1);
    if ([31, 32, 33].every(k => trip.some(g => g.kind === k)))
        ym('daisangen', '大三元');
    const winds = trip.filter(g => g.kind >= 27 && g.kind <= 30).length;
    if (winds === 4)
        ym('daisuushii', '大四喜', multiplier(r.daisuushii));
    else if (winds === 3 && shape.pair >= 27 && shape.pair <= 30)
        ym('shousuushii', '小四喜');
    if (kinds.every(k => k >= 27))
        ym('tsuuiisou', '字一色');
    if (kinds.every(k => [19, 20, 21, 23, 25, 32].includes(k)))
        ym('ryuuiisou', '緑一色');
    if (kinds.every(isTerminal))
        ym('chinroutou', '清老頭');
    if (kans === 4)
        ym('suukantsu', '四槓子');
    if (!ctx.melds.length && suits.size === 1 && !hasHonor) {
        const offset = [...suits][0] * 9, base = [3, 1, 1, 1, 1, 1, 1, 1, 3];
        if (base.every((n, i) => c[offset + i] >= n)) {
            const pure = base.every((n, i) => pre[offset + i] === n);
            ym('chuuren', pure ? '純正九蓮宝燈' : '九蓮宝燈', pure ? multiplier(r.pureChuuren) : 1);
        }
    }
    for (const [id, suit, name] of [['daisharin', 1, '大車輪'], ['daichikurin', 2, '大竹林'], ['daichinrin', 0, '大数隣']]) {
        if (r.local[id] && closed && kinds.length === 7 && kinds.every(k => Math.floor(k / 9) === suit && k % 9 >= 1 && k % 9 <= 7 && c[k] === 2))
            ym(id, name);
    }
    if (r.local.suurenkou && [0, 9, 18].some(off => Array.from({ length: 6 }, (_, i) => i).some(i => [0, 1, 2, 3].every(d => trip.some(g => g.kind === off + i + d)))))
        ym('suurenkou', '四連刻');
    if (yaku.some(y => y.yakuman))
        return { yaku, fu: 0, fuItems: [] };
    if (ctx.doubleRiichi)
        add('doubleRiichi', 'ダブル立直', 2);
    else if (ctx.riichi)
        add('riichi', '立直', 1);
    if (ctx.ippatsu && ctx.riichi && r.ippatsu)
        add('ippatsu', '一発', 1);
    if (closed && ctx.tsumo)
        add('menzenTsumo', '門前清自摸和', 1);
    if (kinds.every(k => !isOutside(k)) && (closed || r.openTanyao))
        add('tanyao', '断么九', 1);
    if (pinfu)
        add('pinfu', '平和', 1);
    for (const g of trip) {
        if (g.kind >= 31)
            add('yakuhai', `役牌 ${['白', '發', '中'][g.kind - 31]}`, 1);
        if (g.kind === ctx.seatWind)
            add('yakuhai', '自風', 1);
        if (g.kind === ctx.roundWind)
            add('yakuhai', '場風', 1);
    }
    if (ctx.rinshan)
        add('rinshan', '嶺上開花', 1);
    if (ctx.chankan)
        add('chankan', '槍槓', 1);
    if (ctx.lastTile && !ctx.rinshan && !ctx.chankan)
        add(ctx.tsumo ? 'haitei' : 'houtei', ctx.tsumo ? '海底摸月' : '河底撈魚', 1);
    if (shape.type === 'chiitoi')
        add('chiitoi', '七対子', 2);
    if (trip.length === 4)
        add('toitoi', '対々和', 2);
    if (concealed === 3)
        add('sanankou', '三暗刻', 2);
    if (kans === 3)
        add('sankantsu', '三槓子', 2);
    if (Array.from({ length: 9 }, (_, i) => i).some(k => [0, 9, 18].every(o => trip.some(g => g.kind === o + k))))
        add('sanshokuDoukou', '三色同刻', 2);
    if (Array.from({ length: 7 }, (_, i) => i).some(k => [0, 9, 18].every(o => seq.some(g => g.kind === o + k))))
        add('sanshoku', '三色同順', closed ? 2 : 1);
    if ([0, 9, 18].some(o => [0, 3, 6].every(k => seq.some(g => g.kind === o + k))))
        add('ittsu', '一気通貫', closed ? 2 : 1);
    let tripleSeq = false;
    if (r.local.isshokusanjun && seq.some(g => seq.filter(h => h.kind === g.kind).length >= 3)) {
        add('isshokusanjun', '一色三順', closed ? 3 : 2);
        tripleSeq = true;
    }
    if (closed && !tripleSeq) {
        const map = new Map();
        seq.forEach(g => map.set(g.kind, (map.get(g.kind) ?? 0) + 1));
        const p = [...map.values()].reduce((a, n) => a + Math.floor(n / 2), 0);
        if (p >= 2)
            add('ryanpeikou', '二盃口', 3);
        else if (p === 1)
            add('iipeikou', '一盃口', 1);
    }
    if (shape.type === 'standard' && seq.length && isOutside(shape.pair) && groups.every(g => g.type === 'sequence' ? g.kind % 9 === 0 || g.kind % 9 === 6 : isOutside(g.kind)))
        add(hasHonor ? 'chanta' : 'junchan', hasHonor ? '混全帯么九' : '純全帯么九', hasHonor ? (closed ? 2 : 1) : (closed ? 3 : 2));
    if (kinds.every(isOutside))
        add('honroutou', '混老頭', 2);
    if (trip.filter(g => g.kind >= 31).length === 2 && shape.pair >= 31)
        add('shousangen', '小三元', 2);
    if (suits.size === 1)
        add(hasHonor ? 'honitsu' : 'chinitsu', hasHonor ? '混一色' : '清一色', hasHonor ? (closed ? 3 : 2) : (closed ? 6 : 5));
    if (r.local.renhou && ctx.renhou)
        add('renhou', '人和', 5);
    if (r.local.tsubame && ctx.tsubame)
        add('tsubame', '燕返し', 1);
    if (r.local.kanburi && ctx.kanburi)
        add('kanburi', '槓振り', 1);
    if (r.local.sanrenkou && [0, 9, 18].some(o => Array.from({ length: 7 }, (_, i) => i).some(k => [0, 1, 2].every(d => trip.some(g => g.kind === o + k + d)))))
        add('sanrenkou', '三連刻', 2);
    if (r.local.uumensai && suits.size === 3 && kinds.some(k => k >= 27 && k <= 30) && kinds.some(k => k >= 31))
        add('uumensai', '五門斉', 2);
    if (shape.type === 'chiitoi')
        return { yaku, fu: 25, fuItems: [{ name: '七対子固定', fu: 25 }] };
    fuItems.push({ name: '基本符', fu: 20 });
    if (!ctx.tsumo && closed)
        fuItems.push({ name: '門前ロン', fu: 10 });
    if (ctx.tsumo && !pinfu)
        fuItems.push({ name: 'ツモ', fu: 2 });
    if (pairValue(shape.pair))
        fuItems.push({ name: '役牌雀頭', fu: pairValue(shape.pair) });
    if (waitFu)
        fuItems.push({ name: winningGroup === -1 ? '単騎待ち' : '嵌張・辺張待ち', fu: waitFu });
    for (const g of trip) {
        const open = g.open || g.ronOpen;
        const f = (g.type === 'quad' ? 8 : 2) * (open ? 1 : 2) * (isOutside(g.kind) ? 2 : 1);
        fuItems.push({ name: `${open ? '明' : '暗'}${g.type === 'quad' ? '槓' : '刻'} ${isOutside(g.kind) ? '么九' : '中張'}`, fu: f });
    }
    let fu = fuItems.reduce((a, b) => a + b.fu, 0);
    if (!closed && fu === 20) {
        fuItems.push({ name: '喰い平和形の最低符', fu: 10 });
        fu = 30;
    }
    return { yaku, fu: Math.ceil(fu / 10) * 10, fuItems };
}
