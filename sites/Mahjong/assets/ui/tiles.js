import { tileName } from '../core/tiles.js';
import { escapeHtml } from './dom.js';
const pipPositions = { 1: [[24, 34]], 2: [[24, 20], [24, 48]], 3: [[14, 18], [24, 34], [34, 50]], 4: [[14, 19], [34, 19], [14, 49], [34, 49]], 5: [[13, 18], [35, 18], [24, 34], [13, 50], [35, 50]], 6: [[14, 16], [34, 16], [14, 34], [34, 34], [14, 52], [34, 52]], 7: [[12, 14], [24, 22], [36, 30], [14, 42], [34, 42], [14, 55], [34, 55]], 8: [[14, 13], [34, 13], [14, 27], [34, 27], [14, 41], [34, 41], [14, 55], [34, 55]], 9: [[12, 15], [24, 15], [36, 15], [12, 34], [24, 34], [36, 34], [12, 53], [24, 53], [36, 53]] };
export function tileSvg(tile, back = false) {
    if (back || !tile)
        return `<svg viewBox="0 0 48 68" aria-hidden="true"><rect class="tile-back" x="3" y="3" width="42" height="61" rx="4"/><path d="M12 18h24v32H12ZM16 22h16v24H16" fill="none" stroke="currentColor" opacity=".18"/><path d="m18 35 6-9 6 9-6 9Z" fill="currentColor" opacity=".2"/></svg>`;
    const k = tile.kind, n = k % 9 + 1, suit = Math.floor(k / 9), red = tile.red;
    let face = '';
    if (k < 9)
        face = `<text x="24" y="28" class="man-number" fill="${red ? 'var(--ink-red)' : 'var(--ink-dark)'}">${['一', '二', '三', '四', '五', '六', '七', '八', '九'][n - 1]}</text><text x="24" y="56" class="man-letter" fill="var(--ink-red)">萬</text>`;
    else if (k < 18)
        face = pipPositions[n].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${n === 1 ? 13 : n > 6 ? 4.4 : 6}" fill="${red ? 'var(--ink-red)' : n === 5 && i === 2 || n === 1 ? 'var(--ink-red)' : i % 3 === 0 ? 'var(--ink-blue)' : 'var(--ink-green)'}"/><circle cx="${x}" cy="${y}" r="${n === 1 ? 8 : n > 6 ? 2 : 3}" fill="none" stroke="var(--tile-face)" stroke-width="1"/>${n === 1 ? '<circle cx="24" cy="34" r="3" fill="var(--tile-face)"/>' : ''}`).join('');
    else if (k < 27) {
        if (n === 1)
            face = '<path d="M11 49q7-9 10-22l-7-10 13 5q9-5 12 2l-7 5q1 17-13 22l-2 8-4-2 3-8Z" fill="var(--ink-green)"/><path d="m19 37 13-8-7 13-10 7" stroke="var(--tile-face)" fill="none" stroke-width="2"/><circle cx="31" cy="24" r="1.4" fill="var(--tile-face)"/>';
        else
            face = pipPositions[n].map(([x, y], i) => `<g stroke="${red ? 'var(--ink-red)' : n === 7 && i < 3 ? 'var(--ink-red)' : 'var(--ink-green)'}" stroke-width="3.4" stroke-linecap="round"><path d="M${x} ${y - 5}v10M${x - 2} ${y - 2}h4M${x - 2} ${y + 2}h4"/></g>`).join('');
    }
    else if (k === 31)
        face = '<rect x="10" y="13" width="28" height="42" rx="2" fill="none" stroke="var(--ink-blue)" stroke-width="2.4"/>';
    else
        face = `<text x="24" y="48" class="honor-letter" fill="${k === 32 ? 'var(--ink-green)' : k === 33 ? 'var(--ink-red)' : 'var(--ink-dark)'}">${['東', '南', '西', '北', '白', '發', '中'][k - 27]}</text>`;
    return `<svg viewBox="0 0 48 68" role="img" aria-label="${escapeHtml(tileName(tile))}">${face}${red ? '<circle cx="42" cy="6" r="2.3" fill="var(--ink-red)"/>' : ''}</svg>`;
}
export function tileHtml(tile, options = {}) {
    const c = ['tile', options.back ? 'back' : '', options.selected ? 'selected' : '', options.drawn ? 'drawn' : '', options.small ? 'small' : '', options.tsumogiri ? 'tsumogiri' : '', options.riichi ? 'riichi-tile' : '', options.called ? 'called' : '', options.danger && options.danger > .1 ? 'danger' : ''].filter(Boolean).join(' ');
    const attr = tile && !options.back ? `data-tile="${tile.id}" aria-label="${escapeHtml(tileName(tile))}"` : '';
    return options.button ? `<button class="${c}" ${attr} ${options.disabled ? 'disabled' : ''} ${options.draggable ? 'draggable="true"' : ''}>${tileSvg(tile, options.back)}</button>` : `<span class="${c}" ${attr}>${tileSvg(tile, options.back)}</span>`;
}
export const kindTile = (kind) => tileHtml({ id: -1, kind, red: false }, { small: true });
