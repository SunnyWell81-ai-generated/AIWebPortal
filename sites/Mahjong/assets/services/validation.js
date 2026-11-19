import { defaultSettings, validateConfig } from '../core/rules.js';
import { createTiles } from '../core/tiles.js';
import { applyLogAction, historyInitial } from './replay.js';
const object = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
export function validateSettings(value) {
    if (!object(value))
        throw new Error('設定データが不正です');
    const s = value, d = defaultSettings();
    for (const key of ['theme', 'tileStyle', 'animation', 'speed']) {
        const allowed = { theme: ['system', 'light', 'dark'], tileStyle: ['real', 'flat'], animation: ['off', 'standard', 'strong'], speed: ['fast', 'standard', 'slow'] }[key];
        if (!allowed.includes(s[key]))
            throw new Error(`${key}が不正です`);
    }
    for (const key of ['sound', 'autoSort', 'detail'])
        if (typeof s[key] !== 'boolean')
            throw new Error(`${key}が不正です`);
    if (!finite(s.volume) || s.volume < 0 || s.volume > 1 || ![1, 2].includes(s.clickMode))
        throw new Error('音量または操作設定が不正です');
    if (!object(s.confirm) || !object(s.assistance))
        throw new Error('補助設定が不正です');
    for (const k of Object.keys(d.confirm))
        if (typeof s.confirm[k] !== 'boolean')
            throw new Error('確認設定が不正です');
    for (const k of Object.keys(d.assistance))
        if (typeof s.assistance[k] !== 'boolean')
            throw new Error('補助設定が不正です');
    validateConfig(s.match);
    return structuredClone(s);
}
export function validateState(value) {
    if (!object(value) || value.version !== 1)
        throw new Error('非対応の局面バージョンです');
    const s = value;
    if (s.endRuleVersion !== undefined && ![1, 2].includes(s.endRuleVersion))
        throw new Error('終局ルールの版が不正です');
    validateConfig(s.config);
    const n = s.config.players;
    if (!Array.isArray(s.players) || s.players.length !== n || !['discard', 'reactions', 'handEnd', 'matchEnd'].includes(s.phase))
        throw new Error('局面の形式が不正です');
    for (const k of ['round', 'honba', 'deposits', 'current', 'dealer', 'seed', 'actionNumber', 'kanCount'])
        if (!Number.isInteger(s[k]) || s[k] < 0)
            throw new Error(`局面の${k}が不正です`);
    if (s.current >= n || s.dealer >= n || s.kanCount > 4 || s.round > 10000 || s.actionNumber > 1000000)
        throw new Error('局面の範囲が不正です');
    if (typeof s.id !== 'string' || typeof s.startedAt !== 'string' || !Array.isArray(s.records))
        throw new Error('対局の識別情報が不正です');
    const valid = createTiles(n, s.config.rules), byId = new Map(valid.map(t => [t.id, t]));
    const owned = new Set();
    const tile = (t, owner = true) => { const expected = byId.get(t?.id); if (!expected || expected.kind !== t.kind || expected.red !== t.red)
        throw new Error('存在しない牌です'); if (owner) {
        if (owned.has(t.id))
            throw new Error('牌の重複があります');
        owned.add(t.id);
    } };
    if (!s.wall || !Array.isArray(s.wall.live) || !Array.isArray(s.wall.dead) || s.wall.dead.length !== 14 || !Number.isInteger(s.wall.rinshanUsed) || s.wall.rinshanUsed < 0 || s.wall.rinshanUsed > 4 || !Number.isInteger(s.wall.doraCount) || s.wall.doraCount < 1 || s.wall.doraCount > 5)
        throw new Error('山の状態が不正です');
    [...s.wall.live, ...s.wall.dead].forEach(t => tile(t));
    for (let i = 0; i < n; i++) {
        const p = s.players[i];
        if (p.seat !== i || !finite(p.score) || Math.abs(p.score) > 10000000 || !Array.isArray(p.hand) || !Array.isArray(p.river) || !Array.isArray(p.melds) || !Array.isArray(p.nuki) || p.hand.length > 14 || p.melds.length > 4)
            throw new Error('プレイヤー状態が不正です');
        for (const key of ['riichi', 'doubleRiichi', 'ippatsu', 'riichiFuriten', 'temporaryFuriten', 'called'])
            if (typeof p[key] !== 'boolean')
                throw new Error('プレイヤーフラグが不正です');
        p.hand.forEach(t => tile(t));
        p.river.forEach(d => { if (typeof d.called !== 'boolean' || typeof d.riichi !== 'boolean' || typeof d.tsumogiri !== 'boolean')
            throw new Error('河の形式が不正です'); tile(d.tile, !d.called); });
        p.nuki.forEach(t => { tile(t); if (t.kind !== 30)
            throw new Error('抜き牌が北ではありません'); });
        p.melds.forEach(m => { if (!['chi', 'pon', 'daiminkan', 'ankan', 'kakan'].includes(m.type) || m.tiles.length !== (m.type === 'chi' || m.type === 'pon' ? 3 : 4) || !Number.isInteger(m.from) || m.from < 0 || m.from >= n)
            throw new Error('面子の形式が不正です'); m.tiles.forEach(t => tile(t)); const ks = m.tiles.map(t => t.kind).sort((a, b) => a - b); if (m.type === 'chi' ? ks[0] >= 27 || Math.floor(ks[0] / 9) !== Math.floor(ks[2] / 9) || ks[1] !== ks[0] + 1 || ks[2] !== ks[0] + 2 : !ks.every(k => k === ks[0]))
            throw new Error('面子の構成が不正です'); });
        if (p.drawnId !== null && !p.hand.some(t => t.id === p.drawnId))
            throw new Error('ツモ牌が手牌にありません');
        const interruptedTurn = s.phase === 'matchEnd' && s.endReason === 'tobi' && s.result?.abortive && s.current === i && p.hand.length === 14 - p.melds.length * 3;
        const extra = p.drawnId !== null || s.phase === 'discard' && s.current === i || interruptedTurn;
        if (p.hand.length !== 13 - p.melds.length * 3 + (extra ? 1 : 0))
            throw new Error('手牌と副露の枚数が一致しません');
        if (!Number.isInteger(p.turns) || p.turns < 0 || !Array.isArray(p.riichiWaits) || p.riichiWaits.some(k => !Number.isInteger(k) || k < 0 || k > 33))
            throw new Error('巡目・待ち牌が不正です');
    }
    if (owned.size !== valid.length)
        throw new Error('牌の総数が一致しません');
    if (s.phase === 'reactions') {
        const re = s.reaction;
        if (!re || !['discard', 'kakan', 'ankan', 'nuki'].includes(re.kind) || !Number.isInteger(re.source) || re.source < 0 || re.source >= n || !object(re.responses))
            throw new Error('応答状態が不正です');
        tile(re.tile, false);
        if (re.kind === 'discard' && s.players[re.source].river.at(-1)?.tile.id !== re.tile.id)
            throw new Error('応答対象の打牌が不正です');
        if (re.kind !== 'discard' && !s.players[re.source].hand.some(t => t.id === re.tile.id))
            throw new Error('応答対象の槓・北が不正です');
    }
    validateConfig({ ...s.config, seats: s.players.map(p => p.config) });
    for (const rec of s.records) {
        if (!object(rec) || !Number.isInteger(rec.round) || !Number.isInteger(rec.dealer) || !Number.isInteger(rec.honba) || !Array.isArray(rec.riichi) || !Array.isArray(rec.calls) || !Array.isArray(rec.scores) || rec.scores.length !== n)
            throw new Error('局記録が不正です');
        validateResult(rec.result, n);
    }
    if (s.phase === 'handEnd' || s.phase === 'matchEnd')
        validateResult(s.result, n);
    if (s.players.reduce((a, p) => a + p.score, 0) + s.deposits * 1000 !== s.config.rules.startPoints * n)
        throw new Error('持ち点と供託の総額が不正です');
    return structuredClone(s);
}
function validEvents(events) {
    if (!Array.isArray(events) || events.length > 100000)
        throw new Error('牌譜イベント数が不正です');
    events.forEach((e, i) => { if (!object(e) || e.index !== i || !finite(e.at))
        throw new Error('牌譜イベントが不正です'); const a = e.action; if (a !== 'next' && a !== 'upgradeEndRules' && (!object(a) || !['discard', 'riichi', 'chi', 'pon', 'daiminkan', 'ankan', 'kakan', 'ron', 'tsumo', 'pass', 'nine', 'nuki'].includes(String(a.type)) || !Number.isInteger(a.player) || Number(a.player) < 0 || Number(a.player) > 3 || a.tiles !== undefined && (!Array.isArray(a.tiles) || a.tiles.some(t => !Number.isInteger(t) || t < 0 || t > 135))))
        throw new Error('牌譜操作が不正です'); });
}
function validateResult(v, n) {
    if (!object(v) || typeof v.reason !== 'string' || !Array.isArray(v.winners) || !Array.isArray(v.delta) || v.delta.length !== n || !v.delta.every(finite) || !Array.isArray(v.tenpai) || !object(v.evaluations) || typeof v.dealerRepeat !== 'boolean' || typeof v.abortive !== 'boolean')
        throw new Error('局結果が不正です');
    for (const ids of [v.winners, v.tenpai])
        if (ids.some(i => !Number.isInteger(i) || i < 0 || i >= n) || new Set(ids).size !== ids.length)
            throw new Error('局結果の席番号が不正です');
    if (v.loser !== undefined && (!Number.isInteger(v.loser) || Number(v.loser) < 0 || Number(v.loser) >= n))
        throw new Error('放銃者の席番号が不正です');
    for (const ev of Object.values(v.evaluations)) {
        if (!object(ev) || !Array.isArray(ev.yaku) || !Array.isArray(ev.fuItems))
            throw new Error('和了内訳が不正です');
        for (const k of ['han', 'fu', 'yakuman', 'base', 'dora', 'ura', 'red', 'nuki'])
            if (!finite(ev[k]) || Number(ev[k]) < 0)
                throw new Error('和了点が不正です');
        for (const y of ev.yaku)
            if (!object(y) || typeof y.id !== 'string' || typeof y.name !== 'string' || !finite(y.han) || !finite(y.yakuman))
                throw new Error('役の形式が不正です');
    }
}
export function validateResume(v) {
    if (!object(v) || v.version !== 1)
        throw new Error('途中データのバージョンが不正です');
    const state = validateState(v.state), initial = validateState(v.initial);
    validEvents(v.events);
    if (state.id !== initial.id)
        throw new Error('途中データの対局IDが一致しません');
    if (v.handOrder !== undefined && (!Array.isArray(v.handOrder) || v.handOrder.some(id => !Number.isInteger(id) || id < 0 || id > 135) || new Set(v.handOrder).size !== v.handOrder.length))
        throw new Error('手牌の並び順が不正です');
    return { version: 1, state, initial, events: structuredClone(v.events), ...(v.handOrder ? { handOrder: structuredClone(v.handOrder) } : {}) };
}
export function validateReplay(v) { if (!object(v) || v.version !== 1 || typeof v.completedAt !== 'string')
    throw new Error('牌譜の形式が不正です'); const initial = validateState(v.initial), final = validateState(v.final); validEvents(v.events); if (initial.id !== final.id || final.phase !== 'matchEnd')
    throw new Error('完成牌譜ではありません'); return { version: 1, initial, final, events: structuredClone(v.events), completedAt: v.completedAt }; }
