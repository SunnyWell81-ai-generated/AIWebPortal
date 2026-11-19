import { sortTiles } from '../core/tiles.js';
import { waitKnowledge, waitReport } from '../core/assistance.js';
import { escapeHtml as e } from './dom.js';
import { tileHtml } from './tiles.js';
import { waitsView } from './waits.js';
export function actionTiles(s, choice) {
    const a = choice.action, p = s.players[a.player], used = a.tiles ?? [];
    let tiles = p.hand.filter(t => used.includes(t.id)), target;
    if (['chi', 'pon', 'daiminkan', 'ron'].includes(a.type)) {
        target = s.reaction?.tile;
        if (a.type === 'ron')
            tiles = [...p.hand];
        if (target)
            tiles.push(target);
    }
    if (a.type === 'kakan') {
        const kind = tiles[0]?.kind, m = p.melds.find(m => m.type === 'pon' && m.tiles[0].kind === kind);
        tiles = [...(m?.tiles ?? []), ...tiles];
    }
    if (a.type === 'tsumo') {
        tiles = [...p.hand];
        target = p.hand.find(t => t.id === p.drawnId);
    }
    return { tiles: sortTiles(tiles), target, used };
}
export function choicesView(s, choices, selected, showWaits) {
    const active = choices[selected], a = active.action, p = s.players[a.player], display = actionTiles(s, active), isRiichi = a.type === 'riichi', isWin = ['ron', 'tsumo'].includes(a.type);
    const target = display.target ?? (['chi', 'pon', 'daiminkan'].includes(a.type) ? s.reaction?.tile : undefined);
    return `<p class="choice-instruction">候補を選び、内容を確認してから確定してください。${isRiichi ? '宣言牌ごとの待ちと枚数を比較できます。' : a.type === 'ankan' ? '暗槓：手牌の同種4枚を使います。' : a.type === 'kakan' ? '加槓：既存のポン3枚に、手牌1枚を加えます。' : a.type === 'daiminkan' ? '大明槓：他家の捨て牌1枚と、手牌3枚を使います。' : ''}</p>${target ? `<div class="choice-target"><strong>${isWin ? '和了牌' : '鳴き対象の牌'}</strong>${tileHtml(target, { target: !isWin, winning: isWin })}<span>${a.type === 'tsumo' ? '自分のツモ牌' : `${e(s.players[s.reaction.source].config.name)}の${s.reaction?.kind === 'discard' ? '捨て牌' : '宣言牌'}`}</span></div>` : ''}<div class="choice-grid ${isRiichi ? 'riichi-comparison' : ''}">${choices.map((choice, i) => { const d = actionTiles(s, choice), win = ['ron', 'tsumo'].includes(choice.action.type); return `<button class="choice-card ${i === selected ? 'is-selected' : ''}" data-candidate="${i}" aria-pressed="${i === selected}"><span class="choice-card-head"><b>${e(choice.label)}${isRiichi ? 'する打牌' : ''}</b><span>${i === selected ? '✓ 選択中' : '選択する'}</span></span><span class="choice-tile-group">${d.tiles.map(t => tileHtml(t, { small: true, target: !win && t.id === d.target?.id, winning: win && t.id === d.target?.id, used: d.used.includes(t.id) })).join('')}</span>${isRiichi && showWaits ? waitsView(waitReport(waitKnowledge(s, a.player), choice.action.tiles[0], true), '宣言後の待ち', true) : ''}</button>`; }).join('')}</div>${!isRiichi ? `<div class="choice-hand-preview"><strong>${isWin ? '和了する手牌（和了牌は二重枠）' : '自分の手牌（枠つきの牌を使用）'}</strong><div>${sortTiles(p.hand).map(t => tileHtml(t, { small: true, used: display.used.includes(t.id), winning: isWin && t.id === display.target?.id })).join('')}</div></div>` : ''}${isRiichi && !showWaits ? '<p class="subtle">待ち牌補助はOFFです。対局中の補助設定からONにできます。</p>' : ''}${showWaits && isRiichi ? '<p class="wait-explanation">表示は公開情報による最大残存枚数です。実際に山にある枚数ではありません。フリテンは待ち全体に適用します。</p>' : ''}<div class="choice-footer"><button data-choice-cancel>選択を閉じる</button>${s.phase === 'reactions' ? '<button data-choice-pass>鳴かずに見送る</button>' : ''}<button class="primary" data-choice-confirm>${e(active.label)}を確定</button></div>`;
}
