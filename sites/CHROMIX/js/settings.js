export const VERSION = 1;
export const SPECIALS = {
  skip: { name: 'スキップ', symbol: '⊘', description: '次のプレイヤーをスキップ' },
  reverse: { name: 'リバース', symbol: '⇄', description: 'ターンの方向を反転' },
  draw2: { name: '+2', symbol: '+2', description: '次の人に2枚。+2 / +4で連鎖' },
  wild: { name: '色変更', symbol: '✳', description: '好きな色に変更' },
  draw4: { name: '+4・色変更', symbol: '+4', description: '色を変え、次の人に4枚' },
  swap: { name: '手札入れ替え', symbol: '⇆', description: '相手と手札をまるごと交換' },
  redraw: { name: '手札引き直し', symbol: '⟳', description: '相手の手札を同じ枚数で再配布' },
};
export const COLORS = [
  { id: 'red', name: 'レッド', mark: '●', hex: '#e84b55' },
  { id: 'blue', name: 'ブルー', mark: '◆', hex: '#427ddd' },
  { id: 'green', name: 'グリーン', mark: '▲', hex: '#27876b' },
  { id: 'yellow', name: 'イエロー', mark: '■', hex: '#e8b438' },
  { id: 'purple', name: 'パープル', mark: '✦', hex: '#9564cf' },
  { id: 'orange', name: 'オレンジ', mark: '⬟', hex: '#e78237' },
  { id: 'cyan', name: 'シアン', mark: '⬢', hex: '#208eaa' },
  { id: 'pink', name: 'ピンク', mark: '♥', hex: '#cc609b' },
];
export const defaultSettings = () => ({
  preset: 'classic', colorCount: 4, maxNumber: 9, initialHand: 7,
  specials: Object.fromEntries(Object.keys(SPECIALS).map(k => [k, !['swap', 'redraw'].includes(k)])),
  reverseTwo: 'skip', specialFinish: true, unoMode: 'auto', targetMode: 'next',
  timerEnabled: false, turnSeconds: 30,
  players: [
    { name: 'あなた', type: 'human', difficulty: 'normal' },
    { name: 'ソラ', type: 'cpu', difficulty: 'normal' },
    { name: 'リク', type: 'cpu', difficulty: 'normal' },
    { name: 'ハナ', type: 'cpu', difficulty: 'hard' },
  ],
  appearance: { theme: 'light', animations: true, sound: true, volume: 40 },
});
const fail = (key) => { throw new Error(`設定「${key}」の値が正しくありません。`); };
export function validateSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('データ形式');
  const out = defaultSettings();
  for (const [k, min, max] of [['colorCount', 2, 8], ['maxNumber', 0, 20], ['initialHand', 1, 20], ['turnSeconds', 5, 180]]) {
    if (!Number.isInteger(input[k]) || input[k] < min || input[k] > max) fail(k);
    out[k] = input[k];
  }
  for (const k of ['specialFinish', 'timerEnabled']) {
    if (typeof input[k] !== 'boolean') fail(k);
    out[k] = input[k];
  }
  for (const [k, values] of Object.entries({ preset: ['classic', 'chaos', 'custom'], reverseTwo: ['skip', 'normal'], unoMode: ['auto', 'call'], targetMode: ['next', 'choose'] })) {
    if (!values.includes(input[k])) fail(k);
    out[k] = input[k];
  }
  if (!input.specials || typeof input.specials !== 'object') fail('specials');
  for (const k of Object.keys(SPECIALS)) {
    if (typeof input.specials[k] !== 'boolean') fail(k);
    out.specials[k] = input.specials[k];
  }
  if (!Array.isArray(input.players) || input.players.length < 2 || input.players.length > 4) fail('players');
  out.players = input.players.map((p, i) => {
    if (!p || !['human', 'cpu'].includes(p.type) || !['easy', 'normal', 'hard'].includes(p.difficulty) || typeof p.name !== 'string' || p.name.length > 24) fail('player');
    return { name: p.name.trim() || `プレイヤー${i + 1}`, type: p.type, difficulty: p.difficulty };
  });
  const a = input.appearance;
  if (!a || !['light', 'dark'].includes(a.theme) || typeof a.animations !== 'boolean' || typeof a.sound !== 'boolean' || !Number.isInteger(a.volume) || a.volume < 0 || a.volume > 100) fail('appearance');
  out.appearance = { theme: a.theme, animations: a.animations, sound: a.sound, volume: a.volume };
  return out;
}
export function applyPreset(settings, name) {
  if (name === 'custom') return { ...structuredClone(settings), preset: 'custom' };
  const base = defaultSettings();
  if (name === 'chaos') {
    base.colorCount = 6; base.maxNumber = 12; base.initialHand = 9;
    base.specials = Object.fromEntries(Object.keys(SPECIALS).map(k => [k, true]));
    base.targetMode = 'choose';
  }
  return validateSettings({ ...base, preset: name, players: settings.players, appearance: settings.appearance });
}
export function exportSettings(settings) { return JSON.stringify({ game: 'CHROMIX', version: VERSION, settings: validateSettings(settings) }, null, 2); }
export function importSettings(json) {
  if (typeof json !== 'string' || json.length > 100000) throw new Error('設定ファイルが大きすぎます。');
  const data = JSON.parse(json);
  if (data?.game !== 'CHROMIX' || data.version !== VERSION) throw new Error('対応していない設定ファイルです。');
  return validateSettings(data.settings);
}
