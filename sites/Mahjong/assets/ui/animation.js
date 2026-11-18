export class Animations {
    animations = [];
    add(a) { this.animations.push(a); a.onfinish = () => { this.animations = this.animations.filter(x => x !== a); }; }
    announce(message, settings) {
        if (settings.animation === 'off')
            return;
        const el = document.querySelector('.table-announcement');
        if (!el)
            return;
        el.textContent = message;
        this.add(el.animate([{ opacity: 0, transform: 'translate(-50%, -35%) scale(.94)' }, { opacity: 1, transform: 'translate(-50%, -50%) scale(1)', offset: .2 }, { opacity: 1, offset: .72 }, { opacity: 0 }], { duration: settings.animation === 'strong' ? 1600 : 900, easing: 'ease-out' }));
    }
    transition(before, after, action, settings) {
        if (settings.animation === 'off')
            return;
        const duration = settings.animation === 'strong' ? 500 : 250;
        if (action === 'next')
            document.querySelectorAll('.your-hand .tile').forEach((el, i) => this.add(el.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration, delay: i * 18, easing: 'ease-out' })));
        else if (action.type === 'discard' || action.type === 'riichi') {
            const el = document.querySelector(`.river .tile[data-tile="${action.tiles[0]}"]`);
            if (el)
                this.add(el.animate([{ opacity: 0, scale: '.8' }, { opacity: 1, scale: '1' }], { duration, easing: 'ease-out' }));
        }
        for (const p of after.players)
            if (p.score !== before.players[p.seat].score) {
                const el = document.querySelector(`[data-score-seat="${p.seat}"] b`);
                if (el)
                    this.add(el.animate([{ color: 'var(--gold)', transform: 'translateY(-4px)' }, { color: 'var(--text)', transform: 'translateY(0)' }], { duration: duration * 2 }));
            }
    }
    pause() { this.animations.forEach(a => a.pause()); document.body.classList.add('paused'); }
    resume() { this.animations.forEach(a => a.play()); document.body.classList.remove('paused'); }
}
