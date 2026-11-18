import { advanceRound, applyAction } from '../core/engine.js';
export class Recorder {
    initial;
    events;
    constructor(state, resume) { this.initial = structuredClone(resume?.initial ?? state); this.events = structuredClone(resume?.events ?? []); }
    add(action, decision) { this.events.push({ index: this.events.length, action: structuredClone(action), ...(decision ? { decision: structuredClone(decision) } : {}), at: Date.now() }); }
    resume(state) { return { version: 1, state, initial: this.initial, events: this.events }; }
    finish(state) { return { version: 1, initial: this.initial, events: this.events, final: state, completedAt: new Date().toISOString() }; }
}
export class ReplayPlayer {
    replay;
    checkpoints = new Map();
    state;
    position = 0;
    constructor(replay) {
        this.replay = replay;
        this.state = structuredClone(replay.initial);
        this.checkpoints.set(0, structuredClone(this.state));
    }
    seek(position) {
        const target = Math.max(0, Math.min(this.replay.events.length, Math.floor(position))), nearest = Math.max(...[...this.checkpoints.keys()].filter(k => k <= target));
        if (target < this.position || nearest > this.position) {
            this.state = structuredClone(this.checkpoints.get(nearest));
            this.position = nearest;
        }
        while (this.position < target) {
            const event = this.replay.events[this.position];
            this.state = event.action === 'next' ? advanceRound(this.state) : applyAction(this.state, event.action);
            this.position++;
            if (this.position % 30 === 0 || event.action === 'next')
                this.checkpoints.set(this.position, structuredClone(this.state));
        }
        return this.state;
    }
}
