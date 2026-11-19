import { ranking } from '../core/round.js';
import { escapeHtml as e, money } from './dom.js';
export function rankingView(s, focus) {
    const order = ranking(s), top = s.players[order[0]].score;
    return `<div class="ranking-list" aria-label="現在の順位一覧">${order.map((seat, index) => { const p = s.players[seat]; return `<div class="ranking-item ${seat === focus ? 'is-you' : ''}"><span class="rank-badge rank-${index + 1}">${index + 1}位</span><strong>${e(p.config.name)}${p.config.human ? '<small>自分</small>' : ''}</strong><b>${money(p.score)}点</b><span class="leader-gap">首位と ${money(top - p.score)}点差</span></div>`; }).join('')}</div><p class="subtle">同点は起家からの席順で順位を決定します。</p>`;
}
