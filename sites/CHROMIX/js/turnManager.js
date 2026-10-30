export function nextPlayer(state, steps = 1) {
  return (state.current + state.direction * steps + state.players.length * 4) % state.players.length;
}
export function needsHandoff(state) {
  return state.players[state.current].type === 'human' && state.players.filter(p => p.type === 'human').length > 1;
}
