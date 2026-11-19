import { escapeHtml as e } from './dom.js';
import { kindTile } from './tiles.js';
export function waitsView(report, title = '待ち牌', compact = false) {
    if (!report.tiles.length)
        return '<p class="subtle">この形には待ち牌がありません。</p>';
    const section = compact ? 'span' : 'section', block = compact ? 'span' : 'div';
    return `<${section} class="wait-report ${compact ? 'compact-waits' : ''}" aria-label="${e(title)}"><${block} class="wait-heading"><strong>${e(title)}</strong><span>最大残存 <b>${report.total}枚</b></span>${report.furiten ? '<b class="furiten-badge">フリテン・ロン不可</b>' : ''}</${block}><${block} class="wait-tiles">${report.tiles.map(t => `<${block} class="wait-tile ${t.remaining === 0 ? 'exhausted' : ''}">${kindTile(t.kind)}<b>${t.remaining}枚</b><small>${t.ron ? 'ロン・ツモ' : t.tsumo ? 'ツモのみ' : '役なし・条件役待ち'}${t.remaining === 0 ? ' / 見え4枚' : ''}</small></${block}>`).join('')}</${block}>${report.furiten ? `<${compact ? 'span' : 'p'} class="wait-warning">${e(report.furitenReasons.join(' / '))}。ツモ和了は可能です（役のある待ち）。</${compact ? 'span' : 'p'}>` : ''}${compact ? '' : '<p class="wait-explanation">自分の手牌・河・副露・公開牌から算出した最大残存枚数です。実際の山の枚数ではありません。通常の役を基準に表示し、海底・槍槓などの条件役は含めません。</p>'}</${section}>`;
}
