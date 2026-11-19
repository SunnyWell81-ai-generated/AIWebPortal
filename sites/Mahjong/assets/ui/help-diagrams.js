import { tileHtml } from './tiles.js';
import { escapeHtml as e } from './dom.js';
export function diagramTiles(notation) {
    const tokens = [...notation.matchAll(/([0-9]+)([mpsz])/g)];
    return tokens.map(token => `<span class="diagram-group">${[...token[1]].map(digit => { const offset = { m: 0, p: 9, s: 18, z: 27 }[token[2]], n = Number(digit); return tileHtml({ id: -1, kind: offset + (n === 0 ? 4 : n - 1), red: n === 0 }, { small: true }); }).join('')}</span>`).join('');
}
const basic = '123m 456m 123p 345s 77p';
const examples = {
    riichi: { hand: basic, note: '門前でテンパイを宣言し、1000点を供託。牌姿だけでは成立せず、リーチ宣言が必要です。' },
    doubleRiichi: { hand: basic, note: '鳴きのない第一打でリーチを宣言した和了。' }, ippatsu: { hand: basic, note: 'リーチ後一巡以内、途中に鳴き・槓・北抜きが入らない和了。設定OFF時は無効。' },
    menzenTsumo: { hand: basic, note: 'チー・ポン・明槓なしで、自分のツモ牌により和了します。' },
    tanyao: { hand: '234m 456m 234p 678s 55p', note: '全て2〜8。喰いタンOFFでは門前限定になります。' },
    pinfu: { hand: '123m 456m 234p 56s 77p', note: '和了前の13枚例。5・6索の両面待ち（4索・7索）。雀頭は役牌以外。' },
    iipeikou: { hand: '123m 123m 456p 789s 55p', note: '同色・同数字の順子を2組。門前限定。' }, yakuhai: { hand: '555z 123m 456p 789s 22p', note: '先頭の無地3枚は白の刻子。白・發・中、自風・場風が対象。' },
    rinshan: { hand: '1111m 234p 456p 789s 22z', note: '槓の補充牌でツモ。牌姿だけでなく、嶺上牌による和了が条件。' }, chankan: { hand: '123m 456m 123p 33s 55p', note: '和了前の例。加槓牌をロン。暗槓へのロンは国士無双のみ。' },
    haitei: { hand: basic, note: '最後の生牌をツモして和了したとき。' }, houtei: { hand: basic, note: '最後の生牌直後の打牌をロンしたとき。' },
    chiitoi: { hand: '11m 22m 44p 66p 33s 88s 55z', note: '異なる7種の対子。4枚を2対子とは扱いません。25符固定。' },
    toitoi: { hand: '111m 333p 777s 555z 22z', note: '4面子が全て刻子・槓子。鳴いても2翻。' }, sanankou: { hand: '111m 333p 777s 456p 22z', note: '最初の3刻子を自分で揃えた例。ロンで完成した刻子は暗刻に数えません。' },
    sanshokuDoukou: { hand: '333m 333p 333s 789p 55z', note: '萬・筒・索の同じ数字の刻子。鳴いても2翻。' }, sanshoku: { hand: '123m 123p 123s 789s 55p', note: '同じ数字の順子を3色で揃えます。門前2翻、鳴き1翻。' },
    ittsu: { hand: '123m 456m 789m 456p 22z', note: '同じ色で123・456・789。門前2翻、鳴き1翻。' },
    chanta: { hand: '123m 789p 111s 555z 11z', note: '全ての面子と雀頭に1・9・字牌があり、順子も含みます。' },
    junchan: { hand: '123m 789p 111s 999s 11m', note: '字牌なし。全ての面子と雀頭に1または9があり、順子を含みます。' },
    honroutou: { hand: '111m 999p 111s 555z 11z', note: '1・9・字牌だけ。七対子形でも成立。対々和などと複合します。' },
    shousangen: { hand: '555z 666z 77z 123m 789p', note: '白・發の刻子、中の雀頭の例。役牌2翻も別に加算します。' },
    sankantsu: { hand: '1111m 3333p 7777s 456p 22z', note: '3つの槓子。槓ごとに物理的な牌数は1枚増えます。' },
    ryanpeikou: { hand: '123m 123m 456p 456p 77s', note: '同じ順子2組の組を2つ。七対子とは複合しません。' },
    honitsu: { hand: '123p 456p 789p 555z 11z', note: '筒子と字牌だけの例。数牌は1種類に限定します。' },
    chinitsu: { hand: '123p 345p 678p 999p 55p', note: '筒子だけの例。字牌も含めません。' },
    kokushi: { hand: '19m 19p 19s 11234567z', note: '1・9と字牌の13種＋そのいずれか1枚。十三面待ちの倍率は設定に従います。' },
    suuankou: { hand: '111m 333p 777s 999s 22p', note: '4暗刻。ロンは雀頭を完成させる単騎のみ。単騎の倍率は設定式。' },
    daisangen: { hand: '555z 666z 777z 123m 11p', note: '無地の白、緑の發、赤の中をそれぞれ刻子・槓子にします。' },
    shousuushii: { hand: '111z 222z 333z 44z 123p', note: '3種類の風牌の刻子と、残る風牌の雀頭。' }, daisuushii: { hand: '111z 222z 333z 444z 55p', note: '東南西北の4刻子。特殊倍率は現在のルールに従います。' },
    tsuuiisou: { hand: '111z 222z 555z 666z 77z', note: '字牌だけ。七対子形でも成立します。' }, ryuuiisou: { hand: '234s 234s 666s 888s 66z', note: '2・3・4・6・8索と發だけ。發を含まない形でも成立。' },
    chinroutou: { hand: '111m 999m 111p 999s 11s', note: '数牌の1・9だけ。字牌は不可。' }, chuuren: { hand: '111p 234p 567p 8999p 5p', note: '同色1112345678999＋1枚。表示の区切りは面子分解ではなく、基本形の説明です。' },
    suukantsu: { hand: '1111m 3333p 7777s 5555z 22z', note: '4つの槓子と雀頭。物理牌は18枚。' }, tenhou: { hand: basic, note: '親が配牌の第一ツモで和了。鳴き・北抜きなどがないこと。' }, chiihou: { hand: basic, note: '子が鳴きのない第一ツモで和了。' },
    renhou: { hand: basic, note: '子の第一ツモ前、鳴きのないロン。本実装では5翻。' },
    daisharin: { hand: '22p 33p 44p 55p 66p 77p 88p', note: '筒子の2〜8を全て対子。門前役満。' }, daichikurin: { hand: '22s 33s 44s 55s 66s 77s 88s', note: '索子の2〜8を全て対子。門前役満。' }, daichinrin: { hand: '22m 33m 44m 55m 66m 77m 88m', note: '萬子の2〜8を全て対子。標準三麻の使用牌では成立しません。' },
    isshokusanjun: { hand: '123m 123m 123m 789p 55z', note: '同一順子3組。門前3翻・鳴き2翻。一盃口と複合しません。' }, sanrenkou: { hand: '333m 444m 555m 123p 77z', note: '連続した3刻子。同じ色の数牌が必要。' }, suurenkou: { hand: '222m 333m 444m 555m 66z', note: '連続した4刻子。鳴きも可能な役満。' },
    uumensai: { hand: '123m 456p 789s 111z 55z', note: '萬子・筒子・索子・風牌・三元牌を全て使用。' }, tsubame: { hand: basic, note: '他家のリーチ宣言牌をロン。牌姿だけでは成立しません。' }, kanburi: { hand: basic, note: '他家の槓による嶺上ツモ直後の打牌をロン。' },
};
export function yakuExample(id) {
    const example = examples[id];
    if (!example)
        return '';
    return `<details class="yaku-example" ${['pinfu', 'chiitoi', 'sanshoku', 'ittsu', 'honitsu', 'chinitsu', 'kokushi'].includes(id) ? 'open' : ''}><summary>牌の構成例・補足</summary><div class="hand-diagram">${diagramTiles(example.hand)}</div><p>${e(example.note)}</p></details>`;
}
export function waitsDiagram() {
    return `<div class="guide-diagrams">${[['両面待ち', '23s', '14s', '2種類・待ちの符なし'], ['嵌張待ち', '24s', '3s', '真ん中を待つ・2符'], ['辺張待ち', '12s', '3s', '123の3／789の7を待つ・2符'], ['単騎待ち', '5p', '5p', '雀頭を待つ・2符'], ['双碰待ち', '33m 77p', '3m 7p', '待ちの符なし。完成する刻子を計算']].map(([label, hand, w, note]) => `<figure><figcaption>${label}</figcaption><div class="diagram-flow"><div class="hand-diagram">${diagramTiles(hand)}</div><span>待ち</span><div class="hand-diagram">${diagramTiles(w)}</div></div><p>${note}</p></figure>`).join('')}</div>`;
}
export function fuDiagram() {
    return `<h3>面子の符を牌で見る</h3><div class="guide-diagrams">${[['明刻・中張牌', '333p', '2符'], ['暗刻・中張牌', '333p', '4符'], ['明刻・么九牌', '111m', '4符'], ['暗槓・么九牌', '1111m', '32符'], ['三元牌の雀頭', '55z', '2符（無地の白）']].map(([label, hand, note]) => `<figure><figcaption>${label}</figcaption><div class="hand-diagram">${diagramTiles(hand)}</div><p>${note}</p></figure>`).join('')}</div>`;
}
export function northDiagram() {
    return `<figure class="north-diagram"><figcaption>三麻の北抜き（手牌の一部）</figcaption><div class="diagram-flow"><div class="hand-diagram">${diagramTiles('4z')}</div><span>抜く</span><div class="nuki-example">${diagramTiles('4z')}<small>抜き牌として公開</small></div><span>補充</span>${tileHtml(null, { small: true, back: true })}</div><p>北抜きは門前を維持します。補充は生牌から。一発は消え、抜きドラ・嶺上役の有無は設定に従います。</p></figure>`;
}
