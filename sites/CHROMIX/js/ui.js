import { COLORS, SPECIALS, defaultSettings, validateSettings, applyPreset, exportSettings, importSettings } from './settings.js';
import { createGame, transition } from './gameEngine.js';
import { canPlay, canPlayGroup, ruleContext } from './rules.js';
import { cardLabel } from './cards.js';
import { createCpuView, chooseMove } from './cpu.js';
import { loadSettings, saveSettings, loadGame, saveGame } from './storage.js';
import { playSound } from './audio.js';
import { animateAction } from './animations.js';
const app = document.querySelector('#app');
const loaded = loadGame();
let settings = loadSettings() ?? defaultSettings();
let game = loaded.state;
let screen = 'setup', tab = 'players', modal = null, paused = false, privacyGate = false;
let cpuTimer = null, turnTimer = null, countdownTimer = null, toastTimer = null, deadline = null, deadlineKey = null;
let saveErrorShown = false;
let lastFocus = null;
let inputBlockedUntil = 0;
let batchSelection = null, batchTurn = null;
const scrollTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
function timerHTML() { return `<span class="timer" role="timer" aria-label="残り時間">${icon('clock')} <b id="timer-value"></b>s</span>`; }
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icons = {
  cards: '<rect x="4" y="5" width="12" height="16" rx="2" transform="rotate(-12 10 13)"/><rect x="9" y="3" width="12" height="16" rx="2" transform="rotate(10 15 11)"/>',
  arrow: '<path d="M5 12h14m-5-5 5 5-5 5"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20 15A8.5 8.5 0 0 1 9 4a8.5 8.5 0 1 0 11 11Z"/>',
  volume: '<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="15" cy="17" r="3"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m9 5 11 7-11 7V5Z"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m3 10v-3a6 6 0 0 0-3-5"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  back: '<path d="M19 12H5m5-5-5 5 5 5"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? icons.cards}</svg>`;
const difficultyName = { easy: '弱い', normal: '普通', hard: '強い' };
function toast(message) {
  const node = document.querySelector('#toast'); node.textContent = message; node.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.remove('visible'), 4000);
}
function persist() {
  if (game && !saveGame(game) && !saveErrorShown) { saveErrorShown = true; toast('対戦を保存できません。ブラウザの保存容量・プライバシー設定をご確認ください。'); }
}
function saveConfig() {
  if (!saveSettings(settings) && !saveErrorShown) { saveErrorShown = true; toast('設定を保存できません。この画面では引き続き遊べます。'); }
}
function setAppearance() {
  document.documentElement.dataset.theme = settings.appearance.theme;
  document.documentElement.dataset.motion = settings.appearance.animations ? 'on' : 'off';
  document.querySelector('meta[name="theme-color"]').content = settings.appearance.theme === 'dark' ? '#191d22' : '#f6f5f1';
}
function header() {
  return `<header class="header"><a class="brand" href="#" data-action="home" aria-label="CHROMIX ホーム"><span class="brand-icon">${icon('cards')}</span><span>CHROMIX<span class="brand-dot">.</span></span></a>
    <nav class="header-nav" aria-label="メイン"><button class="nav-link ${screen === 'setup' ? 'active' : ''}" data-action="home">${icon('cards')}<span>プレイ</span></button><button class="nav-link" data-action="help">${icon('help')}<span>遊び方</span></button></nav>
    <div class="header-actions"><span class="local-badge"><i></i> LOCAL PLAY</span><button class="icon-button" data-action="sound" aria-label="効果音を${settings.appearance.sound ? 'オフ' : 'オン'}" aria-pressed="${settings.appearance.sound}">${icon(settings.appearance.sound ? 'volume' : 'mute')}</button><button class="icon-button" data-action="theme" aria-label="${settings.appearance.theme === 'light' ? 'ダーク' : 'ライト'}モードに切り替え">${icon(settings.appearance.theme === 'light' ? 'moon' : 'sun')}</button></div></header>`;
}
function cardHTML(card, extra = '') {
  const color = COLORS.find(c => c.id === card.color);
  const symbol = card.type === 'number' ? card.value : SPECIALS[card.type].symbol;
  return `<span class="card-face ${color ? `color-${color.id}` : 'color-wild'} ${extra}"><span class="card-corner"><b>${symbol}</b><small>${color?.mark ?? '✳'}</small></span><span class="card-orbit"></span><span class="card-symbol ${String(symbol).length > 1 ? 'wide' : ''}">${symbol}</span><span class="card-bottom-label">${color?.name ?? 'WILD'}</span><span class="card-corner lower"><b>${symbol}</b><small>${color?.mark ?? '✳'}</small></span></span>`;
}
const fakeCard = (value, color, type = 'number') => ({ id: '', type, color, value });
function setupHTML() {
  const deckSize = settings.colorCount * (1 + 2 * settings.maxNumber + ['skip', 'reverse', 'draw2'].filter(t => settings.specials[t]).length * 2) + ['wild', 'draw4', 'swap', 'redraw'].filter(t => settings.specials[t]).length * 4;
  return `<main id="main" class="lobby"><section class="intro"><div class="eyebrow"><span></span> A LITTLE COLOR. A LOT OF STRATEGY.</div><h1>色をつなぐ。<br>駆け引きが、<br class="mobile-break">はじまる<span class="accent">。</span></h1><p class="intro-copy">いつものテーブルに、新しい遊びを。<br>ルールも、仲間も、あなたらしい組み合わせで。</p>
    <div class="hero-art" aria-hidden="true"><span class="art-orbit one"></span><span class="art-orbit two"></span><span class="spark s1">✦</span><span class="spark s2">✧</span><div class="hero-card hero-blue">${cardHTML(fakeCard(4, 'blue'))}</div><div class="hero-card hero-yellow">${cardHTML(fakeCard(2, 'yellow'))}</div><div class="hero-card hero-red">${cardHTML(fakeCard(7, 'red'))}</div><span class="art-tag">YOUR RULES. YOUR GAME.</span></div>
    <div class="feature-row"><span>${icon('users')} 2–4人で対戦</span><span>${icon('shield')} 登録不要・端末内で完結</span></div>
  </section>
  <section class="setup-panel" aria-label="新しいゲームの設定"><div class="panel-heading"><div><div class="eyebrow">LET'S PLAY</div><h2>テーブルをつくろう</h2></div><span class="number-chip">01 / SETUP</span></div>
    <div class="preset-row" role="group" aria-label="ルールプリセット">${[['classic', '◈', 'クラシック', 'おなじみの、心地よさ。'], ['chaos', '✳', 'カオス', '予測できない面白さ。'], ['custom', '⌘', 'カスタム', 'ルールは、あなた次第。']].map(([v, sym, name, desc]) => `<button class="preset ${settings.preset === v ? 'selected' : ''}" data-action="preset" data-value="${v}" aria-pressed="${settings.preset === v}"><span class="preset-symbol">${sym}</span><strong>${name}</strong><small>${desc}</small>${settings.preset === v ? `<span class="preset-check">${icon('check')}</span>` : ''}</button>`).join('')}</div>
    <div class="settings-tabs" role="tablist" aria-label="設定カテゴリー">${[['players', 'プレイヤー'], ['cards', 'カード'], ['rules', 'ルール'], ['display', '表示・音']].map(([v, name]) => `<button id="tab-${v}" role="tab" aria-selected="${tab === v}" aria-controls="settings-content" tabindex="${tab === v ? 0 : -1}" data-action="tab" data-value="${v}">${name}</button>`).join('')}</div>
    <div id="settings-content" class="settings-content" role="tabpanel" aria-labelledby="tab-${tab}">${settingsContent()}</div>
    <div class="setup-footer"><div class="game-summary"><span><i class="color-dots">${COLORS.slice(0, settings.colorCount).map(c => `<i style="background:${c.hex}"></i>`).join('')}</i> ${settings.colorCount}色</span><span>0–${settings.maxNumber}</span><span>${deckSize}枚 / セット</span><span>手札 ${settings.initialHand}枚</span></div><button class="primary start-button" data-action="start"><span>ゲームをはじめる</span>${icon('arrow')}</button>${game ? `<button class="resume-link" data-action="resume">${icon('play')} 保存した${game.phase === 'GAME_OVER' ? '結果を見る' : 'ゲームを再開'} <span>ターン ${game.turn}</span></button>` : '<p class="save-note">設定と対戦は、このブラウザに自動保存されます。</p>'}</div>
  </section></main><footer class="site-footer"><span>MAKE EVERY CARD COUNT.</span><span>CHROMIX / ORIGINAL CARD GAME <b>© 2026</b></span></footer>`;
}
function options(values, value) { return values.map(([v, text]) => `<option value="${v}" ${value === v ? 'selected' : ''}>${text}</option>`).join(''); }
function selectField(name, label, values, current, desc = '') {
  return `<label class="setting-field"><span><strong>${label}</strong>${desc ? `<small>${desc}</small>` : ''}</span><select data-setting="${name}">${options(values, current)}</select></label>`;
}
function numberField(name, label, min, max, current, unit = '', desc = '') {
  return `<label class="setting-field"><span><strong>${label}</strong>${desc ? `<small>${desc}</small>` : ''}</span><span class="number-input"><input type="number" inputmode="numeric" min="${min}" max="${max}" value="${current}" data-setting="${name}" aria-label="${label}">${unit ? `<span>${unit}</span>` : ''}</span></label>`;
}
function toggle(name, label, current, desc = '') {
  return `<label class="setting-field"><span><strong>${label}</strong>${desc ? `<small>${desc}</small>` : ''}</span><span class="switch"><input type="checkbox" data-setting="${name}" ${current ? 'checked' : ''}><span></span></span></label>`;
}
function settingsContent() {
  if (tab === 'players') return `<div class="section-label"><span>プレイヤー <b>${settings.players.length}</b></span><div class="stepper"><button data-action="count" data-delta="-1" aria-label="人数を減らす" ${settings.players.length <= 2 ? 'disabled' : ''}>−</button><span>${settings.players.length}人</span><button data-action="count" data-delta="1" aria-label="人数を増やす" ${settings.players.length >= 4 ? 'disabled' : ''}>＋</button></div></div><div class="player-list">${settings.players.map((p, i) => `<div class="player-row"><span class="avatar avatar-${i}">${String(i + 1).padStart(2, '0')}</span><div class="player-name"><label for="name-${i}">PLAYER ${String(i + 1).padStart(2, '0')}</label><input id="name-${i}" maxlength="24" value="${esc(p.name)}" placeholder="プレイヤー${i + 1}" data-player="${i}" data-key="name" aria-label="プレイヤー${i + 1}の名前"></div><div class="player-options"><select data-player="${i}" data-key="type" aria-label="プレイヤー${i + 1}の種別">${options([['human', '人間'], ['cpu', 'CPU']], p.type)}</select>${p.type === 'cpu' ? `<select class="difficulty-select" data-player="${i}" data-key="difficulty" aria-label="プレイヤー${i + 1}の難易度">${options([['easy', '弱い'], ['normal', '普通'], ['hard', '強い']], p.difficulty)}</select>` : '<span class="human-label">YOU / LOCAL</span>'}</div><div class="seat-move"><button data-action="seat" data-index="${i}" data-delta="-1" ${i === 0 ? 'disabled' : ''} aria-label="${esc(p.name)}の席を前へ">↑</button><button data-action="seat" data-index="${i}" data-delta="1" ${i === settings.players.length - 1 ? 'disabled' : ''} aria-label="${esc(p.name)}の席を後ろへ">↓</button></div></div>`).join('')}</div><div class="hint">${icon('users')} 上から順に着席します。人間同士は端末を渡して対戦。</div>`;
  if (tab === 'cards') return `<div class="settings-group">${numberField('colorCount', 'カードの色数', 2, 8, settings.colorCount, '色')}${numberField('maxNumber', '数字の最大値', 0, 20, settings.maxNumber, '', '0から指定した数字まで')}${numberField('initialHand', '最初の手札', 1, 20, settings.initialHand, '枚')}</div><div class="section-label small">特殊カード <span>OFFにすると山札から除外</span></div><div class="special-grid">${Object.entries(SPECIALS).map(([k, v]) => `<label class="special-toggle"><span class="special-symbol ${settings.specials[k] ? 'enabled' : ''}">${v.symbol}</span><span><strong>${v.name}</strong><small>${v.description}</small></span><input type="checkbox" data-setting="specials.${k}" ${settings.specials[k] ? 'checked' : ''} aria-label="${v.name}を有効にする"></label>`).join('')}</div>`;
  if (tab === 'rules') return `<div class="settings-group">${selectField('reverseTwo', '2人対戦のリバース', [['skip', '相手をスキップ'], ['normal', '方向反転のみ']], settings.reverseTwo)}${toggle('specialFinish', '特殊カードでの上がり', settings.specialFinish)}${selectField('unoMode', 'UNOの宣言忘れ', [['auto', '自動で +5枚'], ['call', '指摘されたら +5枚']], settings.unoMode)}${selectField('targetMode', '入れ替え・引き直しの相手', [['next', '次のプレイヤー'], ['choose', '対戦相手から選択']], settings.targetMode)}${toggle('timerEnabled', '人間の制限時間', settings.timerEnabled, '時間切れはドローして終了。選択中は自動選択。')}${settings.timerEnabled ? numberField('turnSeconds', '制限時間', 5, 180, settings.turnSeconds, '秒') : ''}</div><p class="hint">${icon('cards')} +2と+4は、色に関係なく自由に重ねられます。</p>`;
  return `<div class="settings-group">${selectField('appearance.theme', 'カラーテーマ', [['light', 'ライト'], ['dark', 'ダーク']], settings.appearance.theme)}${toggle('appearance.animations', 'アニメーション', settings.appearance.animations, 'OSの「動きを減らす」設定も反映します')}${toggle('appearance.sound', '効果音', settings.appearance.sound)}<label class="setting-field"><strong>音量</strong><span class="volume-control"><input type="range" min="0" max="100" step="1" value="${settings.appearance.volume}" data-setting="appearance.volume" aria-label="音量"><output>${settings.appearance.volume}%</output></span></label></div><div class="sharing"><div><strong>ルールを持ち寄ろう。</strong><p>設定をJSONファイルで保存・共有できます。</p></div><div><button class="secondary" data-action="export">${icon('download')} 書き出す</button><button class="secondary" data-action="import">${icon('upload')} 読み込む</button></div></div>`;
}
function seatHTML(p, i) {
  return `<div class="seat ${game.current === i ? 'is-current' : ''}" ${game.current === i ? 'aria-current="true"' : ''}><div class="seat-heading"><span class="avatar avatar-${i}">${String(i + 1).padStart(2, '0')}</span><span class="seat-name"><strong>${esc(p.name)}</strong><small>${p.type === 'cpu' ? `CPU · ${difficultyName[p.difficulty]}` : 'HUMAN'}</small></span><span class="seat-count">${p.hand.length}<small>枚</small></span></div><div class="seat-backs" aria-hidden="true">${Array.from({ length: Math.min(7, p.hand.length) }, (_, j) => `<i style="--i:${j}"><span>c.</span></i>`).join('')}</div>${p.hand.length === 1 ? '<span class="uno-badge">LAST CARD</span>' : ''}${game.current === i ? '<span class="turn-dot">● TURN</span>' : ''}</div>`;
}
function isPrivate() {
  return paused || privacyGate || game.phase === 'HANDOFF' || game.players[game.current].type === 'cpu' || game.phase === 'GAME_OVER';
}
function selectedBatch() {
  return (batchSelection ?? []).map(id => game.players[game.current].hand.find(c => c.id === id)).filter(Boolean);
}
function batchCardHTML(c, i, humanCanAct) {
  const selecting = batchSelection !== null, selected = selectedBatch();
  const order = batchSelection?.indexOf(c.id) ?? -1;
  const legal = humanCanAct && (selecting
    ? c.type === 'number' && (order >= 0 || (selected.length ? c.value === selected[0].value : canPlay(c, ruleContext(game))))
    : canPlay(c, ruleContext(game)));
  return `<button class="hand-card ${legal ? 'playable' : 'unplayable'} ${c.id === game.drawnId ? 'just-drawn' : ''} ${order >= 0 ? 'batch-selected' : ''}" style="--card-index:${i}" data-action="${selecting ? 'batch-card' : 'play'}" data-id="${c.id}" ${selecting ? `aria-pressed="${order >= 0}"` : ''} aria-label="${esc(cardLabel(c))}${selecting ? order >= 0 ? `：選択${order + 1}枚目` : legal ? '：まとめ出しに選択可能' : '：選択不可' : legal ? '：プレイ可能' : '：プレイ不可'}" ${legal ? '' : 'disabled'}>${cardHTML(c)}${order >= 0 ? `<span class="batch-order">${order + 1}</span>` : legal ? '<span class="playable-dot"></span>' : ''}</button>`;
}
function batchControlsHTML(enabled) {
  if (!enabled) return '';
  if (batchSelection === null) return '';
  const selected = selectedBatch(), valid = canPlayGroup(selected, ruleContext(game));
  const lastColor = COLORS.find(c => c.id === selected.at(-1)?.color);
  return `<div class="batch-toolbar selecting"><div class="batch-summary" role="status"><strong>${selected.length}枚を選択</strong><span>${selected.length ? `数字 ${selected[0].value} / 最後の色：${lastColor.name}` : '最初に、通常ルールで出せる数字を選択'}</span><small>タップした順に出します。選択済みカードをタップすると末尾まで解除。</small></div><div class="batch-actions"><button class="secondary" data-action="batch-cancel">取消</button><button class="primary" data-action="batch-play" ${valid ? '' : 'disabled'}>${selected.length}枚を出す</button></div></div>`;
}
function gameHTML() {
  const p = game.players[game.current], privateHand = isPrivate();
  const top = game.discard.at(-1), color = COLORS.find(c => c.id === game.currentColor);
  const latest = game.logs.at(-1);
  const tableNote = ['skip', 'reverse', 'swap', 'redraw', 'uno'].includes(latest?.kind) ? latest.text : '色・数字・記号をつなげよう';
  const humanCanAct = !privateHand && game.phase === 'ACTION';
  const batchAvailable = humanCanAct && !game.penalty && !game.drawnId;
  const selected = selectedBatch();
  const unoNeeded = humanCanAct && !p.uno && (p.hand.length === 2 || (canPlayGroup(selected, ruleContext(game)) && p.hand.length - selected.length === 1));
  return `<main id="main" class="game-layout"><section class="play-area"><div class="game-topline"><div><span class="eyebrow">THE TABLE</span><h1>${game.phase === 'GAME_OVER' ? 'ゲーム終了' : `${esc(p.name)}のターン`} ${p.type === 'cpu' && game.phase !== 'GAME_OVER' ? '<span class="thinking"><i></i><i></i><i></i></span>' : ''}</h1></div><div class="game-top-actions"><span class="turn-number">TURN ${String(game.turn).padStart(2, '0')}</span><button class="icon-button" data-action="pause" aria-label="ゲームを一時停止">${icon('pause')}</button></div></div>
  <div class="card-table"><div class="table-ellipse"></div><div class="seats">${game.players.map(seatHTML).join('')}</div><div class="table-center"><div class="direction-label"><span>${game.direction === 1 ? '↻' : '↺'}</span> ${game.direction === 1 ? '時計回り' : '反時計回り'}</div><div class="piles"><div class="pile-wrap"><button class="draw-pile" data-action="draw" ${humanCanAct && !game.drawnId ? '' : 'disabled'} aria-label="${game.penalty ? `${game.penalty}枚のペナルティを引く` : 'カードを1枚引く'}"><span class="deck-shadow"></span><span class="deck-back"><span class="back-logo">c<span>.</span></span><small>CHROMIX</small></span></button><span class="pile-label">DRAW PILE <span>∞</span></span></div><div class="table-flow">${icon('arrow')}</div><div class="pile-wrap"><div class="discard-card" role="img" aria-label="場札：${esc(cardLabel(top))}">${cardHTML(top)}</div><span class="pile-label">DISCARD</span></div></div><div class="table-status"><span class="current-color" style="--active-color:${color.hex}"><i>${color.mark}</i> ${color.name}</span>${game.penalty ? `<span class="penalty-badge">連鎖中 +${game.penalty}</span>` : `<span class="match-note" role="status">${esc(tableNote)}</span>`}</div></div><span class="table-watermark">CHROMIX</span></div>
  <section class="hand-section" aria-label="現在のプレイヤーの手札"><div class="hand-top"><div class="hand-title"><span class="tiny-line"></span><h2>${privateHand ? 'PRIVATE HAND' : `${esc(p.name)}の手札`}</h2><span class="hand-count">${p.hand.length} CARDS</span></div><div class="hand-tools">${batchAvailable && batchSelection === null ? '<button class="batch-start-button" data-action="batch-start">まとめ出し</button>' : ''}${game.settings.timerEnabled && p.type === 'human' && game.phase === 'ACTION' && !privateHand ? timerHTML() : ''}<span class="hand-help">${privateHand ? '非公開のカードは表示しません' : game.drawnId ? '引いたカードを出すか、パス' : '明るいカードをタップしてプレイ'}</span></div></div>
  <div class="hand-scroll" ${privateHand ? '' : 'role="group" aria-label="手札のカード"'}>${privateHand ? `<div class="hidden-hand">${icon('shield')}<span>${p.type === 'cpu' ? 'CPU が考えています' : '手札は保護されています'}</span><small>${p.type === 'cpu' ? '公開情報だけで、次の一手を。' : '準備ができたら、手札を表示してください。'}</small></div>` : p.hand.map((c, i) => batchCardHTML(c, i, humanCanAct)).join('')}</div>
  ${batchControlsHTML(batchAvailable)}
  <div class="game-controls"><div class="control-note">${icon('shield')} この端末だけの、プライベートな対戦。</div><div class="action-buttons"><button class="uno-button ${unoNeeded ? 'uno-needed' : ''} ${p.uno ? 'declared' : ''}" data-action="uno" ${unoNeeded ? '' : 'disabled'}>${p.uno ? '✓ UNO 宣言済み' : 'UNO !'}</button><button class="secondary" data-action="pass" ${humanCanAct && game.drawnId ? '' : 'disabled'}>パス</button><button class="primary" data-action="draw" ${humanCanAct && !game.drawnId ? '' : 'disabled'}>${icon('cards')}${game.penalty ? `+${game.penalty}枚を引く` : '1枚引く'}</button></div></div></section></section>
  <aside class="game-sidebar"><div class="sidebar-heading"><h2>テーブルの記録</h2><span class="live-dot">LIVE</span></div><div class="match-facts"><div><span>RULE SET</span><strong>${{ classic: 'クラシック', chaos: 'カオス', custom: 'カスタム' }[game.settings.preset]}</strong></div><div><span>PLAYERS</span><strong>${game.players.length}人 / ${game.settings.colorCount}色</strong></div></div>${game.callWindow ? `<div class="call-alert"><strong>UNO 未宣言！</strong><p>${esc(game.players[game.callWindow.offender].name)}への指摘は、次のプレイ／ドローまで。</p><button class="secondary" data-action="call" ${['ACTION', 'HANDOFF'].includes(game.phase) && game.players.some((other, i) => other.type === 'human' && i !== game.callWindow.offender) ? '' : 'disabled'}>指摘する · +5枚</button></div>` : ''}<div class="game-log" role="log" aria-label="対戦ログ" aria-live="polite" aria-relevant="additions">${game.logs.slice().reverse().map((l, i) => `<div class="log-entry ${i === 0 ? 'latest' : ''} log-${esc(l.kind)}"><span class="log-marker"></span><div><small>TURN ${String(l.turn).padStart(2, '0')}</small><p>${esc(l.text)}</p></div></div>`).join('')}</div><div class="sidebar-bottom">${icon('check')}<span>進行は自動保存されます</span></div></aside></main>`;
}
function dialogHTML(title, content, cls = '', dismissible = false) {
  return `<div class="overlay ${cls}"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${dismissible ? `<button class="icon-button dialog-close" data-action="close" aria-label="閉じる">${icon('close')}</button>` : ''}<h2 id="dialog-title">${title}</h2>${content}</section></div>`;
}
function overlaysHTML() {
  if (modal === 'help') return dialogHTML('遊び方', `<div class="help-content"><div class="eyebrow">SIMPLE RULES. ENDLESS POSSIBILITIES.</div><p>場札と同じ<strong>色・数字・特殊記号</strong>のカード、またはワイルドカードを出して、手札を最初に0枚にした人が勝利。</p><ol><li><strong>出すか、引くか。</strong>手札をタップしてプレイ。1枚引いた後は、そのカードだけ出せます。出さずにパスも可能。</li><li><strong>同じ数字を、まとめて。</strong>「まとめ出し」で数字カードを選択。先頭の1枚が出せれば、残りは同じ数字で色違いもOK。最後に選んだ色が次の色です。連鎖中・ドロー後はまとめ出しできません。</li><li><strong>あと1枚の、その前に。</strong>残り1枚になる前に UNO ボタンを押してください。まとめ出しで1枚になる場合も同じです。忘れると+5枚。</li><li><strong>ピンチをつなぐ。</strong>+2と+4は色を問わず連鎖。返さなければ累積枚数を引いて終了。</li><li><strong>みんなで1台。</strong>人間が複数いるときは交代画面で端末を渡します。CPUは公開情報と自分の手札だけを使用。</li></ol><div class="help-specials">${Object.entries(SPECIALS).map(([, s]) => `<div><b>${s.symbol}</b><span><strong>${s.name}</strong><small>${s.description}</small></span></div>`).join('')}</div><p class="muted">Tabで移動、Enter / Spaceで選択。D：ドロー、U：UNO、P：パス、Esc：一時停止。各設定は開始した対戦には固定されます。</p></div><button class="primary full" data-action="close">さあ、遊ぼう ${icon('arrow')}</button>`, 'help-overlay', true);
  if (modal === 'replace') return dialogHTML('新しいゲームをはじめますか？', `<p>現在の対戦の自動保存を、新しいゲームで置き換えます。</p><div class="dialog-actions"><button class="secondary" data-action="close">戻る</button><button class="primary" data-action="confirm-start">はじめる ${icon('arrow')}</button></div>`, '', true);
  if (screen !== 'game' || !game) return '';
  const p = game.players[game.current];
  if (paused) return dialogHTML('ひと休み、しよう。', `<div class="pause-illustration">Ⅱ</div><p>対戦は保存されています。<br>準備ができたら、続きをどうぞ。</p><button class="primary full" data-action="unpause">${icon('play')} ゲームに戻る</button><div class="pause-settings">${toggle('appearance.sound', '効果音', settings.appearance.sound)}${selectField('appearance.theme', 'テーマ', [['light', 'ライト'], ['dark', 'ダーク']], settings.appearance.theme)}</div><button class="text-button" data-action="to-setup">設定画面へ戻る</button>`, 'pause-overlay');
  if (game.phase === 'GAME_OVER') return resultHTML();
  if (modal === 'call') return dialogHTML('誰が指摘しますか？', `<p>UNOを忘れた人以外のプレイヤーが指摘できます。</p><div class="target-choices">${game.players.map((other, i) => i === game.callWindow?.offender || other.type !== 'human' ? '' : `<button class="target-choice" data-action="confirm-call" data-index="${i}"><strong>${esc(other.name)}</strong>${icon('arrow')}</button>`).join('')}</div>`, '', true);
  if (game.phase === 'HANDOFF' || privacyGate) return dialogHTML(`${esc(p.name)}の番です`, `<div class="privacy-icon">${icon('shield')}</div><div class="eyebrow">PASS THE DEVICE</div><p>端末を${esc(p.name)}に渡してください。<br>確認するまで、手札は表示されません。</p><button class="primary full" data-action="reveal">OK・手札を表示 ${icon('arrow')}</button><button class="text-button" data-action="pause">一時停止</button>`, 'privacy-overlay');
  if (p.type !== 'human') return '';
  if (game.phase === 'COLOR') return dialogHTML('次の色を選ぼう。', `<p>この色が、次の一手のカギになる。</p><div class="color-choices">${COLORS.slice(0, game.settings.colorCount).map(c => `<button style="--choice:${c.hex}" data-action="color" data-value="${c.id}"><span>${c.mark}</span><strong>${c.name}</strong></button>`).join('')}</div>${game.settings.timerEnabled ? `${timerHTML()}<p class="muted">時間切れはレッドを選択します。</p>` : ''}`, 'selection-overlay');
  if (game.phase === 'TARGET') return dialogHTML('相手を選ぼう。', `<p>${SPECIALS[game.pending.card.type].description}</p><div class="target-choices">${game.players.map((other, i) => i === game.current ? '' : `<button class="target-choice" data-action="target" data-index="${i}"><span class="avatar avatar-${i}">${i + 1}</span><strong>${esc(other.name)}</strong><span>${other.hand.length}枚</span>${icon('arrow')}</button>`).join('')}</div>${game.settings.timerEnabled ? timerHTML() : ''}`, 'selection-overlay');
  return '';
}
function resultHTML() {
  const winner = game.players[game.winner];
  return dialogHTML(`${esc(winner.name)} の勝利！`, `<div class="victory-art" aria-hidden="true"><span>✦</span><b>W</b><span>✧</span></div><div class="eyebrow">WELL PLAYED. WHAT A GAME.</div><p>${game.turn}ターンの駆け引き、おつかれさまでした。</p><div class="results-table"><div class="result-row result-labels"><span>PLAYER</span><span>残り</span><span>プレイ</span><span>ドロー</span><span>UNO</span></div>${game.players.map((p, i) => `<div class="result-row ${i === game.winner ? 'winner-row' : ''}"><strong>${i === game.winner ? '★ ' : ''}${esc(p.name)}</strong><span>${p.hand.length}</span><span>${p.stats.played}</span><span>${p.stats.drawn}</span><span>${p.stats.unoCalls}</span></div>`).join('')}</div><button class="primary full" data-action="rematch">同じ設定でもう一度 ${icon('arrow')}</button><button class="text-button" data-action="to-setup">設定画面へ戻る</button>`, 'result-overlay');
}
function render() {
  setAppearance();
  if (screen !== 'game' || !game || batchTurn !== game.turnToken || isPrivate() || game.phase !== 'ACTION' || game.penalty || game.drawnId) batchSelection = null;
  const focused = document.activeElement;
  const focusInfo = focused && app.contains(focused) ? { id: focused.id, action: focused.dataset.action, value: focused.dataset.value, index: focused.dataset.index, setting: focused.dataset.setting, player: focused.dataset.player, key: focused.dataset.key } : null;
  const oldScroll = app.querySelector('.hand-scroll')?.scrollLeft ?? 0;
  const settingsNode = app.querySelector('.settings-content');
  const settingsScroll = settingsNode?.getAttribute('aria-labelledby') === `tab-${tab}` ? settingsNode.scrollTop : 0;
  app.innerHTML = header() + (screen === 'setup' ? setupHTML() : gameHTML()) + overlaysHTML();
  const hand = app.querySelector('.hand-scroll'); if (hand) hand.scrollLeft = oldScroll;
  const content = app.querySelector('.settings-content'); if (content) content.scrollTop = settingsScroll;
  const overlay = app.querySelector('.overlay');
  app.querySelector('.header').inert = !!overlay;
  app.querySelector('main').inert = !!overlay;
  if (overlay) {
    requestAnimationFrame(() => {
      const target = overlay.querySelector('button:not(:disabled),select,input');
      if (!overlay.contains(document.activeElement)) target?.focus({ preventScroll: true });
    });
  } else if (focusInfo) {
    const candidates = [...app.querySelectorAll('button,a,input,select')];
    const match = candidates.find(el => !el.disabled && (focusInfo.id ? el.id === focusInfo.id : focusInfo.setting ? el.dataset.setting === focusInfo.setting : focusInfo.player !== undefined ? el.dataset.player === focusInfo.player && el.dataset.key === focusInfo.key : focusInfo.action && el.dataset.action === focusInfo.action && el.dataset.value === focusInfo.value && el.dataset.index === focusInfo.index));
    match?.focus({ preventScroll: true });
  }
  syncTimers(); updateCountdown();
}
function stopTimers() { clearTimeout(cpuTimer); clearTimeout(turnTimer); clearInterval(countdownTimer); cpuTimer = turnTimer = countdownTimer = null; }
function timerEligible() { return screen === 'game' && game && !paused && !privacyGate && !modal && !document.hidden && !['HANDOFF', 'GAME_OVER'].includes(game.phase); }
function syncTimers() {
  stopTimers();
  if (!timerEligible()) { deadline = null; deadlineKey = null; return; }
  const p = game.players[game.current], token = game.turnToken, revision = game.revision;
  if (p.type === 'cpu') {
    deadline = null; deadlineKey = null;
    cpuTimer = setTimeout(() => {
      if (!timerEligible() || game.turnToken !== token || game.revision !== revision) return;
      const move = chooseMove(createCpuView(game));
      if (move) act({ ...move, revision, turnToken: token });
    }, 550 + Math.random() * 650);
  } else if (game.settings.timerEnabled) {
    const key = `${token}:${game.phase}`;
    if (deadlineKey !== key || !deadline) { deadlineKey = key; deadline = Date.now() + game.settings.turnSeconds * 1000; }
    turnTimer = setTimeout(() => { if (timerEligible() && game.turnToken === token) act({ type: 'TIMEOUT', turnToken: token }); }, Math.max(0, deadline - Date.now()));
    countdownTimer = setInterval(updateCountdown, 250);
  } else { deadline = null; deadlineKey = null; }
}
function updateCountdown() {
  const el = document.querySelector('#timer-value');
  if (el && deadline) { const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000)); el.textContent = left; el.parentElement.classList.toggle('urgent', left <= 5); }
}
function act(action) {
  if (!game || screen !== 'game' || paused || modal || privacyGate) return;
  const old = game, next = transition(game, { revision: game.revision, ...action });
  if (next === old) return;
  game = next;
  if (!['UNO', 'CALL_UNO'].includes(action.type)) batchSelection = null;
  persist();
  const last = game.logs.at(-1), newLog = last?.id !== old.logs.at(-1)?.id;
  const kind = newLog ? last.kind : 'play';
  playSound(game.phase === 'GAME_OVER' ? 'win' : action.type === 'UNO' ? 'uno' : action.type === 'DRAW' || action.type === 'TIMEOUT' ? 'draw' : ['COLOR', 'TARGET'].includes(action.type) || kind !== 'play' ? 'special' : 'play', settings.appearance);
  render();
  if (newLog) animateAction(app, kind, settings.appearance.animations);
  if (game.drawnId && settings.appearance.animations && !matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(() => app.querySelector('.just-drawn')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }));
}
function startGame(config = settings) {
  if (!config.players.some(p => p.type === 'human')) { toast('人間のプレイヤーを1人以上設定してください。'); return; }
  try { game = createGame(config); modal = null; screen = 'game'; paused = false; privacyGate = false; deadline = null; deadlineKey = null; persist(); render(); scrollTop(); playSound('special', settings.appearance); }
  catch (e) { toast(e.message); }
}
function openModal(name) { lastFocus = document.activeElement; modal = name; render(); }
function closeModal() {
  const previous = lastFocus; modal = null; render();
  const target = previous?.id ? document.getElementById(previous.id) : [...app.querySelectorAll('[data-action]')].find(el => el.dataset.action === previous?.dataset.action && el.dataset.value === previous?.dataset.value && el.dataset.index === previous?.dataset.index);
  target?.focus({ preventScroll: true });
}
app.addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (button.tagName === 'A') event.preventDefault();
  if (action === 'theme' || action === 'sound') {
    if (action === 'theme') settings.appearance.theme = settings.appearance.theme === 'light' ? 'dark' : 'light';
    else settings.appearance.sound = !settings.appearance.sound;
    saveConfig(); render(); return;
  }
  if (action === 'help') { openModal('help'); return; }
  if (action === 'close') { closeModal(); return; }
  if (action === 'home' || action === 'to-setup') { persist(); modal = null; paused = false; screen = 'setup'; deadline = null; render(); scrollTop(); return; }
  if (action === 'tab') { tab = button.dataset.value; render(); document.getElementById(`tab-${tab}`)?.focus(); return; }
  if (action === 'count') {
    const n = settings.players.length + Number(button.dataset.delta);
    if (n < 2 || n > 4) return;
    if (n < settings.players.length) settings.players.pop();
    else settings.players.push({ name: `プレイヤー${n}`, type: 'cpu', difficulty: 'normal' });
    saveConfig(); render(); return;
  }
  if (action === 'seat') {
    const i = Number(button.dataset.index), j = i + Number(button.dataset.delta);
    if (j < 0 || j >= settings.players.length) return;
    [settings.players[i], settings.players[j]] = [settings.players[j], settings.players[i]]; saveConfig(); render(); return;
  }
  if (action === 'preset') {
    settings = applyPreset(settings, button.dataset.value); saveConfig(); render();
    toast(button.dataset.value === 'chaos' ? 'カオス：6色・0〜12・手札9枚・全特殊カードON・対象を自由選択。' : button.dataset.value === 'classic' ? 'クラシック：4色・0〜9・手札7枚。入れ替え／引き直しOFF。ルールを標準に戻しました。' : 'カスタム：いまの設定をベースに自由に変更できます。'); return;
  }
  if (action === 'start') { if (game && game.phase !== 'GAME_OVER') openModal('replace'); else startGame(); return; }
  if (action === 'confirm-start') { startGame(); return; }
  if (action === 'resume') {
    screen = 'game'; paused = false; modal = null;
    privacyGate = game.phase !== 'GAME_OVER' && game.phase !== 'HANDOFF' && game.players[game.current].type === 'human' && game.players.filter(p => p.type === 'human').length > 1;
    render(); scrollTop(); return;
  }
  if (action === 'pause') { paused = true; render(); return; }
  if (action === 'unpause') { paused = false; render(); return; }
  if (action === 'reveal') {
    if (privacyGate) { privacyGate = false; render(); }
    else act({ type: 'REVEAL' });
    return;
  }
  if (action === 'rematch') { startGame({ ...structuredClone(game.settings), appearance: settings.appearance }); return; }
  if (action === 'export') {
    const blob = new Blob([exportSettings(settings)], { type: 'application/json' }), url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'chromix-rules.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('ルール設定を書き出しました。'); return;
  }
  if (action === 'import') {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      const file = input.files[0]; if (!file) return;
      try { if (file.size > 100000) throw new Error('100KB以下の設定ファイルを選んでください。'); const imported = importSettings(await file.text()); settings = imported; saveConfig(); render(); toast('ルール設定を読み込みました。次のゲームに適用します。'); }
      catch (e) { toast(`読み込めませんでした：${e.message}`); }
    }); input.click(); return;
  }
  if (action === 'call') { openModal('call'); return; }
  if (action === 'confirm-call') { modal = null; act({ type: 'CALL_UNO', player: Number(button.dataset.index) }); return; }
  if (screen !== 'game' || game.players[game.current].type !== 'human') return;
  if (action === 'batch-start' && !isPrivate() && game.phase === 'ACTION' && !game.drawnId && !game.penalty) {
    batchSelection = []; batchTurn = game.turnToken; render(); return;
  }
  if (action === 'batch-cancel') { batchSelection = null; render(); return; }
  if (action === 'batch-card' && batchSelection !== null) {
    const id = button.dataset.id, index = batchSelection.indexOf(id);
    if (index >= 0) batchSelection.splice(index);
    else batchSelection.push(id);
    render(); return;
  }
  const actions = { play: { type: 'PLAY', cardId: button.dataset.id }, draw: { type: 'DRAW' }, pass: { type: 'PASS' }, uno: { type: 'UNO', cardIds: batchSelection ?? undefined }, 'batch-play': { type: 'PLAY_MANY', cardIds: batchSelection }, color: { type: 'COLOR', color: button.dataset.value }, target: { type: 'TARGET', target: Number(button.dataset.index) } };
  if (actions[action]) {
    if (performance.now() < inputBlockedUntil) return;
    inputBlockedUntil = performance.now() + 200;
    act(actions[action]);
  }
});
app.addEventListener('change', event => {
  const input = event.target;
  try {
    const next = structuredClone(settings);
    if (input.dataset.player !== undefined) next.players[Number(input.dataset.player)][input.dataset.key] = input.value;
    else if (input.dataset.setting) {
      const parts = input.dataset.setting.split('.'); let node = next;
      for (const key of parts.slice(0, -1)) node = node[key];
      node[parts.at(-1)] = input.type === 'checkbox' ? input.checked : ['number', 'range'].includes(input.type) ? Number(input.value) : input.value;
      if (!input.dataset.setting.startsWith('appearance.')) next.preset = 'custom';
    } else return;
    settings = validateSettings(next); saveConfig(); render();
  } catch (e) { toast(e.message); render(); }
});
app.addEventListener('input', event => {
  const el = event.target;
  if (el.type === 'number' && el.dataset.setting && el.value !== '' && el.validity.valid) {
    const value = Number(el.value);
    if (Number.isInteger(value)) {
      try {
        settings = validateSettings({ ...structuredClone(settings), [el.dataset.setting]: value, preset: 'custom' });
        saveConfig();
        const size = settings.colorCount * (1 + 2 * settings.maxNumber + ['skip', 'reverse', 'draw2'].filter(t => settings.specials[t]).length * 2) + ['wild', 'draw4', 'swap', 'redraw'].filter(t => settings.specials[t]).length * 4;
        app.querySelector('.game-summary').innerHTML = `<span>${settings.colorCount}色</span><span>0–${settings.maxNumber}</span><span>${size}枚 / セット</span><span>手札 ${settings.initialHand}枚</span>`;
        app.querySelectorAll('.preset').forEach(node => { node.classList.toggle('selected', node.dataset.value === 'custom'); node.setAttribute('aria-pressed', String(node.dataset.value === 'custom')); node.querySelector('.preset-check')?.remove(); });
      } catch { /* Intermediate input is validated on blur. */ }
    }
  }
  if (el.dataset.setting === 'appearance.volume') {
    settings.appearance.volume = Number(el.value); el.nextElementSibling.textContent = `${el.value}%`; saveConfig();
  }
  if (el.dataset.key === 'name') { settings.players[Number(el.dataset.player)].name = el.value; saveConfig(); }
});
document.addEventListener('keydown', event => {
  const overlay = app.querySelector('.overlay');
  if (event.key === 'Tab' && overlay) {
    const focusable = [...overlay.querySelectorAll('button:not(:disabled),a[href],input,select,[tabindex="0"]')];
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  if (event.key === 'Escape') {
    if (event.repeat) return;
    if (modal) closeModal();
    else if (screen === 'game') { paused = !paused; render(); }
    return;
  }
  const target = event.target;
  if (target.matches('[role="tab"]') && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault(); const tabs = ['players', 'cards', 'rules', 'display'];
    tab = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : tabs[(tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : 3)) % 4]; render(); document.getElementById(`tab-${tab}`).focus(); return;
  }
  if (target.matches('input,select,textarea,button') || event.ctrlKey || event.metaKey || event.altKey || overlay) return;
  if (screen === 'game' && game.players[game.current].type === 'human') {
    const type = { d: 'DRAW', u: 'UNO', p: 'PASS' }[event.key.toLowerCase()];
    if (type && !event.repeat && performance.now() >= inputBlockedUntil) { event.preventDefault(); inputBlockedUntil = performance.now() + 200; act({ type, ...(type === 'UNO' && batchSelection ? { cardIds: batchSelection } : {}) }); }
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'game' && game.phase !== 'GAME_OVER') { paused = true; persist(); render(); }
});
window.addEventListener('pagehide', persist);
window.addEventListener('storage', e => {
  if (e.key === 'chromix.game.v1' && screen === 'game') { paused = true; render(); toast('別のタブで保存が更新されました。この対戦は一時停止しました。対戦には1つのタブをご利用ください。'); }
});
render();
if (loaded.error) toast(loaded.error);
