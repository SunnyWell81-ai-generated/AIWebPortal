export function ranking(s) { return s.players.map(p => p.seat).sort((a, b) => s.players[b].score - s.players[a].score || (a - s.initialDealer + s.players.length) % s.players.length - (b - s.initialDealer + s.players.length) % s.players.length); }
export function finalPoints(s) {
    const r = s.config.rules, rank = ranking(s);
    return s.players.map(p => (p.score - r.returnPoints) / 1000 + (r.uma[rank.indexOf(p.seat)] ?? 0) + (rank[0] === p.seat ? r.oka : 0));
}
/** v1 is used only while reconstructing historical logs. Live games use v2. */
export function bankruptPlayers(s) { return s.config.rules.tobi ? s.players.filter(p => s.endRuleVersion === 1 ? p.score < 0 : p.score <= 0).map(p => p.seat) : []; }
export function matchEndReason(s, result) {
    const n = s.players.length, r = s.config.rules;
    if (bankruptPlayers(s).length)
        return 'tobi';
    if (s.config.format === 'single')
        return !r.singleRepeat || !result.dealerRepeat ? 'single' : null;
    const scheduled = s.config.format === 'east' ? n : n * 2;
    if (s.round < scheduled - 1)
        return null;
    const top = ranking(s)[0], target = s.players[top].score >= r.returnPoints;
    if (s.round >= scheduled + n - 1 && !result.dealerRepeat)
        return 'extension';
    if (result.dealerRepeat)
        return !result.abortive && result.winners.includes(s.dealer) && r.agariYame && top === s.dealer && target ? 'agariYame' : null;
    return !r.extension || target ? s.round >= scheduled ? 'extension' : 'scheduled' : null;
}
export function shouldFinish(s, result) { return matchEndReason(s, result) !== null; }
function finishMatch(s, result, reason) {
    s.phase = 'matchEnd';
    if (s.endRuleVersion !== 1)
        s.endReason = reason;
    if (s.deposits) {
        const top = ranking(s)[0];
        s.players[top].score += s.deposits * 1000;
        result.delta[top] += s.deposits * 1000;
        s.deposits = 0;
    }
}
export function recordResult(s, result) {
    result.delta.forEach((v, i) => { s.players[i].score += v; });
    s.result = result;
    s.reaction = null;
    s.message = result.reason;
    const append = () => s.records.push({ round: s.round, dealer: s.dealer, honba: s.honba, result: structuredClone(result), riichi: s.players.filter(p => p.riichi).map(p => p.seat), calls: s.players.filter(p => p.melds.some(m => m.type !== 'ankan')).map(p => p.seat), scores: s.players.map(p => p.score) });
    // Preserve the historical record layout for old replays, including its pre-award snapshot.
    if (s.endRuleVersion === 1)
        append();
    const reason = matchEndReason(s, result);
    s.phase = 'handEnd';
    if (reason)
        finishMatch(s, result, reason);
    if (s.endRuleVersion !== 1)
        append();
}
/** A recorded, additive migration; old in-progress games retain all prior actions and names. */
export function upgradeEndRules(state) {
    if (state.endRuleVersion === 2)
        return structuredClone(state);
    const s = structuredClone(state);
    s.endRuleVersion = 2;
    if ((s.phase === 'discard' || s.phase === 'reactions') && bankruptPlayers(s).length) {
        recordResult(s, { reason: 'トビ終了（途中データ再開）', winners: [], evaluations: {}, delta: Array(s.players.length).fill(0), tenpai: [], dealerRepeat: false, abortive: true });
        return s;
    }
    if (s.phase === 'handEnd' && s.result) {
        const reason = matchEndReason(s, s.result);
        if (reason) {
            finishMatch(s, s.result, reason);
            const record = s.records.at(-1);
            if (record) {
                record.result = structuredClone(s.result);
                record.scores = s.players.map(p => p.score);
            }
        }
    }
    return s;
}
