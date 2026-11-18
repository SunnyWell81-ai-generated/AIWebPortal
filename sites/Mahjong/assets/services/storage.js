import { defaultSettings } from '../core/rules.js';
import { validateHistory, validateReplay, validateResume, validateSettings, validateStats } from './validation.js';
const SETTINGS_KEY = 'nagomi.settings', DB_NAME = 'nagomi-riichi', VERSION = 1;
export class Storage {
    database = null;
    open() {
        return this.database ??= new Promise((resolve, reject) => { const r = indexedDB.open(DB_NAME, VERSION); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('data'))
            r.result.createObjectStore('data'); }; r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); this.database = null; }; resolve(r.result); }; r.onerror = () => { this.database = null; reject(new Error(`保存領域を開けません: ${r.error?.message}`)); }; r.onblocked = () => reject(new Error('別のタブを閉じて保存を再開してください')); });
    }
    async get(key) {
        const db = await this.open();
        const raw = await new Promise((resolve, reject) => { const t = db.transaction('data', 'readonly'), r = t.objectStore('data').get(key); r.onsuccess = () => resolve(r.result ?? null); r.onerror = () => reject(r.error); });
        if (raw === null)
            return null;
        const v = this.migrate(raw);
        switch (key) {
            case 'settings': return validateSettings(v);
            case 'stats': return validateStats(v);
            case 'resume': return validateResume(v);
            case 'replay': return validateReplay(v);
        }
        throw new Error('不明な保存キーです');
    }
    /** v0のラッパーをv1へ。未知の将来バージョンは上書きせず読み込みを拒否。 */
    migrate(v) { if (typeof v === 'object' && v !== null && 'schemaVersion' in v && v.schemaVersion === 0 && 'payload' in v)
        return v.payload; return v; }
    async write(values) {
        const db = await this.open();
        await new Promise((resolve, reject) => { const t = db.transaction('data', 'readwrite'), store = t.objectStore('data'); for (const [key, v] of Object.entries(values)) {
            if (v === null)
                store.delete(key);
            else
                store.put(v, key);
        } t.oncomplete = () => resolve(); t.onerror = () => reject(new Error(`保存失敗: ${t.error?.message}`)); t.onabort = () => reject(new Error(`保存が中断されました: ${t.error?.message ?? ''}`)); });
    }
    settings() { const raw = localStorage.getItem(SETTINGS_KEY); if (!raw)
        return defaultSettings(); let value = JSON.parse(raw); if (value && typeof value === 'object' && 'version' in value && 'value' in value) {
        if (value.version !== 1)
            throw new Error('設定の保存バージョンに対応していません');
        value = value.value;
    } return validateSettings(value); }
    saveSettings(settings) { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ version: 1, value: settings })); }
    async export(keys, settings) { const data = {}; for (const key of keys) {
        if (key === 'settings')
            data.settings = settings;
        else
            data[key] = await this.get(key);
    } return JSON.stringify({ app: 'nagomi-riichi', version: 1, exportedAt: new Date().toISOString(), data }, null, 2); }
    async import(text) {
        if (text.length > 80_000_000)
            throw new Error('バックアップは80MB以下にしてください');
        const b = JSON.parse(text);
        if (b?.app !== 'nagomi-riichi' || b.version !== 1 || !b.data || typeof b.data !== 'object' || Array.isArray(b.data))
            throw new Error('対応していないバックアップです');
        const clean = {};
        for (const [key, v] of Object.entries(b.data))
            switch (key) {
                case 'settings':
                    clean.settings = validateSettings(v);
                    break;
                case 'stats':
                    clean.stats = v === null ? { version: 1, entries: [] } : validateStats(v);
                    break;
                case 'resume':
                    clean.resume = v === null ? null : validateResume(v);
                    break;
                case 'replay':
                    clean.replay = v === null ? null : validateReplay(v);
                    break;
                default: throw new Error('不明なデータ種別です');
            }
        if (!Object.keys(clean).length)
            throw new Error('読み込み対象がありません');
        // 全項目をメモリ上で検査した後、IndexedDBの1トランザクションで置換する。
        if (clean.resume)
            await validateHistory(clean.resume);
        if (clean.replay)
            await validateHistory(clean.replay);
        await this.write(clean);
        if (clean.settings)
            this.saveSettings(clean.settings);
        return clean;
    }
    async clear() { await this.write({ resume: null, replay: null, stats: { version: 1, entries: [] }, settings: defaultSettings() }); this.saveSettings(defaultSettings()); }
}
export function downloadJson(text, name) { const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })), a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 3000); }
