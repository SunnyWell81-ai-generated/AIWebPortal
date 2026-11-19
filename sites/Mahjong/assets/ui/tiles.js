import { tileName } from '../core/tiles.js';
import { escapeHtml } from './dom.js';
const pipPositions = { 1: [[24, 34]], 2: [[24, 18], [24, 50]], 3: [[12, 12], [24, 34], [36, 56]], 4: [[12, 16], [36, 16], [12, 52], [36, 52]], 5: [[12, 12], [36, 12], [24, 34], [12, 56], [36, 56]], 6: [[12, 12], [36, 12], [12, 34], [36, 34], [12, 56], [36, 56]], 7: [[12, 10], [24, 19], [36, 28], [12, 43], [36, 43], [12, 59], [36, 59]], 8: [[12, 9], [36, 9], [12, 26], [36, 26], [12, 43], [36, 43], [12, 59], [36, 59]], 9: [[10, 11], [24, 11], [38, 11], [10, 34], [24, 34], [38, 34], [10, 57], [24, 57], [38, 57]] };
export function tileSvg(tile, back = false) {
    if (back || !tile)
        return '<svg viewBox="0 0 48 68" aria-hidden="true"><rect class="tile-back" x="3" y="3" width="42" height="61" rx="4"/><path d="M12 18h24v32H12ZM16 22h16v24H16" fill="none" stroke="currentColor" opacity=".18"/><path d="m18 35 6-9 6 9-6 9Z" fill="currentColor" opacity=".2"/></svg>';
    const k = tile.kind, n = k % 9 + 1, red = tile.red, aria = `role="img" aria-label="${escapeHtml(tileName(tile))}"`;
    // 白は共通描画の入口で無地にする。拡大・テーマ・用途に依存する装飾を一切加えない。
    if (k === 31)
        return `<svg viewBox="0 0 48 68" ${aria}></svg>`;
    let face = '';
    if (k < 9)
        face = `<text x="24" y="29" textLength="43" lengthAdjust="spacingAndGlyphs" class="man-number" fill="${red ? 'var(--ink-red)' : 'var(--ink-dark)'}">${['一', '二', '三', '四', '五', '六', '七', '八', '九'][n - 1]}</text><text x="24" y="62" textLength="42" lengthAdjust="spacingAndGlyphs" class="man-letter" fill="var(--ink-red)">萬</text>`;
    else if (k < 18) {
        const radius = n === 1 ? 21 : n === 2 ? 10 : n === 3 ? 8.5 : n === 4 ? 9 : n <= 6 ? 8.5 : 6.3;
        face = pipPositions[n].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${radius}" fill="${red ? 'var(--ink-red)' : n === 5 && i === 2 || n === 1 ? 'var(--ink-red)' : i % 3 === 0 ? 'var(--ink-blue)' : 'var(--ink-green)'}"/><circle cx="${x}" cy="${y}" r="${radius * .58}" fill="none" stroke="var(--tile-face)" stroke-width="1.25"/>${n === 1 ? '<circle cx="24" cy="34" r="5" fill="var(--tile-face)"/>' : ''}`).join('');
    }
    else if (k < 27) {
        if (n === 1)
            face = '<g transform="translate(24 34) scale(1.4 1.26) translate(-24 -36)"><path d="M11 49q7-9 10-22l-7-10 13 5q9-5 12 2l-7 5q1 17-13 22l-2 8-4-2 3-8Z" fill="var(--ink-green)"/><path d="m19 37 13-8-7 13-10 7" stroke="var(--tile-face)" fill="none" stroke-width="2"/><circle cx="31" cy="24" r="1.4" fill="var(--tile-face)"/></g>';
        else
            face = pipPositions[n].map(([x, y], i) => `<g stroke="${red ? 'var(--ink-red)' : n === 7 && i < 3 ? 'var(--ink-red)' : 'var(--ink-green)'}" stroke-width="4" stroke-linecap="round"><path d="M${x} ${y - 7}v14M${x - 3} ${y - 3}h6M${x - 3} ${y + 3}h6"/></g>`).join('');
    }
    else
        face = `<text x="24" y="55" textLength="44" lengthAdjust="spacingAndGlyphs" class="honor-letter" fill="${k === 32 ? 'var(--ink-green)' : k === 33 ? 'var(--ink-red)' : 'var(--ink-dark)'}">${['東', '南', '西', '北', '白', '發', '中'][k - 27]}</text>`;
    return `<svg viewBox="0 0 48 68" ${aria}>${face}${red ? '<circle cx="44" cy="4" r="2.3" fill="var(--ink-red)"/>' : ''}</svg>`;
}
export function tileHtml(tile, options = {}) {
    const c = ['tile', options.back ? 'back' : '', options.selected ? 'selected' : '', options.drawn ? 'drawn' : '', options.small ? 'small' : '', options.tsumogiri ? 'tsumogiri' : '', options.riichi ? 'riichi-tile' : '', options.called ? 'called' : '', options.danger && options.danger > .1 ? 'danger' : '', options.target ? 'call-target' : '', options.used ? 'call-used' : '', options.winning ? 'winning-tile' : ''].filter(Boolean).join(' ');
    const note = options.winning ? '和了牌' : options.target ? '対象牌' : options.used ? '使用牌' : '';
    const attr = tile && !options.back ? `data-tile="${tile.id}" aria-label="${escapeHtml(tileName(tile))}${note ? `・${note}` : ''}"` : '';
    const face = tileSvg(tile, options.back) + (note ? `<span class="tile-marker" aria-hidden="true">${note}</span>` : '');
    return options.button ? `<button class="${c}" ${attr} ${options.disabled ? 'disabled' : ''} ${options.draggable ? 'draggable="true"' : ''}>${face}</button>` : `<span class="${c}" ${attr}>${face}</span>`;
}
export const kindTile = (kind) => tileHtml({ id: -1, kind, red: false }, { small: true });
