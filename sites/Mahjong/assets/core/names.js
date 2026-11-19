export const CPU_NAMES = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '山本', '中村', '小林', '加藤', '吉田', '渡辺', '松本', '井上', '木村', '林', '清水', '山口', '斎藤', '池田', '橋本', '石川', '森', '阿部', '藤田'];
const placeholder = (name) => !name.trim() || /^(CPU|ＣＰＵ)\s*[0-9０-９]*$/i.test(name) || ['あなた', '凪', '蓮', '葵', '楓'].includes(name);
/** Used for new matches only. Existing saves and replays must keep their recorded identities. */
export function assignCpuNames(seats, random = Math.random, refresh = false) {
    const out = structuredClone(seats), used = new Set(out.filter(s => s.human).map(s => s.name.trim()));
    const pool = [...CPU_NAMES];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (const seat of out) {
        if (seat.human)
            continue;
        seat.name = seat.name.trim();
        if (refresh || placeholder(seat.name) || used.has(seat.name))
            seat.name = pool.find(name => !used.has(name));
        used.add(seat.name);
    }
    return out;
}