export function validateStats(v) {
    if (!object(v) || v.version !== 1 || !Array.isArray(v.entries) || v.entries.length > 100000)
        throw new Error('統計データが不正です');
    const ids = new Set();
    for (const e of v.entries) {
        if (!object(e) || typeof e.id !== 'string' || ids.has(e.id) || ![3, 4].includes(Number(e.players)) || !['single', 'east', 'south'].includes(String(e.format)) || !Array.isArray(e.levels) || !e.levels.every(l => [1, 2, 3, 4].includes(l)) || !object(e.yaku))
            throw new Error('成績の形式が不正です');
        if (e.names !== undefined && (!Array.isArray(e.names) || e.names.length !== e.players || e.names.some(name => typeof name !== 'string' || name.length > 40)))
            throw new Error('成績のプレイヤー名が不正です');
        ids.add(e.id);
        for (const k of ['rank', 'score', 'point', 'hands', 'wins', 'dealIns', 'calls', 'riichi', 'winPoints', 'lossPoints', 'tsumo', 'ron', 'draws', 'tenpai', 'yakuman'])
            if (!finite(e[k]) || Math.abs(Number(e[k])) > 1e12)
                throw new Error('成績の数値が不正です');
        if (Number(e.rank) < 1 || Number(e.rank) > Number(e.players) || Object.values(e.yaku).some(n => !finite(n) || Number(n) < 0))
            throw new Error('成績の範囲が不正です');
    }
    return structuredClone(v);
}
/** JSONインポート時、保存する前に記録した操作列と最終状態の整合を確認する。 */
export async function validateHistory(value) {
    let state = historyInitial(value.initial);
    for (let i = 0; i < value.events.length; i++) {
        const event = value.events[i];
        state = applyLogAction(state, event.action);
        if (i % 24 === 23)
            await new Promise(resolve => setTimeout(resolve, 0));
    }
    const expected = 'final' in value ? value.final : value.state;
    if (expected.endRuleVersion === undefined && state.endRuleVersion === 1)
        delete state.endRuleVersion;
    const canonical = (v) => {
        if (v === undefined)
            return 'null';
        if (Array.isArray(v))
            return '[' + v.map(canonical).join(',') + ']';
        if (object(v))
            return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
        return JSON.stringify(v);
    };
    if (canonical(state) !== canonical(expected))
        throw new Error('牌譜操作と保存局面が一致しません。既存データは変更していません。');
}
