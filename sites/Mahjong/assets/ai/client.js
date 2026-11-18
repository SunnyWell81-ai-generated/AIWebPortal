export class CpuClient {
    worker = null;
    serial = 0;
    pending = new Map();
    open() {
        if (this.worker)
            return this.worker;
        const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
        this.worker = worker;
        worker.onmessage = (e) => { const job = this.pending.get(e.data.id); if (!job)
            return; clearTimeout(job.timer); this.pending.delete(e.data.id); if (e.data.error)
            job.reject(new Error(e.data.error));
        else
            job.resolve(e.data.decision); };
        worker.onerror = () => this.cancel('CPU Workerを開始できません。HTTP(S)で開いてください。');
        return worker;
    }
    think(observation) {
        return new Promise((resolve, reject) => { const id = ++this.serial; const worker = this.open(), timer = setTimeout(() => { this.cancel('CPUの思考上限（8秒）に達しました。再開してください。'); }, 8000); this.pending.set(id, { resolve, reject, timer }); worker.postMessage({ id, observation }); });
    }
    cancel(reason = '思考を中断しました') { this.worker?.terminate(); this.worker = null; for (const p of this.pending.values()) {
        clearTimeout(p.timer);
        p.reject(new Error(reason));
    } this.pending.clear(); }
}
