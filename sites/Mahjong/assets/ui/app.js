import { advanceRound, applyAction, legalActions } from '../core/engine.js';
import { kindName, sortTiles } from '../core/tiles.js';
import { handShanten } from '../core/hand.js';
import { analyzeHand } from '../core/analysis.js';
import { defaultSettings, preset, ruleErrors, validateConfig } from '../core/rules.js';
import { newGame } from '../core/engine.js';
import { observe } from '../ai/observation.js';
import { CpuClient } from '../ai/client.js';
import { Storage, downloadJson } from '../services/storage.js';
import { Recorder, ReplayPlayer } from '../services/replay.js';
import { addStats } from '../services/stats.js';
import { Debugger } from '../debug/debug.js';
import { Animations } from './animation.js';
import { Sound } from './audio.js';
import { escapeHtml as e, icon, modal, selectOptions, toast } from './dom.js';
import { helpView, homeView, resultView, ruleForm, settingsView, setupView, statsView } from './pages.js';
import { tableView } from './table.js';
import { kindTile } from './tiles.js';
import { assignCpuNames } from '../core/names.js';
import { rankingView } from './ranking.js';
import { upgradeEndRules } from '../core/round.js';
import { choicesView } from './choices.js';
export class App {
    root = document.querySelector('#app');
    dialog = document.querySelector('#modal');
    store = new Storage();
    cpu = new CpuClient();
    sound = new Sound();
    animations = new Animations();
    debug = new Debugger();
    settings = defaultSettings();
    stats = { version: 1, entries: [] };
    resume = null;
    replay = null;
    state = null;
    recorder = null;
    playback = null;
    route = 'home';
    draft = structuredClone(this.settings.match);
    spectate = false;
    paused = false;
    generation = 0;
    thinking = null;
    selected = null;
    order = [];
    timer = null;
    replayTimer = null;
    replayPlaying = false;
    replaySpeed = 1;
    reveal = false;
    replayFocus = 0;
    processing = false;
    statsFilter = {};
    helpTab = 'yaku';
    helpFilter = 'all';
    helpQuery = '';
    ruleDraft = null;
    choiceSession = null;
    lastResult = -1;
    dragged = null;
    pointer = null;
    reordered = false;
    replayError = null;
    replayDecision = null;
    async start() {
        try {
            this.settings = this.store.settings();
        }
        catch (error) {
            this.report(error);
        }
        const results = await Promise.allSettled([this.store.get('stats'), this.store.get('resume'), this.store.get('replay'), this.store.get('settings')]);
        if (results[0].status === 'fulfilled')
            this.stats = results[0].value ?? this.stats;
        else
            this.report(results[0].reason);
        if (results[1].status === 'fulfilled')
            this.resume = results[1].value;
        else
            this.report(results[1].reason);
        if (results[2].status === 'fulfilled')
            this.replay = results[2].value;
        else
            this.report(results[2].reason);
        if (results[3].status === 'fulfilled' && results[3].value)
            this.settings = results[3].value;
        else if (results[3].status === 'rejected')
            this.report(results[3].reason);
        this.draft = structuredClone(this.settings.match);
        this.applyPreferences();
        this.bind();
        this.render();
        this.debug.attach({ state: () => this.state, pause: () => this.setPaused(true), load: s => { this.stop(); this.state = s; this.resume = null; this.recorder = new Recorder(s); this.route = 'game'; this.lastResult = -1; this.render(); } });
        window.addEventListener('error', ev => this.debug.error(ev.error ?? ev.message));
        window.addEventListener('unhandledrejection', ev => this.report(ev.reason));
    }
    report(error) { this.debug.error(error); toast(error instanceof Error ? error.message : String(error)); }
    applyPreferences() { document.documentElement.dataset.theme = this.settings.theme; document.documentElement.dataset.tiles = this.settings.tileStyle; document.documentElement.dataset.animation = this.settings.animation; }
    saveSettings() { try {
        this.store.saveSettings(this.settings);
        void this.store.write({ settings: this.settings }).catch(e => this.report(e));
    }
    catch (error) {
        this.report(error);
    } this.applyPreferences(); }
    stop() { this.generation++; if (this.timer)
        clearTimeout(this.timer); this.timer = null; this.cpu.cancel(); this.thinking = null; this.stopReplay(); }
    stopReplay() { if (this.replayTimer)
        clearTimeout(this.replayTimer); this.replayTimer = null; this.replayPlaying = false; }
    focus() { return this.state?.players.findIndex(p => p.config.human) ?? 0; }
    actualFocus() { return Math.max(0, this.focus()); }
    choices() { return this.state ? legalActions(this.state, this.actualFocus()) : []; }
    shell(content) {
        return `<header class="app-header"><button class="brand" data-route="home" aria-label="和 NAGOMI ホーム"><span class="brand-mark">和</span><span>NAGOMI<small>RIICHI MAHJONG</small></span></button><nav class="desktop-nav" aria-label="メイン"><button class="${this.route === 'home' ? 'active' : ''}" data-route="home">ホーム</button><button class="${this.route === 'game' ? 'active' : ''}" data-route="${this.state ? 'game' : 'setup'}">対局</button><button class="${this.route === 'replay' ? 'active' : ''}" data-route="replay">牌譜</button><button class="${this.route === 'stats' ? 'active' : ''}" data-route="stats">統計</button><button data-route="help">ルール</button></nav><div class="header-tools"><span class="local-badge"><i></i> LOCAL PLAY</span><button class="icon-button" data-ui="settings" aria-label="設定">${icon('settings')}</button><button class="icon-button mobile-menu" data-ui="menu" aria-label="メニュー">${icon('menu')}</button></div></header>${content}${this.debug.enabled ? '<button class="debug-trigger" data-ui="debug">開発者モード</button>' : ''}`;
    }
    render() {
        let content = '';
        if (this.route === 'home')
            content = homeView(this.resume?.state ?? null, this.stats, !!this.replay);
        if (this.route === 'setup')
            content = setupView(this.draft, this.spectate);
        if (this.route === 'stats')
            content = statsView(this.stats, this.statsFilter);
        if (this.route === 'game' && this.state)
            content = tableView(this.state, this.settings, { focus: this.actualFocus(), selected: this.selected, choices: this.state.players[this.actualFocus()].config.human ? this.choices() : [], paused: this.paused, thinking: this.thinking, order: this.order, highlightedIds: this.choiceSession?.choices[this.choiceSession.selected].action.tiles });
        if (this.route === 'replay')
            content = this.replayView();
        this.root.innerHTML = this.shell(content);
    }
    async navigate(where) {
        if (this.route === 'game' && where !== 'game' && this.state) {
            if (where === 'home' && this.settings.confirm.exit && !window.confirm('現在の対局を保存してホームへ戻りますか？'))
                return;
            this.setPaused(true);
            await this.persist();
        }
        if (where === 'help') {
            this.showHelp();
            return;
        }
        this.dialog.close();
        this.stopReplay();
        if (where === 'setup' || where === 'spectate') {
            this.draft = structuredClone(this.settings.match);
            this.spectate = where === 'spectate';
            if (this.spectate)
                this.draft.seats.forEach(s => s.human = false);
            else if (!this.draft.seats.some(s => s.human)) {
                this.draft.seats[0].human = true;
                this.draft.seats[0].name = 'あなた';
            }
            this.draft.seats = assignCpuNames(this.draft.seats, Math.random, true);
            this.route = 'setup';
        }
        else if (where === 'continue') {
            if (!this.resume) {
                toast('途中の対局はありません');
                return;
            }
            this.stop();
            this.state = structuredClone(this.resume.state);
            this.recorder = new Recorder(this.state, this.resume);
            if (this.state.endRuleVersion !== 2) {
                this.state = upgradeEndRules(this.state);
                this.recorder.add('upgradeEndRules');
                await this.persist();
            }
            this.order = [...(this.resume.handOrder ?? [])];
            this.route = 'game';
            this.paused = false;
            this.lastResult = -1;
        }
        else if (where === 'game') {
            if (!this.state) {
                await this.navigate('setup');
                return;
            }
            this.route = 'game';
            this.paused = false;
        }
        else if (where === 'replay') {
            if (!this.replay) {
                toast('完成済みの牌譜はまだありません');
                return;
            }
            this.setPaused(true);
            this.playback = new ReplayPlayer(this.replay);
            this.replayError = null;
            this.route = 'replay';
        }
        else
            this.route = (['home', 'stats'].includes(where) ? where : 'home');
        this.render();
        if (this.route === 'game') {
            this.animations.resume();
            this.pump();
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
    saveDraft() { try {
        validateConfig(this.draft);
        this.settings.match = structuredClone(this.draft);
        this.saveSettings();
    }
    catch (error) {
        this.report(error);
    } }
    commitRules() { if (!this.ruleDraft)
        return; const c = this.route === 'setup' ? this.draft : this.settings.match; if (ruleErrors(this.ruleDraft, c.players).length)
        return; c.rules = structuredClone(this.ruleDraft); if (this.route === 'setup')
        this.saveDraft();
    else
        this.saveSettings(); }
    configurePlayers(n) {
        const human = Math.max(0, this.draft.seats.findIndex(s => s.human));
        this.draft.players = n;
        this.draft.rules = preset(n);
        while (this.draft.seats.length < n)
            this.draft.seats.push({ name: '田中', human: false, level: 2, personality: 'balanced' });
        this.draft.seats = this.draft.seats.slice(0, n);
        this.draft.seats.forEach((s, i) => s.human = !this.spectate && i === Math.min(human, n - 1));
        this.saveDraft();
    }
    async begin() {
        if (this.resume && this.settings.confirm.reset && !window.confirm('途中の対局を新しい対局で置き換えますか？ 完成済み牌譜は残ります。'))
            return;
        try {
            validateConfig(this.draft);
            this.stop();
            this.state = newGame(this.draft);
            this.recorder = new Recorder(this.state);
            this.settings.match = structuredClone(this.draft);
            this.saveSettings();
            this.paused = false;
            this.route = 'game';
            this.lastResult = -1;
            this.order = [];
            this.selected = null;
            this.render();
            window.scrollTo({ top: 0, behavior: 'instant' });
            await this.persist();
            this.animations.announce('対局開始', this.settings);
            this.pump();
        }
        catch (error) {
            this.report(error);
        }
    }
    async persist() {
        if (!this.state || !this.recorder)
            return;
        if (this.state.phase === 'matchEnd') {
            const replay = this.recorder.finish(this.state), stats = addStats(this.stats, this.state);
            await this.store.write({ resume: null, replay, stats });
            this.stats = stats;
            this.replay = replay;
            this.resume = null;
        }
        else {
            const resume = { ...this.recorder.resume(this.state), handOrder: [...this.order] };
            await this.store.write({ resume });
            this.resume = structuredClone(resume);
        }
    }
    async perform(action, decision) {
        if (!this.state || this.processing || this.paused)
            return;
        this.processing = true;
        if (this.thinking !== null) {
            this.generation++;
            if (this.timer)
                clearTimeout(this.timer);
            this.timer = null;
            this.cpu.cancel();
        }
        this.thinking = null;
        try {
            const previous = this.state;
            const next = action === 'next' ? advanceRound(this.state) : applyAction(this.state, action);
            this.state = next;
            this.recorder.add(action, decision);
            if (decision)
                this.debug.log(next.actionNumber, action === 'next' ? -1 : action.player, decision);
            this.selected = null;
            this.render();
            this.animations.transition(previous, next, action, this.settings);
            const type = action === 'next' ? 'draw' : action.type;
            this.sound.play(type, this.settings);
            if (['chi', 'pon', 'ankan', 'kakan', 'daiminkan', 'riichi', 'ron', 'tsumo', 'nuki'].includes(type))
                this.animations.announce({ chi: 'チー', pon: 'ポン', ankan: 'カン', kakan: 'カン', daiminkan: 'カン', riichi: 'リーチ', ron: 'ロン', tsumo: 'ツモ', nuki: '北抜き' }[type], this.settings);
            if (next.phase === 'handEnd' || next.phase === 'matchEnd')
                this.animations.announce(next.result.reason, this.settings);
            await this.persist();
        }
        catch (error) {
            this.setPaused(true);
            this.report(error);
        }
        finally {
            this.processing = false;
            this.pump();
        }
    }
    setPaused(value) {
        this.paused = value;
        this.generation++;
        if (this.timer)
            clearTimeout(this.timer);
        this.timer = null;
        this.cpu.cancel();
        this.thinking = null;
        if (value)
            this.animations.pause();
        else
            this.animations.resume();
        this.render();
        if (!value)
            this.pump();
    }
    pump() {
        if (this.timer || this.thinking !== null || this.choiceSession !== null || this.processing || this.paused || this.route !== 'game' || !this.state)
            return;
        const s = this.state;
        if (s.phase === 'handEnd' || s.phase === 'matchEnd') {
            if (s.players.every(p => !p.config.human) && s.phase === 'handEnd') {
                this.timer = setTimeout(() => { this.timer = null; void this.perform('next'); }, this.delay() * 2);
                return;
            }
            if (this.lastResult !== s.actionNumber) {
                this.lastResult = s.actionNumber;
                modal('対局結果', resultView(s), true);
            }
            return;
        }
        const who = s.phase === 'discard' ? s.current : s.players.find(p => p.seat !== s.reaction.source && !s.reaction.responses[p.seat])?.seat;
        if (who === undefined)
            return;
        const choices = legalActions(s, who);
        if (!choices.length)
            return;
        const p = s.players[who];
        if (p.config.human) {
            const a = this.settings.assistance, win = choices.find(c => c.action.type === 'ron' || c.action.type === 'tsumo');
            let auto;
            if (a.autoWin && win)
                auto = win.action;
            else if (a.noCalls && s.phase === 'reactions' && !win)
                auto = choices.find(c => c.action.type === 'pass')?.action;
            else if (a.autoDiscard && !win && s.phase === 'discard')
                auto = choices.find(c => c.action.type === 'discard' && c.action.tiles?.[0] === p.drawnId)?.action;
            if (auto)
                this.timer = setTimeout(() => { this.timer = null; void this.perform(auto); }, this.delay());
            return;
        }
        const generation = this.generation, number = s.actionNumber;
        this.thinking = who;
        this.render();
        const start = performance.now();
        void this.cpu.think(observe(s, who)).then(decision => {
            if (generation !== this.generation || this.state?.actionNumber !== number || this.paused)
                return;
            const wait = Math.max(0, this.delay() - (performance.now() - start));
            this.timer = setTimeout(() => { this.timer = null; if (generation === this.generation) {
                this.thinking = null;
                void this.perform(decision.action, decision);
            } }, wait);
        }).catch(error => { if (generation !== this.generation)
            return; this.setPaused(true); this.report(error); });
    }
    delay() { return { fast: 70, standard: 550, slow: 1200 }[this.settings.speed]; }
    confirmAction(action) {
        const key = action.type === 'discard' ? 'discard' : action.type === 'riichi' ? 'riichi' : ['ankan', 'kakan', 'daiminkan'].includes(action.type) ? 'kan' : action.type === 'nuki' ? 'nuki' : null;
        return !key || !this.settings.confirm[key] || window.confirm(`${{ discard: 'この牌を打牌', riichi: 'この牌でリーチを宣言', kan: 'カン', nuki: '北抜き' }[key]}しますか？`);
    }
    requestAction(type) {
        if (!this.state || this.paused || this.processing || !this.state.players[this.actualFocus()].config.human)
            return;
        const candidates = this.choices().filter(c => c.action.type === type);
        if (!candidates.length)
            return;
        if (type === 'pass') {
            void this.perform(candidates[0].action);
            return;
        }
        this.stop();
        this.choiceSession = { choices: candidates, selected: 0, number: this.state.actionNumber };
        this.render();
        this.showChoices();
    }
    showChoices() {
        if (!this.state || !this.choiceSession)
            return;
        const session = this.choiceSession;
        modal(session.choices[0].action.type === 'riichi' ? 'リーチ宣言牌と待ちを比較' : '操作する牌を確認', choicesView(this.state, session.choices, session.selected, this.settings.assistance.waits), true);
    }
    closeChoices() { this.choiceSession = null; this.dialog.close(); this.render(); this.pump(); }
    chooseCandidate(index) {
        if (!this.choiceSession || !this.choiceSession.choices[index])
            return;
        this.choiceSession.selected = index;
        this.render();
        this.showChoices();
    }
    confirmChoice(pass = false) {
        const session = this.choiceSession;
        if (!session || !this.state)
            return;
        if (session.number !== this.state.actionNumber) {
            this.closeChoices();
            toast('局面が変わったため、操作を選び直してください');
            return;
        }
        const action = pass ? this.choices().find(c => c.action.type === 'pass')?.action : session.choices[session.selected].action;
        if (!action || !this.confirmAction(action))
            return;
        this.choiceSession = null;
        this.dialog.close();
        void this.perform(action);
    }
    tileClick(id, force = false) {
        if (this.reordered) {
            this.reordered = false;
            return;
        }
        if (this.route !== 'game' || this.paused || this.processing)
            return;
        const choice = this.choices().find(c => c.action.type === 'discard' && c.action.tiles?.[0] === id);
        if (!choice)
            return;
        if (force || this.settings.clickMode === 1 || this.selected === id) {
            if (this.confirmAction(choice.action))
                void this.perform(choice.action);
        }
        else {
            this.selected = id;
            this.render();
        }
    }
    openSettings(section = 'all') { if (this.route === 'game')
        this.setPaused(true); modal(section === 'all' ? '設定' : 'お助け機能', settingsView(this.settings, section)); }
    showRules(readonly) {
        if (this.route === 'game')
            this.setPaused(true);
        const config = this.route === 'setup' ? this.draft : this.settings.match;
        this.ruleDraft = structuredClone(readonly && this.state ? this.state.config.rules : config.rules);
        modal(readonly ? '現在のルール' : '次の対局のルール', ruleForm(this.ruleDraft, readonly && this.state ? this.state.config.players : config.players, readonly), true);
    }
    showHelp() { if (this.route === 'game')
        this.setPaused(true); modal('ルールとヘルプ', helpView(this.state?.config.rules ?? this.settings.match.rules, this.helpQuery, this.helpFilter, this.helpTab), true); }
    replayView() {
        const player = this.playback;
        if (!player)
            return '<main class="page"><p>牌譜がありません。</p></main>';
        const s = player.state, event = player.replay.events[player.position - 1], decision = this.replayDecision ?? event?.decision;
        const o = observe(s, this.replayFocus), p = s.players[this.replayFocus], eff = analyzeHand(p.hand, p.melds, o.visible.map(n => Math.max(0, 4 - n)), o.available);
        return `<div class="replay-controls"><button data-replay="start" aria-label="最初へ">|◀</button><button data-replay="back" aria-label="一手戻る">◀</button><button class="primary" data-replay="play">${icon(this.replayPlaying ? 'pause' : 'play')}${this.replayPlaying ? '停止' : '再生'}</button><button data-replay="next" aria-label="一手進む">▶</button><button data-replay="end" aria-label="最後へ">▶|</button><input type="range" min="0" max="${player.replay.events.length}" value="${player.position}" data-replay-position aria-label="局面移動"><span>${player.position} / ${player.replay.events.length}</span><select data-replay-speed aria-label="再生速度">${selectOptions([['0.5', '0.5×'], ['1', '1×'], ['2', '2×'], ['4', '4×'], ['8', '8×']], this.replaySpeed)}</select><label><input type="checkbox" data-reveal ${this.reveal ? 'checked' : ''}>全手牌</label><select data-replay-focus aria-label="視点">${selectOptions(s.players.map(p => [String(p.seat), p.config.name]), this.replayFocus)}</select></div>${this.replayError ? `<p class="error-box">${e(this.replayError)}</p>` : ''}${tableView(s, this.settings, { focus: this.replayFocus, selected: null, choices: [], paused: false, thinking: null, replay: true, reveal: this.reveal, decision })}<section class="replay-analysis page"><div class="stats-grid"><div class="panel"><h2>局面分析</h2><p>${e(p.config.name)} · ${handShanten(p.hand, p.melds)}向聴 · 受け入れ${eff.count}枚</p><div class="mini-tiles">${eff.kinds.map(kindTile).join('')}</div><p class="subtle">14枚形の受け入れは最良候補を打牌した後の値です。</p><button data-ui="analyze">この局面の合法手を分析</button>${this.reveal ? `<details><summary>全員のシャンテン</summary>${s.players.map(q => `<p>${e(q.config.name)}：${handShanten(q.hand, q.melds)}向聴</p>`).join('')}</details>` : ''}${decision ? `<p>${e(decision.explanation)}</p><small>思考 ${Math.round(decision.elapsed)}ms</small><div class="table-scroll"><table><thead><tr><th>候補</th><th>評価</th><th>向聴</th><th>受入</th><th>危険</th><th>推定和了</th></tr></thead><tbody>${decision.candidates.slice(0, 12).map(c => `<tr><td>${e(c.action.type)} ${c.action.tiles?.map(id => kindName(Math.floor(id / 4))).join(' ') ?? ''}</td><td>${c.score.toFixed(1)}</td><td>${c.shanten}</td><td>${c.ukeire}</td><td>${(c.risk * 100).toFixed(1)}%</td><td>${(c.winProbability * 100).toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>` : '<p class="subtle">CPUの行動直後に判断内容を表示します。</p>'}</div><div class="panel"><h2>打牌・鳴き・和了履歴</h2><select data-replay-hand aria-label="局の先頭へ"><option value="0">東1局（開始）</option>${player.replay.events.filter(ev => ev.action === 'next').map(ev => `<option value="${ev.index + 1}">次局 / 手数${ev.index + 1}</option>`).join('')}</select><div class="replay-history">${player.replay.events.slice(Math.max(0, player.position - 25), player.position).reverse().map(ev => `<button data-seek="${ev.index + 1}"><span>${ev.index + 1}</span>${ev.action === 'next' ? '次の局' : ev.action === 'upgradeEndRules' ? '終局ルールを更新' : `${e(s.players[ev.action.player].config.name)} · ${e(ev.action.type)} ${ev.action.tiles?.map(id => kindName(Math.floor(id / 4))).join(' ') ?? ''}`}</button>`).join('')}</div></div></div></section>`;
    }
    seek(position) { try {
        this.playback?.seek(position);
        this.replayDecision = null;
        this.replayError = null;
        this.render();
    }
    catch (error) {
        this.stopReplay();
        this.replayError = error instanceof Error ? error.message : String(error);
        this.report(error);
        this.render();
    } }
    playReplay() {
        if (!this.playback)
            return;
        if (this.replayPlaying) {
            this.stopReplay();
            this.render();
            return;
        }
        if (this.playback.position === this.playback.replay.events.length)
            this.seek(0);
        this.replayPlaying = true;
        this.render();
        const tick = () => { if (!this.replayPlaying || !this.playback)
            return; this.seek(this.playback.position + 1); if (this.playback.position >= this.playback.replay.events.length || this.replayError) {
            this.stopReplay();
            this.render();
            return;
        } this.replayTimer = setTimeout(tick, 700 / this.replaySpeed); };
        this.replayTimer = setTimeout(tick, 700 / this.replaySpeed);
    }
    reorder(id, target) { if (this.settings.autoSort || !this.state)
        return; const p = this.state.players[this.actualFocus()]; let ids = this.order.filter(x => p.hand.some(t => t.id === x)); for (const t of p.hand)
        if (!ids.includes(t.id))
            ids.push(t.id); ids = ids.filter(x => x !== id); ids.splice(Math.max(0, ids.indexOf(target)), 0, id); this.order = ids; this.reordered = true; this.render(); void this.persist().catch(error => this.report(error)); }
    async ui(action) {
        if (action === 'pause') {
            if (this.route === 'replay') {
                this.playReplay();
                return;
            }
            this.setPaused(!this.paused);
            return;
        }
        if (action === 'resume') {
            this.dialog.close();
            if (this.state && this.route !== 'replay')
                this.route = 'game';
            this.setPaused(false);
            return;
        }
        if (action === 'settings') {
            this.openSettings();
            return;
        }
        if (action === 'assistance') {
            this.openSettings('assistance');
            return;
        }
        if (action === 'rules') {
            this.showRules(true);
            return;
        }
        if (action === 'edit-rules') {
            this.showRules(false);
            return;
        }
        if (action === 'help') {
            this.showHelp();
            return;
        }
        if (action === 'home' || action === 'finish') {
            await this.navigate('home');
            return;
        }
        if (action === 'next') {
            this.dialog.close();
            if (this.paused)
                this.setPaused(false);
            await this.perform('next');
            return;
        }
        if (action === 'result' && this.state) {
            modal('対局結果', resultView(this.state), true);
            return;
        }
        if (action === 'discard-selected' && this.selected !== null) {
            this.tileClick(this.selected, true);
            return;
        }
        if (action === 'detail') {
            this.settings.detail = !this.settings.detail;
            this.saveSettings();
            this.render();
            return;
        }
        if (action === 'sort') {
            if (this.state) {
                this.order = sortTiles(this.state.players[this.actualFocus()].hand).map(t => t.id);
                this.render();
            }
            return;
        }
        if (action === 'rankings') {
            const state = this.route === 'replay' ? this.playback?.state : this.state;
            if (!state)
                return;
            if (this.route === 'game')
                this.setPaused(true);
            else
                this.stopReplay();
            modal('現在の順位', rankingView(state, this.route === 'replay' ? this.replayFocus : this.actualFocus()));
            return;
        }
        if (action === 'menu') {
            if (this.route === 'game')
                this.setPaused(true);
            modal('メニュー', `<div class="mobile-menu-list">${[['resume', '対局に戻る'], ['home', 'ホーム'], ['rankings', '現在の順位'], ['rules', '現在のルール'], ['help', '役・点数・操作'], ['settings', '設定']].map(([v, l]) => `<button data-ui="${v}">${l}</button>`).join('')}</div>`);
            return;
        }
        if (action === 'analyze' && this.playback) {
            this.stopReplay();
            const position = this.playback.position, o = observe(this.playback.state, this.replayFocus);
            if (!o.choices.length) {
                toast('この席が操作できる局面で分析してください');
                return;
            }
            o.level = 4;
            toast('公開情報から候補を計算しています');
            try {
                const decision = await this.cpu.think(o);
                if (this.playback.position === position) {
                    this.replayDecision = decision;
                    this.render();
                }
            }
            catch (error) {
                this.report(error);
            }
            return;
        }
        if (action === 'debug' && this.debug.enabled) {
            this.setPaused(true);
            const s = this.state;
            modal('開発者モード', `<p>固定シードは次の対局に適用。局面の読み込みは対局を置換し、一時停止します。</p><label>固定シード<input type="number" min="0" max="4294967295" data-debug-seed value="${this.settings.match.seed}"></label><button data-debug-export>現在局面をJSON出力</button><label class="file-button">任意局面を読み込む<input type="file" data-debug-import accept=".json"></label><p>Console: <code>mahjongDebug.inspect()</code> / <code>mahjongDebug.snapshot()</code> / <code>mahjongDebug.load(json)</code></p><pre>${e(JSON.stringify({ phase: s?.phase, legal: s?.players.map(p => legalActions(s, p.seat)), scoring: s?.result?.evaluations, decisions: this.debug.decisions.slice(-3), errors: this.debug.errors.slice(-5) }, null, 2))}</pre>`, true);
        }
    }
    bind() {
        document.addEventListener('pointerdown', () => this.sound.unlock(), { once: true });
        document.addEventListener('click', ev => {
            const target = ev.target.closest('button,[data-route],[data-ui]');
            if (!target || target.hasAttribute('disabled'))
                return;
            if (target.dataset.candidate !== undefined) {
                this.chooseCandidate(Number(target.dataset.candidate));
                return;
            }
            if (target.hasAttribute('data-choice-cancel')) {
                this.closeChoices();
                return;
            }
            if (target.hasAttribute('data-choice-pass')) {
                this.confirmChoice(true);
                return;
            }
            if (target.hasAttribute('data-choice-confirm')) {
                this.confirmChoice();
                return;
            }
            if (target.dataset.route) {
                void this.navigate(target.dataset.route).catch(e => this.report(e));
                return;
            }
            if (target.dataset.ui) {
                void this.ui(target.dataset.ui).catch(e => this.report(e));
                return;
            }
            if (target.dataset.players) {
                this.configurePlayers(Number(target.dataset.players));
                this.render();
                return;
            }
            if (target.dataset.format) {
                this.draft.format = target.dataset.format;
                this.saveDraft();
                this.render();
                return;
            }
            if (target.dataset.gameAction) {
                this.requestAction(target.dataset.gameAction);
                return;
            }
            if (target.matches('button[data-tile]')) {
                this.tileClick(Number(target.dataset.tile));
                return;
            }
            if (target.dataset.speed) {
                this.settings.speed = target.dataset.speed;
                this.saveSettings();
                this.render();
                return;
            }
            if (target.dataset.helpTab) {
                this.helpTab = target.dataset.helpTab;
                this.showHelp();
                return;
            }
            if (target.dataset.preset) {
                const n = Number(target.dataset.preset);
                if (this.route === 'setup') {
                    this.configurePlayers(n);
                    this.render();
                    this.ruleDraft = preset(n);
                }
                else if (n !== this.settings.match.players) {
                    toast('人数は対局設定画面で変更してください');
                    return;
                }
                else
                    this.ruleDraft = preset(n);
                this.commitRules();
                modal('次の対局のルール', ruleForm(this.ruleDraft, n), true);
                return;
            }
            if (target.hasAttribute('data-save-rules')) {
                const config = this.route === 'setup' ? this.draft : this.settings.match, errors = ruleErrors(this.ruleDraft, config.players);
                if (errors.length) {
                    this.dialog.querySelector('.rule-errors').textContent = errors.join(' / ');
                    return;
                }
                config.rules = structuredClone(this.ruleDraft);
                if (this.route !== 'setup')
                    this.saveSettings();
                this.dialog.close();
                this.render();
                toast('次の対局のルールを保存しました');
                return;
            }
            if (target.dataset.replay) {
                const a = target.dataset.replay, p = this.playback;
                if (!p)
                    return;
                if (a === 'play')
                    this.playReplay();
                else {
                    this.stopReplay();
                    this.seek(a === 'start' ? 0 : a === 'end' ? p.replay.events.length : p.position + (a === 'back' ? -1 : 1));
                }
                return;
            }
            if (target.dataset.seek) {
                this.stopReplay();
                this.seek(Number(target.dataset.seek));
                return;
            }
            if (target.dataset.export) {
                const keys = target.dataset.export === 'all' ? ['settings', 'stats', 'resume', 'replay'] : [target.dataset.export];
                void this.store.export(keys, this.settings).then(text => downloadJson(text, `nagomi-${target.dataset.export}-${new Date().toISOString().slice(0, 10)}.json`)).catch(e => this.report(e));
                return;
            }
            if (target.hasAttribute('data-clear')) {
                if (!this.settings.confirm.delete || window.confirm('設定・途中データ・牌譜・統計をすべて削除しますか？'))
                    void this.store.clear().then(() => { this.stop(); this.state = null; this.resume = null; this.replay = null; this.stats = { version: 1, entries: [] }; this.settings = defaultSettings(); this.applyPreferences(); this.dialog.close(); this.route = 'home'; this.render(); toast('保存データを削除しました'); }).catch(e => this.report(e));
                return;
            }
            if (target.hasAttribute('data-debug-export') && this.debug.enabled && this.state)
                downloadJson(JSON.stringify(this.state, null, 2), 'nagomi-position.json');
        });
        document.addEventListener('submit', ev => { if (ev.target.id === 'setup-form') {
            ev.preventDefault();
            void this.begin();
        } });
        document.addEventListener('change', ev => {
            const el = ev.target;
            if (el.dataset.setting) {
                const path = el.dataset.setting.split('.'), value = el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked : ['volume', 'clickMode'].includes(path[0]) ? Number(el.value) : el.value;
                if (path.length === 2)
                    this.settings[path[0]][path[1]] = value;
                else
                    this.settings[path[0]] = value;
                this.saveSettings();
                this.render();
                return;
            }
            if (el.dataset.assist) {
                this.settings.assistance[el.dataset.assist] = el.checked;
                this.saveSettings();
                this.pump();
                return;
            }
            if (el.dataset.rule && this.ruleDraft) {
                const key = el.dataset.rule;
                let value = el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked : key === 'uma' ? el.value.split(',').map(s => Number(s.trim())) : el instanceof HTMLInputElement && el.type === 'number' || ['doubleWindFu'].includes(key) ? Number(el.value) : el.value;
                this.ruleDraft[key] = value;
                const config = this.route === 'setup' ? this.draft : this.settings.match;
                this.dialog.querySelector('.rule-errors').textContent = ruleErrors(this.ruleDraft, config.players).join(' / ');
                this.commitRules();
                return;
            }
            if (el.dataset.local && this.ruleDraft) {
                this.ruleDraft.local[el.dataset.local] = el.checked;
                this.commitRules();
                return;
            }
            if (el.id === 'player-seat') {
                this.draft.seats.forEach((s, i) => { s.human = i === Number(el.value); if (s.human)
                    s.name = 'あなた';
                else if (s.name === 'あなた')
                    s.name = ['佐藤', '鈴木', '高橋', '田中'][i]; });
                this.saveDraft();
                this.render();
                return;
            }
            if (el.dataset.seat !== undefined && el.dataset.prop) {
                const seat = this.draft.seats[Number(el.dataset.seat)], key = el.dataset.prop;
                seat[key] = key === 'level' ? Number(el.value) : el.value;
                this.saveDraft();
                return;
            }
            if (el.dataset.batch && el.value) {
                this.draft.seats.forEach(s => { if (!s.human)
                    s[el.dataset.batch] = el.dataset.batch === 'level' ? Number(el.value) : el.value; });
                this.saveDraft();
                this.render();
                return;
            }
            if (el.dataset.stats) {
                this.statsFilter[el.dataset.stats] = !el.value ? undefined : ['level', 'players'].includes(el.dataset.stats) ? Number(el.value) : el.value;
                this.render();
                return;
            }
            if (el.hasAttribute('data-replay-position') || el.hasAttribute('data-replay-hand')) {
                this.stopReplay();
                this.seek(Number(el.value));
                return;
            }
            if (el.hasAttribute('data-replay-speed')) {
                this.replaySpeed = Number(el.value);
                return;
            }
            if (el.hasAttribute('data-reveal')) {
                this.reveal = el.checked;
                this.render();
                return;
            }
            if (el.hasAttribute('data-replay-focus')) {
                this.replayFocus = Number(el.value);
                this.render();
                return;
            }
            if (el.id === 'yaku-filter') {
                this.helpFilter = el.value;
                this.showHelp();
                return;
            }
            if (el.hasAttribute('data-import')) {
                const file = el.files?.[0];
                if (file)
                    void file.text().then(text => { if (!window.confirm('JSONに含まれる種別のデータを置換しますか？'))
                        return; return this.store.import(text).then(data => { this.stop(); this.state = null; this.recorder = null; if (data.settings)
                        this.settings = data.settings; if (data.stats)
                        this.stats = data.stats; if ('resume' in data)
                        this.resume = data.resume ?? null; if ('replay' in data)
                        this.replay = data.replay ?? null; this.route = 'home'; this.applyPreferences(); this.dialog.close(); this.render(); toast('バックアップを読み込みました'); }); }).catch(e => this.report(e));
                return;
            }
            if (el.hasAttribute('data-debug-seed') && this.debug.enabled) {
                const seed = Number(el.value);
                if (Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff) {
                    this.settings.match.seed = seed;
                    this.draft.seed = seed;
                    this.saveSettings();
                }
                else
                    toast('シードの範囲が不正です');
                return;
            }
            if (el.hasAttribute('data-debug-import') && this.debug.enabled) {
                const file = el.files?.[0];
                if (file)
                    void file.text().then(text => { window.mahjongDebug.load(text); this.dialog.close(); }).catch(e => this.report(e));
            }
        });
        document.addEventListener('input', ev => { const el = ev.target; if (el.id === 'yaku-search') {
            if (ev instanceof InputEvent && ev.isComposing)
                return;
            this.helpQuery = el.value;
            const position = el.selectionStart;
            this.showHelp();
            const input = this.dialog.querySelector('#yaku-search');
            input.focus();
            if (position !== null)
                input.setSelectionRange(position, position);
        } });
        document.addEventListener('keydown', ev => this.keyboard(ev));
        this.root.addEventListener('dragstart', ev => { const t = ev.target.closest('button[data-tile]'); if (t && !this.settings.autoSort) {
            this.dragged = Number(t.dataset.tile);
            ev.dataTransfer?.setData('text/plain', String(this.dragged));
        } });
        this.root.addEventListener('dragover', ev => { if (this.dragged !== null)
            ev.preventDefault(); });
        this.root.addEventListener('drop', ev => { const t = ev.target.closest('button[data-tile]'); if (t && this.dragged !== null) {
            ev.preventDefault();
            this.reorder(this.dragged, Number(t.dataset.tile));
        } this.dragged = null; });
        this.root.addEventListener('pointerdown', ev => { const t = ev.target.closest('button[data-tile]'); if (t && ev.pointerType === 'touch' && !this.settings.autoSort)
            this.pointer = { id: Number(t.dataset.tile), x: ev.clientX, y: ev.clientY, at: performance.now() }; });
        this.root.addEventListener('pointercancel', () => { this.pointer = null; });
        this.root.addEventListener('pointerup', ev => { const p = this.pointer; this.pointer = null; if (!p || performance.now() - p.at < 280 || Math.abs(ev.clientX - p.x) < 12)
            return; const target = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('button[data-tile]'); if (target) {
            this.reorder(p.id, Number(target.dataset.tile));
        } });
        this.dialog.addEventListener('close', () => { if (this.choiceSession) {
            this.choiceSession = null;
            this.render();
            this.pump();
        } });
        this.dialog.addEventListener('cancel', ev => { if (this.route === 'game') {
            ev.preventDefault();
            this.dialog.close();
        } });
        document.addEventListener('visibilitychange', () => { if (document.hidden && this.route === 'game') {
            this.setPaused(true);
            void this.persist().catch(e => this.report(e));
        } });
        window.addEventListener('pagehide', () => { if (this.state)
            void this.persist().catch(e => this.debug.error(e)); });
    }
    keyboard(ev) {
        if (ev.target.matches('input,select,textarea') || this.dialog.open || this.route !== 'game' || !this.state)
            return;
        if (ev.code === 'Space') {
            ev.preventDefault();
            this.setPaused(!this.paused);
            return;
        }
        if (this.paused)
            return;
        if (ev.key === 'Escape') {
            ev.preventDefault();
            if (this.choices().some(c => c.action.type === 'pass'))
                this.requestAction('pass');
            else
                this.setPaused(true);
            return;
        }
        const hand = this.settings.autoSort ? sortTiles(this.state.players[this.actualFocus()].hand.filter(t => t.id !== this.state.players[this.actualFocus()].drawnId)) : this.state.players[this.actualFocus()].hand.slice().sort((a, b) => this.order.indexOf(a.id) - this.order.indexOf(b.id));
        const drawn = this.state.players[this.actualFocus()].hand.find(t => t.id === this.state.players[this.actualFocus()].drawnId);
        if (this.settings.autoSort && drawn)
            hand.push(drawn);
        if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
            ev.preventDefault();
            const at = hand.findIndex(t => t.id === this.selected), index = (Math.max(0, at) + (ev.key === 'ArrowRight' ? 1 : -1) + hand.length) % hand.length;
            if (ev.altKey && !this.settings.autoSort && at >= 0) {
                const ids = hand.map(t => t.id);
                [ids[at], ids[index]] = [ids[index], ids[at]];
                this.order = ids;
                void this.persist().catch(error => this.report(error));
            }
            else
                this.selected = hand[index]?.id ?? null;
            this.render();
            return;
        }
        if (ev.key === 'Enter' && this.selected !== null) {
            ev.preventDefault();
            this.tileClick(this.selected, true);
            return;
        }
        const action = { l: 'riichi', r: 'ron', t: 'tsumo', p: 'pon', c: 'chi', k: this.choices().find(c => ['ankan', 'kakan', 'daiminkan'].includes(c.action.type))?.action.type, n: 'nuki' }[ev.key.toLowerCase()];
        if (action) {
            ev.preventDefault();
            this.requestAction(action);
            return;
        }
        if (ev.key === '9' && this.choices().some(c => c.action.type === 'nine')) {
            ev.preventDefault();
            this.requestAction('nine');
            return;
        }
        const at = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace', 'd'].indexOf(ev.key);
        if (at >= 0 && hand[at]) {
            ev.preventDefault();
            this.tileClick(hand[at].id);
        }
    }
}
