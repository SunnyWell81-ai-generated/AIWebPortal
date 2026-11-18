export function escapeHtml(v) { return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
export const money = (n) => n.toLocaleString('ja-JP');
export const pct = (n) => `${(n * 100).toFixed(1)}%`;
export const selectOptions = (values, value) => values.map(([v, l]) => `<option value="${escapeHtml(v)}" ${String(value) === v ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('');
export const toggle = (label, key, checked, note = '') => `<label class="toggle-row"><span>${escapeHtml(label)}${note ? `<small>${escapeHtml(note)}</small>` : ''}</span><input type="checkbox" data-setting="${key}" ${checked ? 'checked' : ''}><span class="switch" aria-hidden="true"></span></label>`;
export const icon = (name) => {
    const paths = { play: 'M9 5l11 7-11 7Z', pause: 'M8 5v14M16 5v14', settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2', chart: 'M4 19V9M12 19V4M20 19v-7', book: 'M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3ZM12 6v15', back: 'M15 5l-7 7 7 7', menu: 'M4 6h16M4 12h16M4 18h16', replay: 'M3 10a9 9 0 1 1 2 8M3 3v7h7M12 7v5l3 2', close: 'M6 6l12 12M6 18L18 6', volume: 'M3 9v6h4l5 4V5L7 9ZM16 8q6 4 0 8', arrow: 'M5 12h14M13 6l6 6-6 6', sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2M12 20v2M2 12h2M20 12h2', download: 'M12 3v12M7 10l5 5 5-5M4 17v4h16v-4', shuffle: 'M4 5h3l10 14h3M16 5h4v4M4 19h3l4-5M14 9l3-4h3' };
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] ?? paths.play}"/></svg>`;
};
export function toast(message) { const el = document.querySelector('#toast'); el.textContent = message; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 4800); }
export function modal(title, body, wide = false) { const d = document.querySelector('#modal'); d.className = wide ? 'wide' : ''; d.innerHTML = `<header class="modal-head"><h2>${escapeHtml(title)}</h2><button class="icon-button" data-close aria-label="閉じる">${icon('close')}</button></header><div class="modal-content">${body}</div>`; d.querySelector('[data-close]')?.addEventListener('click', () => d.close()); if (!d.open)
    d.showModal(); return d; }
