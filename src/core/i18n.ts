/** All visible strings go through t(). Fallback chain: active locale → en → the key. */
import en from '../i18n/en.json';
import es from '../i18n/es.json';

type Strings = Record<string, string>;
const TABLES: Record<string, Strings> = { en, es };

export function createI18n(getLocale: () => string, tables: Record<string, Strings> = TABLES) {
  return function t(key: string, params: Record<string, string | number> = {}): string {
    const raw = tables[getLocale()]?.[key] ?? tables.en?.[key] ?? key;
    return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
  };
}
