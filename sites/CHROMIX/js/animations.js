export function animateAction(root, kind, enabled) {
  if (!enabled || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const animate = (selector, frames, duration = 300) => root.querySelector(selector)?.animate?.(frames, { duration, easing: 'cubic-bezier(.2,.8,.2,1)' });
  root.dataset.effect = kind;
  if (kind === 'draw') {
    animate('.draw-pile', [{ transform: 'translateY(-5px) rotate(4deg)' }, { transform: 'translateY(0) rotate(0)' }]);
    animate('.just-drawn', [{ translate: '-20px -8px', opacity: .3 }, { translate: '0 0', opacity: 1 }]);
  } else if (kind === 'uno') {
    animate('.uno-button', [{ transform: 'scale(.9)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], 380);
  } else if (kind !== 'info' && kind !== 'pass') {
    animate('.discard-card', [{ transform: 'translateY(-14px) rotate(-11deg) scale(.85)', opacity: .5 }, { transform: 'translateY(0) rotate(-7deg) scale(1)', opacity: 1 }], 270);
  }
  if (['swap', 'redraw', 'reverse', 'skip', 'uno', 'penalty', 'color'].includes(kind)) {
    animate('.table-status', [{ opacity: .3, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], 350);
    animate('.seats', [{ opacity: .7 }, { opacity: 1 }], 350);
  }
}
