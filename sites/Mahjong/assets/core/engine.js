import { counts, isOutside, kindsInUse, sortTiles } from './tiles.js';
import { createWall, drawLive, drawRinshan } from './wall.js';
import { isClosed, shapes, waits } from './hand.js';
import { contextFor, evaluateWin, notenPayments, winPayments } from './scoring.js';
import { recordResult } from './round.js';
import { validateConfig } from './rules.js';
export class IllegalActionError extends Error {
}
const next = (s, i) => (i + 1) % s.players.length;
const eqKinds = (a, b) => a.length === b.length && [...a].sort((x, y) => x - y).every((k, i) => k === [...b].sort((x, y) => x - y)[i]);
function freshPlayer(seat, c, score) {
    return { seat, config: structuredClone(c.seats[seat]), score: score ?? c.rules.startPoints, hand: [], melds: [], river: [], nuki: [], riichi: false, doubleRiichi: false, ippatsu: false, riichiFuriten: false, temporaryFuriten: false, drawnId: null, turns: 0, called: false, riichiWaits: [] };
}
export function newGame(config) {
    validateConfig(config);
    const c = structuredClone(config);
    if (!c.seed)
        c.seed = crypto.getRandomValues(new Uint32Array(1))[0] || 1;
    const s = { version: 1, id: crypto.randomUUID(), config: c, players: c.seats.map((_, i) => freshPlayer(i, c)), wall: createWall(c.players, c.rules, c.seed), round: 0, dealer: 0, initialDealer: 0, honba: 0, deposits: 0, current: 0, phase: 'discard', reaction: null, forbidden: [], interrupted: false, firstCycle: true, lastDraw: 'live', kanCount: 0, kanOwners: [], delayedKanDora: false, result: null, records: [], actionNumber: 0, seed: c.seed, message: '東一局', startedAt: new Date().toISOString() };
    deal(s);
    return s;
}
function deal(s) {
    for (let i = 0; i < 13; i++)
        for (let j = 0; j < s.players.length; j++)
            s.players[(s.dealer + j) % s.players.length].hand.push(drawLive(s.wall));
    s.players.forEach(p => p.hand = sortTiles(p.hand));
    s.current = s.dealer;
    draw(s, s.dealer, 'live');
}
function draw(s, who, mode) {
    const p = s.players[who], t = mode === 'rinshan' ? drawRinshan(s.wall) : drawLive(s.wall);
    p.hand.push(t);
    p.drawnId = t.id;
    p.temporaryFuriten = false;
    s.current = who;
    s.phase = 'discard';
    s.reaction = null;
    s.lastDraw = mode;
    s.forbidden = [];
    s.message = `${p.config.name}の手番`;
}
export function advanceRound(state) {
    if (state.phase !== 'handEnd' || !state.result)
        throw new IllegalActionError('局を進められません');
    const s = structuredClone(state), r = s.result;
    if (!r.dealerRepeat) {
        s.round++;
        s.dealer = next(s, s.dealer);
    }
    s.honba = r.winners.length && !r.dealerRepeat ? 0 : s.honba + 1;
    s.seed = (s.seed + 0x9e3779b9) >>> 0;
    s.wall = createWall(s.config.players, s.config.rules, s.seed);
    s.players = s.players.map(p => freshPlayer(p.seat, s.config, p.score));
    s.reaction = null;
    s.result = null;
    s.interrupted = false;
    s.firstCycle = true;
    s.kanCount = 0;
    s.kanOwners = [];
    s.delayedKanDora = false;
    s.phase = 'discard';
    s.actionNumber++;
    deal(s);
    return s;
}
function sameAction(a, b) { return a.type === b.type && a.player === b.player && eqKinds(a.tiles ?? [], b.tiles ?? []); }
function take(p, ids) {
    const out = ids.map(id => { const t = p.hand.find(t => t.id === id); if (!t)
        throw new IllegalActionError('手牌にない牌です'); return t; });
    p.hand = p.hand.filter(t => !ids.includes(t.id));
    return out;
}
function combinations(tiles, n) {
    if (!n)
        return [[]];
    return tiles.flatMap((t, i) => combinations(tiles.slice(i + 1), n - 1).map(rest => [t, ...rest]));
}
export function playerWaits(s, who) { const p = s.players[who]; return waits(counts(p.hand), p.melds.length, kindsInUse(s.config.players, s.config.rules)); }
export function isFuriten(s, who) {
    const p = s.players[who];
    if (p.temporaryFuriten || p.riichiFuriten)
        return true;
    const w = playerWaits(s, who);
    return p.river.some(d => w.includes(d.tile.kind));
}
function ronEvaluation(s, who) {
    const re = s.reaction;
    if (!re || who === re.source || isFuriten(s, who))
        return null;
    const e = evaluateWin(contextFor(s, who, re.tile, false));
    if (!e)
        return null;
    if ((re.kind === 'ankan' || re.kind === 'nuki') && !e.yaku.some(y => y.id === 'kokushi'))
        return null;
    // 後付けなし: 和了牌以外で役が確定していることを要求（門前は制限しない）。
    if (!s.config.rules.atozuke && !isClosed(s.players[who].melds) && !hasSakizuke(s, who, e, re.tile))
        return null;
    return e;
}
function hasSakizuke(s, who, _evaluation, tile) {
    const p = s.players[who], concealed = p.hand.some(t => t.id === tile.id) ? p.hand.filter(t => t.id !== tile.id) : p.hand;
    const w = waits(counts(concealed), p.melds.length, kindsInUse(s.config.players, s.config.rules));
    const conditional = new Set(['rinshan', 'chankan', 'haitei', 'houtei', 'renhou', 'tsubame', 'kanburi']);
    // 採用定義: 全ての待ちで偶発役以外の役があること。片アガリを禁止する。
    return w.length > 0 && w.every(kind => {
        const candidate = { id: -1, kind, red: false };
        const context = { ...contextFor(s, who, candidate, false), hand: [...concealed, candidate] };
        const e = evaluateWin(context);
        return e !== null && e.yaku.some(y => !conditional.has(y.id));
    });
}
function canRiichiKan(s, p, k) {
    if (!p.riichi)
        return true;
    const drawn = p.hand.find(t => t.id === p.drawnId);
    if (drawn?.kind !== k)
        return false;
    const c = counts(p.hand);
    c[k] -= 4;
    if (!eqKinds(waits(c, p.melds.length + 1, kindsInUse(s.config.players, s.config.rules)), p.riichiWaits))
        return false;
    if (s.config.rules.riichiKan === 'wait')
        return true;
    const before = counts(p.hand);
    before[k]--;
    return p.riichiWaits.every(w => { before[w]++; const patterns = shapes(before, p.melds); before[w]--; return patterns.length > 0 && patterns.every(sh => sh.type === 'standard' && sh.groups.slice(0, 4 - p.melds.length).some(g => g.type === 'triplet' && g.kind === k)); });
}
export function legalActions(s, who) {
    const p = s.players[who];
    if (!p)
        return [];
    const out = [], add = (type, label, tiles) => out.push({ action: { type, player: who, ...(tiles ? { tiles: tiles.map(t => t.id) } : {}) }, label, tileKinds: tiles?.map(t => t.kind) });
    if (s.phase === 'reactions') {
        const re = s.reaction;
        if (who === re.source || re.responses[who])
            return out;
        if (ronEvaluation(s, who))
            add('ron', 'ロン');
        if (re.kind === 'discard' && !p.riichi && s.wall.live.length > 0 && !(s.kanCount === 4 && new Set(s.kanOwners).size > 1)) {
            const same = p.hand.filter(t => t.kind === re.tile.kind);
            for (const ts of combinations(same, 2)) {
                const after = p.hand.filter(t => !ts.some(x => x.id === t.id));
                if (after.some(t => !s.config.rules.kuikae || t.kind !== re.tile.kind))
                    add('pon', 'ポン', ts);
            }
            if (same.length === 3 && s.wall.rinshanUsed < 4)
                for (const ts of combinations(same, 3))
                    add('daiminkan', '大明槓', ts);
            if (who === next(s, re.source) && (s.players.length === 4 || s.config.rules.sanmaChi) && re.tile.kind < 27) {
                const k = re.tile.kind, suit = Math.floor(k / 9);
                for (let start = k - 2; start <= k; start++) {
                    if (start < 0 || start % 9 > 6 || Math.floor(start / 9) !== suit || Math.floor((start + 2) / 9) !== suit)
                        continue;
                    const needed = [start, start + 1, start + 2].filter(x => x !== k);
                    for (const a of p.hand.filter(t => t.kind === needed[0]))
                        for (const b of p.hand.filter(t => t.kind === needed[1])) {
                            const forbid = chiForbidden([start, start + 1, start + 2], k), after = p.hand.filter(t => t.id !== a.id && t.id !== b.id);
                            if (after.some(t => !s.config.rules.kuikae || !forbid.includes(t.kind)))
                                add('chi', 'チー', [a, b]);
                        }
                }
            }
        }
        add('pass', '見送り');
        return out;
    }
    if (s.phase !== 'discard' || s.current !== who)
        return out;
    const drawn = p.hand.find(t => t.id === p.drawnId);
    if (drawn) {
        const e = evaluateWin(contextFor(s, who, drawn, true));
        if (e && (s.config.rules.atozuke || isClosed(p.melds) || hasSakizuke(s, who, e, drawn)))
            add('tsumo', 'ツモ');
    }
    for (const t of p.hand) {
        if (s.forbidden.includes(t.kind) || p.riichi && t.id !== p.drawnId)
            continue;
        add('discard', '打牌', [t]);
        if (!p.riichi && isClosed(p.melds) && p.score >= 1000 && s.wall.live.length >= 4 && drawn) {
            const c = counts(p.hand);
            c[t.kind]--;
            if (waits(c, p.melds.length, kindsInUse(s.config.players, s.config.rules)).length)
                add('riichi', 'リーチ', [t]);
        }
    }
    if (drawn && s.wall.live.length && s.wall.rinshanUsed < 4) {
        const c = counts(p.hand);
        for (let k = 0; k < 34; k++)
            if (c[k] === 4 && canRiichiKan(s, p, k))
                add('ankan', '暗槓', p.hand.filter(t => t.kind === k));
        if (!p.riichi)
            for (const m of p.melds.filter(m => m.type === 'pon'))
                for (const t of p.hand.filter(t => t.kind === m.tiles[0].kind))
                    add('kakan', '加槓', [t]);
    }
    if (s.config.players === 3 && s.config.rules.nuki && drawn && s.wall.live.length)
        for (const t of p.hand.filter(t => t.kind === 30 && (!p.riichi || t.id === p.drawnId)))
            add('nuki', '北抜き', [t]);
    if (drawn && !p.turns && !s.interrupted && s.config.rules.nineTerminals && new Set(p.hand.filter(t => isOutside(t.kind)).map(t => t.kind)).size >= 9)
        add('nine', '九種九牌');
    return out;
}
function chiForbidden(kinds, called) {
    const min = Math.min(...kinds), max = Math.max(...kinds), out = [called];
    if (called === min && max % 9 < 8)
        out.push(max + 1);
    if (called === max && min % 9 > 0)
        out.push(min - 1);
    return out;
}
function breakIppatsu(s) { s.players.forEach(p => p.ippatsu = false); s.interrupted = true; s.firstCycle = false; }
function endDraw(s, reason, abortive = false) {
    const n = s.players.length, r = s.config.rules, tenpai = s.players.filter(p => playerWaits(s, p.seat).length > 0).map(p => p.seat), delta = Array(n).fill(0);
    const nagashi = !abortive && r.nagashi ? s.players.filter(p => p.river.length && p.river.every(d => isOutside(d.tile.kind) && !d.called) && !p.melds.some(m => m.type !== 'ankan')).map(p => p.seat) : [];
    if (nagashi.length) {
        for (const w of nagashi) {
            const e = { base: 2000 };
            const d = winPayments(e, w, null, s.dealer, n, s.honba, r);
            d.forEach((v, i) => delta[i] += v);
        }
        if (s.deposits) {
            delta[nagashi[0]] += s.deposits * 1000;
            s.deposits = 0;
        }
    }
    else if (!abortive)
        notenPayments(tenpai, n, r.notenPool).forEach((v, i) => delta[i] = v);
    const repeat = abortive || (nagashi.length ? nagashi.includes(s.dealer) : tenpai.includes(s.dealer) ? r.tenpaiRepeat : r.notenRepeat);
    recordResult(s, { reason: nagashi.length ? '流し満貫' : reason, winners: nagashi, evaluations: {}, delta, tenpai, dealerRepeat: repeat, abortive });
}
function endWins(s, winners, loser, evals) {
    const delta = Array(s.players.length).fill(0), r = s.config.rules;
    for (const w of winners)
        winPayments(evals[w], w, loser, s.dealer, s.players.length, s.honba, r).forEach((v, i) => delta[i] += v);
    if (r.deposits === 'nearest')
        delta[winners[0]] += s.deposits * 1000;
    else {
        const count = Math.floor(s.deposits / winners.length), extra = s.deposits % winners.length;
        winners.forEach((w, i) => delta[w] += (count + (i < extra ? 1 : 0)) * 1000);
    }
    s.deposits = 0;
    recordResult(s, { reason: loser === null ? 'ツモ和了' : 'ロン和了', winners, loser: loser ?? undefined, winningTile: loser === null ? s.players[winners[0]].hand.find(t => t.id === s.players[winners[0]].drawnId) : s.reaction?.tile, evaluations: evals, delta, tenpai: [], dealerRepeat: winners.includes(s.dealer), abortive: false });
}
function openReaction(s, re) {
    s.phase = 'reactions';
    s.reaction = re;
    // 応答が見送りだけの席はエンジン側で自動応答する。
    for (const p of s.players) {
        if (p.seat === re.source)
            continue;
        const choices = legalActions(s, p.seat);
        if (choices.length === 1 && choices[0].action.type === 'pass')
            re.responses[p.seat] = { type: 'pass', player: p.seat };
    }
    resolveReactions(s);
}
function establishRiichi(s, re) {
    if (!re.pendingRiichi)
        return;
    const p = s.players[re.source];
    p.riichi = true;
    p.doubleRiichi = p.turns === 1 && !s.interrupted;
    p.ippatsu = s.config.rules.ippatsu;
    p.score -= 1000;
    s.deposits++;
    p.riichiWaits = playerWaits(s, p.seat);
}
function finishKan(s, re) {
    const p = s.players[re.source], ids = re.kanTiles;
    if (re.kind === 'nuki') {
        const t = take(p, ids)[0];
        p.nuki.push(t);
        breakIppatsu(s);
        draw(s, p.seat, 'nuki');
        return;
    }
    if (re.kind === 'ankan') {
        const ts = take(p, ids);
        p.melds.push({ type: 'ankan', tiles: ts, from: p.seat });
    }
    else {
        const ts = take(p, ids), m = p.melds.find(m => m.type === 'pon' && m.tiles[0].kind === re.tile.kind);
        m.type = 'kakan';
        m.tiles.push(...ts);
    }
    s.kanCount++;
    s.kanOwners.push(p.seat);
    breakIppatsu(s);
    if (s.config.rules.kanDora && s.wall.doraCount < 5)
        s.wall.doraCount++;
    draw(s, p.seat, 'rinshan');
}
function resolveReactions(s) {
    const re = s.reaction;
    if (!re || Object.keys(re.responses).length < s.players.length - 1)
        return;
    const order = Array.from({ length: s.players.length - 1 }, (_, i) => (re.source + i + 1) % s.players.length);
    let winners = order.filter(i => re.responses[i].type === 'ron');
    if (winners.length) {
        if (winners.length === 3 && s.config.rules.tripleRonDraw) {
            endDraw(s, '三家和', true);
            return;
        }
        if (s.config.rules.ronMode === 'head')
            winners = winners.slice(0, 1);
        else if (s.config.rules.ronMode === 'double')
            winners = winners.slice(0, 2);
        const evals = {};
        for (const w of winners)
            evals[w] = evaluateWin(contextFor(s, w, re.tile, false));
        endWins(s, winners, re.source, evals);
        return;
    }
    if (re.kind !== 'discard') {
        finishKan(s, re);
        return;
    }
    establishRiichi(s, re);
    if (s.config.rules.fourKans && s.kanCount === 4 && new Set(s.kanOwners).size > 1) {
        endDraw(s, '四開槓', true);
        return;
    }
    const call = order.map(i => re.responses[i]).find(a => a.type === 'pon' || a.type === 'daiminkan') ?? order.map(i => re.responses[i]).find(a => a.type === 'chi');
    if (call) {
        const p = s.players[call.player], tiles = take(p, call.tiles);
        tiles.push(re.tile);
        s.players[re.source].river.at(-1).called = true;
        p.melds.push({ type: call.type, tiles: sortTiles(tiles), from: re.source, calledId: re.tile.id });
        p.called = true;
        p.drawnId = null;
        breakIppatsu(s);
        s.current = p.seat;
        s.reaction = null;
        s.phase = 'discard';
        s.forbidden = s.config.rules.kuikae ? (call.type === 'chi' ? chiForbidden(tiles.map(t => t.kind), re.tile.kind) : [re.tile.kind]) : [];
        if (call.type === 'daiminkan') {
            s.kanCount++;
            s.kanOwners.push(p.seat);
            if (s.config.rules.kanDora && s.wall.doraCount < 5)
                s.wall.doraCount++;
            draw(s, p.seat, 'rinshan');
        }
        else
            s.message = `${p.config.name} ${call.type === 'pon' ? 'ポン' : 'チー'}`;
        return;
    }
    if (s.config.rules.allRiichi && s.players.every(p => p.riichi)) {
        endDraw(s, s.players.length === 3 ? '三家立直' : '四家立直', true);
        return;
    }
    if (s.config.rules.fourWinds && s.players.length === 4 && !s.interrupted && s.players.every(p => p.river.length === 1)) {
        const kinds = s.players.map(p => p.river[0].tile.kind);
        if (kinds[0] >= 27 && kinds[0] <= 30 && kinds.every(k => k === kinds[0])) {
            endDraw(s, '四風連打', true);
            return;
        }
    }
    if (!s.wall.live.length) {
        endDraw(s, '荒牌流局');
        return;
    }
    draw(s, next(s, re.source), 'live');
}
export function applyAction(state, action) {
    if (!legalActions(state, action.player).some(c => sameAction(c.action, action)))
        throw new IllegalActionError('現在はその操作を行えません');
    const s = structuredClone(state), p = s.players[action.player];
    s.actionNumber++;
    if (s.phase === 'reactions') {
        const hadRon = legalActions(s, p.seat).some(c => c.action.type === 'ron');
        if (hadRon && action.type !== 'ron') {
            if (p.riichi)
                p.riichiFuriten = true;
            else
                p.temporaryFuriten = true;
        }
        s.reaction.responses[p.seat] = structuredClone(action);
        resolveReactions(s);
        return s;
    }
    if (action.type === 'tsumo') {
        const tile = p.hand.find(t => t.id === p.drawnId), e = evaluateWin(contextFor(s, p.seat, tile, true));
        endWins(s, [p.seat], null, { [p.seat]: e });
        return s;
    }
    if (action.type === 'nine') {
        endDraw(s, '九種九牌', true);
        return s;
    }
    if (action.type === 'ankan' || action.type === 'kakan' || action.type === 'nuki') {
        const tiles = p.hand.filter(t => action.tiles.includes(t.id));
        const representative = tiles.find(t => t.id === p.drawnId) ?? tiles[0];
        openReaction(s, { source: p.seat, tile: representative, kind: action.type, responses: {}, pendingRiichi: false, kanTiles: action.tiles });
        return s;
    }
    const [tile] = take(p, action.tiles), tsumogiri = tile.id === p.drawnId;
    if (p.riichi)
        p.ippatsu = false;
    p.drawnId = null;
    p.turns++;
    p.river.push({ tile, tsumogiri, riichi: action.type === 'riichi', called: false });
    s.forbidden = [];
    s.firstCycle = !s.interrupted && s.players.some(p => !p.turns);
    openReaction(s, { source: p.seat, tile, kind: 'discard', responses: {}, pendingRiichi: action.type === 'riichi' });
    return s;
}
/** Normal clients see the public observation, never wall/dead-wall/other concealed hands. */
export function publicTileCounts(s, who) {
    const all = [...s.players[who].hand, ...s.players.flatMap(p => p.river.filter(d => !d.called).map(d => d.tile)), ...s.players.flatMap(p => p.melds.flatMap(m => m.tiles)), ...s.players.flatMap(p => p.nuki)];
    all.push(...Array.from({ length: s.wall.doraCount }, (_, i) => s.wall.dead[4 + i * 2]));
    return counts(all);
}
