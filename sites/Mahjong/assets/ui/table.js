import { counts, sortTiles, WIND_NAMES, windOf } from '../core/tiles.js';
import { handShanten } from '../core/hand.js';
import { analyzeHand } from '../core/analysis.js';
import { publicTileCounts } from '../core/engine.js';
import { ranking } from '../core/round.js';
import { waitKnowledge, waitReport } from '../core/assistance.js';
import { waitsView } from './waits.js';
import { indicators } from '../core/wall.js';
import { danger } from '../ai/evaluate.js';
import { observe } from '../ai/observation.js';
import { escapeHtml as e, icon, money } from './dom.js';
import { kindTile, tileHtml } from './tiles.js';
export function tableView(s, settings, o) {
    const n = s.players.length, focus = o.focus, p = s.players[focus], a = settings.assistance, order = ranking(s);
    const rankOf = (seat) => order.indexOf(seat) + 1;
    const reactionTarget = s.reaction && o.choices.some(c => ['chi', 'pon', 'daiminkan', 'ron'].includes(c.action.type)) ? s.reaction.tile.id : null;
    const winningId = s.result?.winningTile?.id ?? (o.choices.some(c => c.action.type === 'tsumo') ? p.drawnId : o.choices.some(c => c.action.type === 'ron') ? s.reaction?.tile.id : null);
    let hand = settings.autoSort ? sortTiles(p.hand.filter(t => t.id !== p.drawnId)) : p.hand.filter(t => t.id !== p.drawnId);
    if (!settings.autoSort && o.order)
        hand.sort((x, y) => { const ix = o.order.indexOf(x.id), iy = o.order.indexOf(y.id); return (ix < 0 ? 1000 : ix) - (iy < 0 ? 1000 : iy); });
    const drawn = p.hand.find(t => t.id === p.drawnId);
    if (drawn)
        hand.push(drawn);
    const canDiscard = o.choices.filter(c => c.action.type === 'discard'), obs = a.danger ? observe(s, focus) : null;
    const c = counts(p.hand), visible = publicTileCounts(s, focus), available = observe(s, focus).available;
    const analysis = (a.ukeire || a.waits) ? analyzeHand(p.hand, p.melds, visible.map(n => Math.max(0, 4 - n)), available, canDiscard.length ? canDiscard.map(c => c.action.tiles[0]) : undefined) : null;
    const selectedAnalysis = analysis?.discards.find(d => d.tile.id === o.selected);
    const sh = handShanten(p.hand, p.melds), eff = a.ukeire ? (selectedAnalysis ?? analysis) : null;
    const discardId = p.riichi && drawn ? drawn.id : selectedAnalysis?.tile.id ?? analysis?.discards[0]?.tile.id;
    const report = a.waits && sh !== -1 && s.phase !== 'handEnd' && s.phase !== 'matchEnd' ? waitReport(waitKnowledge(s, focus), discardId) : null;
    const others = s.players.filter(q => q.seat !== focus).map(q => {
        const relative = (q.seat - focus + n) % n, position = n === 3 ? (relative === 1 ? 'right' : 'top') : ['bottom', 'right', 'top', 'left'][relative];
        const shown = o.replay && o.reveal;
        return `<div class="opponent opponent-${position}"><div class="opponent-caption"><span class="rank-badge rank-${rankOf(q.seat)}">${rankOf(q.seat)}位</span> ${e(q.config.name)} <span>${WIND_NAMES[windOf(q.seat, s.dealer, n) - 27]} · ${money(q.score)}</span></div><div class="opponent-hand">${q.hand.map(t => tileHtml(shown ? t : null, { back: !shown, small: true })).join('')}</div></div>`;
    }).join('');
    const rivers = s.players.map(q => {
        const rel = (q.seat - focus + n) % n, position = n === 3 ? ['bottom', 'right', 'top'][rel] : ['bottom', 'right', 'top', 'left'][rel];
        return `<div class="river river-${position}" aria-label="${e(q.config.name)}の河">${q.river.map((d, i) => tileHtml(d.tile, { small: true, tsumogiri: a.tsumogiri && d.tsumogiri, riichi: d.riichi, called: d.called, target: d.tile.id === reactionTarget, winning: d.tile.id === winningId })).join('')}</div>`;
    }).join('');
    const melds = s.players.map(q => {
        const rel = (q.seat - focus + n) % n, pos = n === 3 ? ['bottom', 'right', 'top'][rel] : ['bottom', 'right', 'top', 'left'][rel];
        return `<div class="melds melds-${pos}">${q.melds.map(m => `<span class="meld">${m.tiles.map((t, i) => tileHtml(t, { small: true, back: m.type === 'ankan' && !o.reveal && (i === 0 || i === 3), riichi: m.calledId === t.id })).join('')}</span>`).join('')}${q.nuki.length ? `<span class="nuki-count">北 ×${q.nuki.length}</span>` : ''}</div>`;
    }).join('');
    const badges = s.players.map(q => {
        const rel = (q.seat - focus + n) % n, pos = n === 3 ? ['bottom', 'right', 'top'][rel] : ['bottom', 'right', 'top', 'left'][rel];
        return `<span class="wind-badge wind-${pos} ${s.current === q.seat ? 'active' : ''}">${WIND_NAMES[windOf(q.seat, s.dealer, n) - 27]}${q.riichi ? '<i class="riichi-stick"></i>' : ''}</span>`;
    }).join('');
    const actionTypes = [...new Set(o.choices.map(c => c.action.type))].filter(t => t !== 'discard' && t !== 'riichi');
    const actionButtons = actionTypes.map(t => `<button class="action-button ${t === 'ron' || t === 'tsumo' ? 'gold' : ''}" data-game-action="${t}">${e(o.choices.find(c => c.action.type === t).label)}${settings.detail ? `<small>${{ ron: 'R', tsumo: 'T', pass: 'Esc', pon: 'P', chi: 'C', ankan: 'K', kakan: 'K', daiminkan: 'K', nuki: 'N', nine: '9' }[t] ?? ''}</small>` : ''}</button>`).join('');
    const riichi = o.choices.some(c => c.action.type === 'riichi');
    return `<div class="match-layout"><section class="game-area" aria-label="麻雀卓"><div class="table-toolbar"><span class="status-dot"></span><span>${o.replay ? '牌譜再生' : s.players.every(q => !q.config.human) ? 'CPU 観戦' : 'CPU 対戦'}</span><span class="table-format">${n}人麻雀 / ${s.config.format === 'single' ? '一局' : s.config.format === 'east' ? '東風' : '半荘'}</span><button class="text-button" data-ui="detail">${settings.detail ? 'シンプル表示' : '詳細表示'}</button><button class="text-button" data-ui="rankings">順位一覧</button><button class="text-button mobile-assist" data-ui="assistance">補助設定</button></div>
    <div class="mahjong-table">${others}${rivers}${melds}<div class="center-board"><div class="round-label">${WIND_NAMES[Math.floor(s.round / n)] ?? '延'} ${s.round % n + 1} <small>局</small></div><div class="center-meta"><span>${s.honba} 本場</span><span>供託 ${s.deposits}</span></div><div class="remaining-label">残り <strong>${s.wall.live.length}</strong> 枚</div><div class="dora-label">DORA</div><div class="dora-tiles">${indicators(s.wall).map(t => tileHtml(t, { small: true })).join('')}${Array.from({ length: 5 - s.wall.doraCount }, () => tileHtml(null, { small: true, back: true })).join('')}</div>${badges}</div><div class="table-announcement" aria-live="polite"></div>${o.paused ? '<div class="pause-cover"><span>一時停止</span><button class="primary" data-ui="resume">再開</button></div>' : ''}</div>
    <div class="hand-panel"><div class="hand-caption"><span class="player-tag">${WIND_NAMES[windOf(focus, s.dealer, n) - 27]}</span><strong>${e(p.config.name)}</strong><span class="rank-badge rank-${rankOf(focus)} your-rank">${rankOf(focus)}位</span><span class="your-score">${money(p.score)}<small>点</small></span>${p.riichi ? '<span class="riichi-label">立直</span>' : ''}<span class="hand-hint">${o.thinking !== null ? `${e(s.players[o.thinking].config.name)}が思考中…` : s.phase === 'handEnd' || s.phase === 'matchEnd' ? e(s.message) : canDiscard.length ? settings.clickMode === 2 ? '牌を選んでもう一度で打牌' : '牌をクリックして打牌' : o.choices.length ? '操作を選んでください' : '他家の手番'}</span><button class="icon-button" data-ui="sort" aria-label="手牌を整列">${icon('shuffle')}</button></div>
    <div class="your-hand ${!canDiscard.length ? 'inactive-hand' : ''}">${hand.map(t => tileHtml(t, { button: !o.replay, small: false, selected: o.selected === t.id, drawn: t.id === p.drawnId, disabled: !o.replay && settings.autoSort && !canDiscard.some(c => c.action.tiles?.[0] === t.id), draggable: !settings.autoSort && !o.replay, danger: obs ? danger(t.kind, obs) : 0, used: o.highlightedIds?.includes(t.id), winning: t.id === winningId })).join('')}</div>
    <div class="assist-line">${a.shanten ? `<span class="shanten-chip">${sh === -1 ? '和了形' : sh === 0 ? 'テンパイ' : `${sh} 向聴`}</span>` : ''}${eff ? `<span>有効牌 ${eff.count}枚</span><span class="mini-tiles">${eff.kinds.map(kindTile).join('')}</span>` : ''}</div>${report?.tiles.length ? waitsView(report, p.riichi ? 'リーチ中の待ち' : report.afterDiscard ? `${selectedAnalysis ? '選択牌' : '打牌候補'}を切った後の待ち` : 'テンパイの待ち') : ''}
    <div class="action-bar">${!o.replay && o.selected !== null && canDiscard.some(c => c.action.tiles?.[0] === o.selected) ? '<button class="action-button gold discard-selected" data-ui="discard-selected">選択牌を打牌</button>' : ''}${!o.replay && (s.phase === 'handEnd' || s.phase === 'matchEnd') ? '<button class="primary" data-ui="result">結果を表示</button>' : ''}${actionButtons}${riichi ? '<button class="action-button gold" data-game-action="riichi">リーチ <small>L</small></button>' : ''}${!actionButtons && !riichi ? '<span class="subtle">落ち着いて、一手ずつ。</span>' : ''}</div></div></section>
    <aside class="match-sidebar"><div class="sidebar-heading"><span class="eyebrow">AT THE TABLE</span><h2>対局情報</h2></div><div class="score-list">${order.map((seat, i) => { const q = s.players[seat]; return `<div data-score-seat="${q.seat}" class="score-row ${q.seat === focus ? 'is-you' : ''}"><span class="rank-badge rank-${i + 1}">${i + 1}位</span><div><strong>${e(q.config.name)}</strong><small>${WIND_NAMES[windOf(q.seat, s.dealer, n) - 27]}家 · ${q.config.human ? 'PLAYER' : `Lv.${q.config.level}`}${q.riichi ? ' · 立直' : ''}</small></div><b>${money(q.score)}</b><span class="leader-gap">首位と ${money(s.players[order[0]].score - q.score)}点差</span></div>`; }).join('')}</div><div class="side-section"><label class="field-label">CPUの演出速度</label><div class="segmented compact">${[['fast', '高速'], ['standard', '標準'], ['slow', 'ゆっくり']].map(([v, l]) => `<button data-speed="${v}" class="${settings.speed === v ? 'active' : ''}">${l}</button>`).join('')}</div></div><div class="side-section assist-switches"><span class="field-label">お助け機能</span>${[['autoWin', '自動和了'], ['autoDiscard', '自動ツモ切り'], ['noCalls', '鳴きなし']].map(([k, l]) => `<label><input type="checkbox" data-assist="${k}" ${a[k] ? 'checked' : ''}>${l}</label>`).join('')}<button class="text-button" data-ui="assistance">すべての補助設定 ${icon('arrow')}</button></div><div class="side-section side-menu"><button data-ui="pause">${icon(o.paused ? 'play' : 'pause')}${o.paused ? '再開' : '一時停止'}</button><button data-ui="rankings">現在の順位一覧</button><button data-ui="rules">${icon('book')}現在のルール</button><button data-ui="help">${icon('book')}役・点数・ガイド</button><button data-ui="settings">${icon('settings')}設定</button><button data-ui="home">${icon('back')}ホームへ</button></div><p class="save-indicator">ブラウザに自動保存<span>この対局のルールは固定されています</span></p></aside></div>`;
}
