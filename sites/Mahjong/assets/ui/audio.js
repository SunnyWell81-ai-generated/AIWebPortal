export class Sound {
    context = null;
    unlock() { try {
        this.context ??= new AudioContext();
        if (this.context.state === 'suspended')
            void this.context.resume();
    }
    catch (error) {
        console.warn('音声を開始できません', error);
    } }
    play(name, s) {
        if (!s.sound || !this.context)
            return;
        const ac = this.context, t = ac.currentTime;
        const patterns = { discard: [640, 340], draw: [420], chi: [520, 650], pon: [480, 720], kan: [320, 480, 760], ankan: [320, 480, 760], kakan: [320, 480, 760], daiminkan: [320, 480, 760], riichi: [520, 660, 880], ron: [660, 880, 1100, 1320], tsumo: [660, 880, 1100], button: [800], nuki: [500, 750] };
        (patterns[name] ?? patterns.button).forEach((freq, i) => { const osc = ac.createOscillator(), gain = ac.createGain(); osc.type = name === 'discard' ? 'triangle' : 'sine'; osc.frequency.value = freq; gain.gain.setValueAtTime(0, t + i * .065); gain.gain.linearRampToValueAtTime(s.volume * .12, t + i * .065 + .005); gain.gain.exponentialRampToValueAtTime(.0001, t + i * .065 + .11); osc.connect(gain).connect(ac.destination); osc.start(t + i * .065); osc.stop(t + i * .065 + .12); });
    }
}
