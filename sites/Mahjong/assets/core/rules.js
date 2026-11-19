export const LOCAL_YAKU = [
    { id: 'renhou', name: '人和', han: 5, closed: true, description: '子の第一ツモ前、鳴きのないロン。5翻役として他役と複合。' },
    { id: 'daisharin', name: '大車輪', han: 0, closed: true, description: '門前の筒子22334455667788。役満（七対子と複合しない）。' },
    { id: 'daichikurin', name: '大竹林', han: 0, closed: true, description: '門前の索子22334455667788。役満。' },
    { id: 'daichinrin', name: '大数隣', han: 0, closed: true, description: '門前の萬子22334455667788。役満。' },
    { id: 'isshokusanjun', name: '一色三順', han: 3, closed: false, description: '同一の順子3組。門前3翻、副露2翻。一盃口とは複合しない。' },
    { id: 'sanrenkou', name: '三連刻', han: 2, closed: false, description: '同じ数牌の連続する刻子（槓子）3組。2翻。' },
    { id: 'suurenkou', name: '四連刻', han: 0, closed: false, description: '同じ数牌の連続する刻子（槓子）4組。役満。' },
    { id: 'uumensai', name: '五門斉', han: 2, closed: false, description: '萬子・筒子・索子・風牌・三元牌をすべて含む。2翻。' },
    { id: 'tsubame', name: '燕返し', han: 1, closed: false, description: '他家のリーチ宣言牌でロン。1翻。' },
    { id: 'kanburi', name: '槓振り', han: 1, closed: false, description: '槓による嶺上ツモ直後の捨て牌でロン。1翻。' },
];
export function preset(players) {
    return {
        redMan: players === 3 ? 0 : 1, redPin: 1, redSou: 1, openTanyao: true, atozuke: true,
        ippatsu: true, ura: true, kanDora: true, kanUra: true, ronMode: 'double', tripleRonDraw: true,
        nagashi: true, nineTerminals: true, fourWinds: true, allRiichi: true, fourKans: true,
        startPoints: players === 3 ? 35000 : 25000, returnPoints: players === 3 ? 40000 : 30000,
        uma: players === 3 ? [20, 0, -20] : [20, 10, -10, -20], oka: players === 3 ? 15 : 20,
        tobi: true, agariYame: true, tenpaiRepeat: true, notenRepeat: false, extension: true, singleRepeat: false,
        honbaRon: 300, honbaTsumo: 100, deposits: 'nearest', notenPool: 3000,
        kiriage: false, kazoe: 'yakuman', compoundYakuman: true, doubleYakuman: true,
        kokushi13: 2, suuankouTanki: 2, pureChuuren: 2, daisuushii: 2,
        sanmaChi: false, nuki: true, nukiDora: true, nukiRinshan: false, tsumoLoss: true,
        sanmaManzu: false, kuikae: true, riichiKan: 'shape', doubleWindFu: 4,
        local: Object.fromEntries(LOCAL_YAKU.map(y => [y.id, false])),
    };
}
export const PERSONALITIES = { balanced: 'バランス', attack: '攻撃', defense: '守備', value: '高打点', speed: '速攻' };
export const DEFAULT_MATCH = {
    players: 4, format: 'east', seed: 0, rules: preset(4), seats: [
        { name: 'あなた', human: true, level: 2, personality: 'balanced' },
        { name: '佐藤', human: false, level: 2, personality: 'balanced' },
        { name: '鈴木', human: false, level: 3, personality: 'defense' },
        { name: '高橋', human: false, level: 2, personality: 'attack' },
    ],
};
export function defaultSettings() {
    return { theme: 'system', tileStyle: 'real', animation: 'standard', sound: false, volume: .35,
        clickMode: 2, autoSort: true, detail: false, speed: 'standard',
        confirm: { discard: false, riichi: true, kan: true, nuki: true, exit: true, reset: true, delete: true },
        assistance: { autoWin: false, autoDiscard: false, noCalls: false, shanten: true, waits: true, danger: false, ukeire: false, tsumogiri: true },
        match: structuredClone(DEFAULT_MATCH) };
}
const bool = (key, label, group, note) => ({ key, label, group, type: 'boolean', note });
const num = (key, label, group, min, max, step = 1) => ({ key, label, group, type: 'number', min, max, step });
export const RULE_FIELDS = [
    num('redMan', '赤五萬', '基本', 0, 4), num('redPin', '赤五筒', '基本', 0, 4), num('redSou', '赤五索', '基本', 0, 4),
    ...[['openTanyao', '喰いタン'], ['atozuke', '後付け'], ['ippatsu', '一発'], ['ura', '裏ドラ'], ['kanDora', 'カンドラ'], ['kanUra', 'カン裏']].map(([k, l]) => bool(k, l, '基本')),
    { key: 'ronMode', label: '同時ロン', group: '和了・流局', type: 'select', options: [['head', '頭ハネ'], ['double', 'ダブロン'], ['triple', 'トリプルロン']] },
    ...[['tripleRonDraw', '三家和で流局'], ['nagashi', '流し満貫'], ['nineTerminals', '九種九牌'], ['fourWinds', '四風連打'], ['allRiichi', '全家立直'], ['fourKans', '四開槓']].map(([k, l]) => bool(k, l, '和了・流局')),
    num('startPoints', '開始点', '点数・進行', 1000, 100000, 100), num('returnPoints', '返し点', '点数・進行', 1000, 100000, 100),
    { key: 'uma', label: 'ウマ（順位順・千点単位）', group: '点数・進行', type: 'array' }, num('oka', 'オカ（千点単位）', '点数・進行', 0, 200),
    ...[['tobi', 'トビ終了'], ['agariYame', 'アガリやめ'], ['tenpaiRepeat', 'テンパイ連荘'], ['notenRepeat', 'ノーテン連荘'], ['extension', '延長戦'], ['singleRepeat', '一局戦の連荘']].map(([k, l]) => bool(k, l, '点数・進行')),
    num('honbaRon', '本場ロン支払', '点数・進行', 0, 3000, 100), num('honbaTsumo', '本場ツモ各支払', '点数・進行', 0, 1000, 100), num('notenPool', 'ノーテン罰符総額', '点数・進行', 0, 12000, 600),
    { key: 'deposits', label: '同時ロン供託', group: '点数・進行', type: 'select', options: [['nearest', '上家取り'], ['split', '均等分配（千点単位）']] },
    bool('kiriage', '切り上げ満貫', '役・計算'), { key: 'kazoe', label: '数え役満', group: '役・計算', type: 'select', options: [['yakuman', '13翻以上役満'], ['sanbaiman', '三倍満上限'], ['multiple', '13翻ごとに役満']] },
    bool('compoundYakuman', '役満複合', '役・計算'), bool('doubleYakuman', 'ダブル役満', '役・計算'),
    num('kokushi13', '国士十三面倍率', '役・計算', 1, 2), num('suuankouTanki', '四暗刻単騎倍率', '役・計算', 1, 2), num('pureChuuren', '純正九蓮倍率', '役・計算', 1, 2), num('daisuushii', '大四喜倍率', '役・計算', 1, 2),
    { key: 'doubleWindFu', label: '連風雀頭符', group: '役・計算', type: 'select', options: [['2', '2符'], ['4', '4符']] },
    bool('kuikae', '喰い替え禁止', '基本'), { key: 'riichiKan', label: 'リーチ後暗槓', group: '基本', type: 'select', options: [['shape', '待ち・面子構成不変'], ['wait', '待ち不変']] },
    bool('sanmaChi', '三麻チー許可', '三麻'), bool('nuki', '北抜き', '三麻'), bool('nukiDora', '北抜きドラ', '三麻'), bool('nukiRinshan', '北補充で嶺上役', '三麻'), bool('tsumoLoss', 'ツモ損あり', '三麻'),
    bool('sanmaManzu', '三麻で萬子2〜8も使用', '三麻', 'OFFは108枚。ONは136枚構成。'),
];
export function ruleErrors(r, players) {
    const errors = [];
    for (const f of RULE_FIELDS) {
        const v = r[f.key];
        if (f.type === 'boolean' && typeof v !== 'boolean')
            errors.push(`${f.label}は真偽値で指定`);
        if (f.type === 'number' && (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v) || v < (f.min ?? 0) || v > (f.max ?? Infinity) || v % (f.step ?? 1) !== 0))
            errors.push(`${f.label}の範囲・刻みが不正`);
        if (f.type === 'select' && !f.options?.some(o => o[0] === String(v)))
            errors.push(`${f.label}の選択が不正`);
    }
    if (!Array.isArray(r.uma) || r.uma.length !== players || r.uma.some(n => !Number.isFinite(n) || Math.abs(n) > 200) || Math.abs(r.uma.reduce((a, b) => a + b, 0)) > .001)
        errors.push('ウマは人数分、合計0にしてください');
    if (players === 3 && !r.sanmaManzu && r.redMan)
        errors.push('萬子2〜8なしでは赤五萬を使用できません');
    if (r.kanUra && (!r.ura || !r.kanDora))
        errors.push('カン裏には裏ドラ・カンドラが必要です');
    if (players === 3 && r.nukiDora && !r.nuki)
        errors.push('北抜きドラには北抜きを有効にしてください');
    if (!r.local || LOCAL_YAKU.some(y => typeof r.local[y.id] !== 'boolean'))
        errors.push('ローカル役設定が不正です');
    return errors;
}
export function validateConfig(c) {
    if (![3, 4].includes(c.players) || !['single', 'east', 'south'].includes(c.format))
        throw new Error('対局形式が不正です');
    if (!Number.isSafeInteger(c.seed) || c.seed < 0 || c.seed > 0xffffffff)
        throw new Error('シードは0〜4294967295です');
    if (!Array.isArray(c.seats) || c.seats.length !== c.players || c.seats.filter(s => s.human).length > 1)
        throw new Error('席構成が不正です');
    for (const s of c.seats)
        if (typeof s.name !== 'string' || s.name.length > 40 || typeof s.human !== 'boolean' || ![1, 2, 3, 4].includes(s.level) || !(s.personality in PERSONALITIES))
            throw new Error('CPU設定が不正です');
    const errors = ruleErrors(c.rules, c.players);
    if (errors.length)
        throw new Error(errors.join(' / '));
}
