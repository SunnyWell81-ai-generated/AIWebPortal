import { legalActions, playerWaits } from '../core/engine.js';
import { handShanten } from '../core/hand.js';
import { contextFor, evaluateWin } from '../core/scoring.js';
import { observe } from '../ai/observation.js';
import { validateState } from '../services/validation.js';
import { analyzeHand } from '../core/analysis.js';
export class Debugger {
    enabled = new URLSearchParams(location.search).get('debug') === '1';
    errors = [];
    decisions = [];
    error(error) { const e = error instanceof Error ? error : new Error(String(error)); this.errors.push({ time: new Date().toISOString(), message: e.message, stack: e.stack }); if (this.errors.length > 200)
        this.errors.shift(); console.error(e); }
    log(number, player, decision) { if (this.enabled) {
        this.decisions.push({ number, player, decision });
        if (this.decisions.length > 500)
            this.decisions.shift();
    } }
    attach(api) {
        if (!this.enabled)
            return;
        Object.defineProperty(window, 'mahjongDebug', { configurable: true, value: {
                snapshot: () => structuredClone(api.state()), load: (json) => { const s = validateState(typeof json === 'string' ? JSON.parse(json) : json); api.pause(); api.load(s); },
                inspect: () => {
                    const s = api.state();
                    if (!s)
                        return null;
                    const hands = s.players.map(p => {
                        const o = observe(s, p.seat), legal = legalActions(s, p.seat), w = playerWaits(s, p.seat), drawn = p.hand.find(t => t.id === p.drawnId);
                        const ron = s.reaction && legal.some(c => c.action.type === 'ron') ? evaluateWin(contextFor(s, p.seat, s.reaction.tile, false)) : null;
                        return { seat: p.seat, hand: p.hand, shanten: handShanten(p.hand, p.melds), waits: w, ukeire: analyzeHand(p.hand, p.melds, o.visible.map(n => Math.max(0, 4 - n)), o.available), tsumo: drawn ? evaluateWin(contextFor(s, p.seat, drawn, true)) : null, ron,
                            waitEvaluation: w.map(kind => { const t = { id: -1, kind, red: false }; return { kind, evaluation: evaluateWin(contextFor(s, p.seat, t, false)) }; }) };
                    });
                    return { state: structuredClone(s), wall: structuredClone(s.wall), legal: s.players.map(p => legalActions(s, p.seat)), hands, scoring: s.result?.evaluations, decisions: this.decisions, errors: this.errors };
                }, errors: this.errors, decisions: this.decisions, pause: api.pause,
            } });
    }
}
