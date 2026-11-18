export function ranking(s) { return s.players.map(p => p.seat).sort((a, b) => s.players[b].score - s.players[a].score || (a - s.initialDealer + s.players.length) % s.players.length - (b - s.initialDealer + s.players.length) % s.players.length); }
export function finalPoints(s) {
    const r = s.config.rules, rank = ranking(s);
    return s.players.map(p => (p.score - r.returnPoints) / 1000 + (r.uma[rank.indexOf(p.seat)] ?? 0) + (rank[0] === p.seat ? r.oka : 0));
}
export function shouldFinish(s, result) {
    const n = s.players.length, r = s.config.rules;
    if (r.tobi && s.players.some(p => p.score < 0))
        return true;
    if (s.config.format === 'single')
        return !r.singleRepeat || !result.dealerRepeat;
    const scheduled = s.config.format === 'east' ? n : n * 2, last = s.round >= scheduled - 1;
    if (!last)
        return false;
    const top = ranking(s)[0], target = s.players[top].score >= r.returnPoints;
    if (s.round >= scheduled + n - 1 && !result.dealerRepeat)
        return true;
    if (result.dealerRepeat)
        return !result.abortive && result.winners.includes(s.dealer) && r.agariYame && top === s.dealer && target;
    return !r.extension || target || s.round >= scheduled + n - 1;
}
export function recordResult(s, result) {
    result.delta.forEach((v, i) => { s.players[i].score += v; });
    s.result = result;
    s.reaction = null;
    s.message = result.reason;
    s.records.push({ round: s.round, dealer: s.dealer, honba: s.honba, result: structuredClone(result), riichi: s.players.filter(p => p.riichi).map(p => p.seat), calls: s.players.filter(p => p.melds.some(m => m.type !== 'ankan')).map(p => p.seat), scores: s.players.map(p => p.score) });
    s.phase = shouldFinish(s, result) ? 'matchEnd' : 'handEnd';
    if (s.phase === 'matchEnd' && s.deposits) {
        const top = ranking(s)[0];
        s.players[top].score += s.deposits * 1000;
        result.delta[top] += s.deposits * 1000;
        s.deposits = 0;
    }
}
