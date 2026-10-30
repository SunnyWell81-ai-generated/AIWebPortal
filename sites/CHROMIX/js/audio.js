let context;
export function playSound(kind, appearance) {
  if (!appearance.sound || !appearance.volume) return;
  try {
    context ??= new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') context.resume().catch(() => {});
    const notes = { play: [420, 620], draw: [260, 190], special: [330, 495, 660], uno: [523, 784, 1046], win: [523, 659, 784, 1046], click: [500] }[kind] ?? [400];
    notes.forEach((freq, i) => {
      const osc = context.createOscillator(), gain = context.createGain(), time = context.currentTime + i * 0.065;
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(appearance.volume / 100 * 0.12, time + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc.connect(gain); gain.connect(context.destination); osc.start(time); osc.stop(time + 0.17);
    });
  } catch { /* Devices without Web Audio remain playable. */ }
}
