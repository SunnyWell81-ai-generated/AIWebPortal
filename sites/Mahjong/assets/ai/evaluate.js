import { counts, isOutside, nextDora, seededRandom } from '../core/tiles.js';
import { effectiveTiles, shanten } from '../core/hand.js';
const WEIGHTS = {
    balanced: { attack: 1, defense: 1, value: 1, speed: 1 }, attack: { attack: 1.4, defense: .55, value: 1.1, speed: 1 },
    defense: { attack: .7, defense: 1.8, value: .9, speed: .85 }, value: { attack: 1.1, defense: .9, value: 2, speed: .7 }, speed: { attack: 1.1, defense: .85, value: .6, speed: 1.6 },
};
export function danger(kind, o) {
    let survival = 1;
    for (const q of o.opponents) {
        const allRiver = q.river.map(d => d.tile.kind);
        if (allRiver.includes(kind))
            continue;
        let risk = kind >= 27 ? .07 : .13;
        if (o.visible[kind] >= 3)
            risk *= .18;
        if (kind < 27) {
            const n = kind % 9;
            if ((n >= 3 && allRiver.includes(kind - 3)) || (n <= 5 && allRiver.includes(kind + 3)))
                risk *= .5;
            if (n === 0 || n === 8)
                risk *= .7;
            if (n > 0 && o.visible[kind - 1] === 4 || n < 8 && o.visible[kind + 1] === 4)
                risk *= .5;
            const suit = Math.floor(kind / 9), openKinds = q.melds.flatMap(m => m.tiles.map(t => t.kind)).filter(k => k < 27);
            if (openKinds.length >= 6 && openKinds.every(k => Math.floor(k / 9) === suit))
                risk *= 1.8;
        }
        const threat = q.riichi ? 1 : q.melds.length >= 3 ? .85 : q.melds.length === 2 ? .5 : .12 + Math.min(.3, q.river.length * .018);
        // リーチ後に他家が通した牌は現物として扱う。
        const riichiAt = q.river.findIndex(d => d.riichi);
        if (riichiAt >= 0) {
            const turnsAfter = q.river.length - 1 - riichiAt;
            if (o.opponents.some(other => other.seat !== q.seat && other.river.slice(-turnsAfter).some(d => d.tile.kind === kind)) && turnsAfter > 0)
                risk = 0;
        }
        survival *= 1 - Math.min(.65, risk * threat);
    }
    return 1 - survival;
}
function handValue(hand, o) {
    const combined = [...hand, ...o.melds.flatMap(m => m.tiles)], c = counts(combined);
    let v = 0;
    for (const t of combined) {
        v += t.red ? 1.4 : 0;
        v += o.doraIndicators.filter(i => nextDora(i.kind, o.scores.length, o.rules) === t.kind).length * 1.25;
    }
    for (let k = 27; k < 34; k++)
        if (c[k] >= 2 && (k >= 31 || k === o.seatWind || k === o.roundWind))
            v += c[k] >= 3 ? 1.8 : .55;
    const suits = [0, 0, 0];
    hand.forEach(t => { if (t.kind < 27)
        suits[Math.floor(t.kind / 9)]++; });
    const dominant = Math.max(...suits);
    if (dominant >= 8)
        v += (dominant - 7) * .35;
    if (hand.every(t => !isOutside(t.kind)))
        v += 1;
    return v;
}
function evaluateDiscard(action, o) {
    const hand = o.hand.filter(t => !action.tiles?.includes(t.id)), c = counts(hand), s = shanten(c, o.melds.length);
    const remaining = o.visible.map(n => Math.max(0, 4 - n));
    const ukeire = o.level >= 2 ? effectiveTiles(c, o.melds.length, remaining, o.available).count : 0;
    const k = o.hand.find(t => t.id === action.tiles?.[0]).kind, risk = o.level >= 2 ? danger(k, o) : 0, w = WEIGHTS[o.personality];
    const value = handValue(hand, o) + (action.type === 'riichi' ? 1.6 : 0);
    const progress = Math.min(1, o.remaining / 45), scorePosition = o.scores[o.player] - Math.max(...o.scores.filter((_, i) => i !== o.player));
    const endgame = o.round >= o.scores.length - 1 && scorePosition > 8000 ? 1.3 : 1;
    let push = (s === 0 ? .48 : s === 1 ? .75 : 1.2) * (value > 4 ? .6 : 1) * (progress < .35 ? 1.2 : 1) * endgame;
    const defense = o.level >= 3 ? risk * 1500 * push * w.defense : o.level === 2 ? risk * 140 * w.defense : 0;
    const score = -s * 250 * w.speed + ukeire * (o.level >= 2 ? 2.6 : 0) * w.speed + value * (o.level >= 2 ? 16 : 5) * w.value - defense + (action.type === 'riichi' ? 24 * w.attack - ((o.opponents.some(q => q.riichi) && s > 0) ? 60 : 0) : 0);
    return { action, score, shanten: s, ukeire, risk, value, winProbability: 0 };
}
function bestDiscardAfterCall(action, o) {
    const hand = o.hand.filter(t => !action.tiles?.includes(t.id)), open = o.melds.length + 1;
    let best = Infinity, ukeire = 0;
    if (action.type === 'daiminkan')
        best = shanten(counts(hand), open);
    else
        for (const t of hand) {
            const c = counts(hand.filter(q => q.id !== t.id)), s = shanten(c, open);
            if (s < best) {
                best = s;
                ukeire = effectiveTiles(c, open, o.visible.map(n => Math.max(0, 4 - n)), o.available).count;
            }
        }
    const base = shanten(counts(o.hand), o.melds.length), w = WEIGHTS[o.personality];
    const kinds = action.tiles.map(id => o.hand.find(t => t.id === id).kind), yakuhai = kinds.some(k => k >= 31 || k === o.seatWind || k === o.roundWind);
    const value = handValue(hand, o) + (yakuhai ? 2 : 0), allSimple = hand.every(t => !isOutside(t.kind)) && kinds.every(k => !isOutside(k));
    const plausibleYaku = yakuhai || o.melds.some(m => m.type !== 'chi' && (m.tiles[0].kind >= 31 || m.tiles[0].kind === o.seatWind || m.tiles[0].kind === o.roundWind)) || o.rules.openTanyao && allSimple || [0, 1, 2].some(s => hand.filter(t => t.kind < 27 && Math.floor(t.kind / 9) === s).length >= hand.length - 2);
    const threat = o.opponents.some(q => q.riichi) ? 45 * w.defense : 0;
    const score = (base - best) * 150 * w.speed + ukeire * .6 + (yakuhai ? 40 : 0) + value * 3 * w.value - 55 - threat - (plausibleYaku ? 0 : 180) - (o.level === 1 ? 20 : 0);
    return { action, score, shanten: best, ukeire, risk: 0, value, winProbability: 0 };
}
function sampleRollout(candidate, o, random, deadline) {
    const rest = o.hand.filter(t => !candidate.action.tiles?.includes(t.id)), remaining = o.visible.map(n => Math.max(0, 4 - n));
    let wins = 0, progress = 0, samples = 0;
    while (performance.now() < deadline && samples < 90) {
        const c = counts(rest), pool = [...remaining];
        let best = candidate.shanten;
        for (let depth = 0; depth < Math.min(6, Math.ceil(o.remaining / o.scores.length)); depth++) {
            let sum = pool.reduce((a, b) => a + b, 0);
            if (!sum)
                break;
            let pick = random() * sum, k = 0;
            for (; k < 33; k++) {
                pick -= pool[k];
                if (pick < 0)
                    break;
            }
            pool[k]--;
            c[k]++;
            const current = shanten(c, o.melds.length);
            if (current === -1) {
                wins++;
                best = -1;
                break;
            }
            let min = 99, choices = [];
            for (const d of o.available) {
                if (!c[d])
                    continue;
                c[d]--;
                const s = shanten(c, o.melds.length);
                c[d]++;
                if (s < min) {
                    min = s;
                    choices = [d];
                }
                else if (s === min)
                    choices.push(d);
                if (performance.now() > deadline)
                    break;
            }
            const drop = choices[Math.floor(random() * choices.length)] ?? k;
            c[drop]--;
            best = min;
            if (performance.now() > deadline)
                break;
        }
        progress += candidate.shanten - best;
        samples++;
    }
    return { wins, progress, samples };
}
export function chooseAction(o) {
    const start = performance.now(), random = seededRandom(o.seed), choices = o.choices.map(c => c.action), instant = choices.find(a => a.type === 'ron' || a.type === 'tsumo');
    if (instant)
        return { action: instant, candidates: [], explanation: '合法な和了を選択', elapsed: performance.now() - start, samples: 0 };
    const candidates = [];
    let samples = 0;
    const pass = choices.find(a => a.type === 'pass');
    for (const a of choices) {
        if (a.type === 'discard' || a.type === 'riichi') {
            const c = evaluateDiscard(a, o);
            if (o.level === 1)
                c.score += (random() - .5) * 220;
            candidates.push(c);
        }
        else if (['chi', 'pon', 'daiminkan'].includes(a.type))
            candidates.push(bestDiscardAfterCall(a, o));
        else if (a.type === 'pass')
            candidates.push({ action: a, score: 0, shanten: shanten(counts(o.hand), o.melds.length), ukeire: 0, risk: 0, value: 0, winProbability: 0 });
        else if (a.type === 'nine') {
            const s = shanten(counts(o.hand), o.melds.length);
            candidates.push({ action: a, score: s >= 4 ? 2000 : -2000, shanten: s, ukeire: 0, risk: 0, value: 0, winProbability: 0 });
        }
        else if (a.type === 'nuki') {
            const rest = o.hand.filter(t => !a.tiles.includes(t.id)), c = counts(rest), s = shanten(c, o.melds.length), ukeire = effectiveTiles(c, o.melds.length, o.visible.map(n => Math.max(0, 4 - n)), o.available).count, w = WEIGHTS[o.personality], value = handValue(rest, o) + 1;
            candidates.push({ action: a, score: -s * 250 * w.speed + ukeire * 2.6 * w.speed + value * 16 * w.value + 40, shanten: s, ukeire, risk: 0, value, winProbability: 0 });
        }
        else if (a.type === 'ankan' || a.type === 'kakan') {
            const kind = o.hand.find(t => t.id === a.tiles[0]).kind, risk = a.type === 'kakan' ? danger(kind, o) : 0;
            const rest = o.hand.filter(t => !a.tiles.includes(t.id)), open = o.melds.length + (a.type === 'ankan' ? 1 : 0), c = counts(rest), s = shanten(c, open), ukeire = effectiveTiles(c, open, o.visible.map(n => Math.max(0, 4 - n)), o.available).count, w = WEIGHTS[o.personality], value = handValue(rest, o) + 1;
            candidates.push({ action: a, score: -s * 250 * w.speed + ukeire * 2.6 * w.speed + value * 16 * w.value + (o.opponents.some(q => q.riichi) ? -120 : 30) - risk * 1200 * w.defense, shanten: s, ukeire, risk, value, winProbability: 0 });
        }
    }
    candidates.sort((a, b) => b.score - a.score);
    if (o.level === 4 && !pass) {
        const top = candidates.filter(c => c.action.type === 'discard' || c.action.type === 'riichi').slice(0, 5), deadline = start + 1100;
        for (let i = 0; i < top.length; i++) {
            const c = top[i], time = performance.now() + Math.max(10, (deadline - performance.now()) / (top.length - i));
            const result = sampleRollout(c, o, random, time);
            samples += result.samples;
            c.winProbability = result.samples ? result.wins / result.samples : 0;
            c.score += c.winProbability * (140 + c.value * 24) * WEIGHTS[o.personality].attack + (result.samples ? result.progress / result.samples : 0) * 35;
            // 終盤の順位効用: 首位は放銃回避、下位は打点の上振れを重視。
            const rank = o.scores.filter(v => v > o.scores[o.player]).length;
            if (o.round >= o.scores.length - 1)
                c.score += rank === 0 ? -c.risk * 250 : c.value * rank * 8;
        }
        candidates.sort((a, b) => b.score - a.score);
    }
    const selected = candidates[0];
    if (!selected)
        throw new Error('CPUに合法手が渡されていません');
    return { action: selected.action, candidates, explanation: `Lv.${o.level} / ${o.personality}：${selected.shanten}向聴・受入${selected.ukeire}枚・推定危険度${Math.round(selected.risk * 100)}%${o.level === 4 ? `・探索${samples}回` : ''}`, elapsed: performance.now() - start, samples };
}
