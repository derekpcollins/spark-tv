/** Builds the moderator panel's rows from the registries, the layout and the store. */
import catalogData from '../data/catalog.json';
import presetsData from '../data/presets.json';
import { LAUNCH_DURATIONS } from './config.ts';
import { cards, displayPages, sections } from './core/app-registries.ts';
import type { Catalog, SectionConfig } from './core/catalog.ts';
import type { SettingRow } from './core/settings.ts';
import type { Preset, Store } from './core/store.ts';

export const presets = presetsData as Preset[];

/** The variant in effect for a slot: moderator choice, else the layout default, else the first registered. */
export function variantFor(store: Store, slot: string, fallback?: string): string | undefined {
  return store.get().variants[slot] ?? fallback;
}

const catalog = catalogData as unknown as Catalog;

function rowTitle(
  section: SectionConfig,
  t: (key: string, params?: Record<string, string>) => string,
): string {
  if (!section.title) return section.id;
  const params = Object.fromEntries(
    Object.entries(section.titleParams ?? {}).map(([k, v]) => [
      k,
      v.startsWith('provider:') ? (catalog.providers[v.slice(9)]?.name ?? v) : v,
    ]),
  );
  return t(section.title, params);
}

export function moderatorRows(
  store: Store,
  layout: SectionConfig[],
  t: (key: string, params?: Record<string, string | number>) => string,
  resetSession: () => void,
): SettingRow[] {
  const s = () => store.get();
  const rows: SettingRow[] = [];

  rows.push({
    kind: 'selector',
    label: t('mod.preset'),
    choices: [{ id: '', label: t('mod.custom') }, ...presets.map((p) => ({ id: p.id, label: p.label }))],
    value: () => s().preset ?? '',
    set: (id) => store.applyPreset(presets.find((p) => p.id === id) ?? null),
  });
  rows.push({
    kind: 'selector',
    label: t('mod.language'),
    choices: [
      { id: 'en', label: 'English' },
      { id: 'es', label: 'Español' },
    ],
    value: () => s().locale,
    set: (id) => store.setLocale(id === 'es' ? 'es' : 'en'),
  });

  rows.push({ kind: 'heading', label: t('mod.variants') });
  for (const section of layout) {
    if (section.type === 'row') {
      if (section.card === 'app') continue; // app tiles have no alternative
      const choices = cards
        .types()
        .filter((type) => type !== 'app')
        .map((type) => ({ id: type, label: cards.get(type).label }));
      rows.push({
        kind: 'selector',
        label: t('mod.rowCards', { row: rowTitle(section, t) }),
        choices,
        value: () => variantFor(store, `row:${section.id}`, section.card) ?? 'poster',
        set: (id) => store.setVariant(`row:${section.id}`, id),
      });
    } else if (sections.has(section.type) && sections.variants(section.type).length) {
      const variants = sections.variants(section.type);
      if (section.type === 'banner') continue;
      rows.push({
        kind: 'selector',
        label: t(`mod.slot.${section.type}`),
        choices: variants,
        value: () => variantFor(store, section.type, section.variant) ?? variants[0]!.id,
        set: (id) => store.setVariant(section.type, id),
      });
    }
  }
  const displayVariants = displayPages.variants('movie');
  rows.push({
    kind: 'selector',
    label: t('mod.slot.display'),
    choices: displayVariants,
    value: () => variantFor(store, 'display', 'A') ?? 'A',
    set: (id) => store.setVariant('display', id),
  });

  const optionRows: SettingRow[] = [];
  for (const [registry, types] of [
    [sections, sections.types()],
    [cards, cards.types()],
  ] as const) {
    for (const type of types) {
      for (const o of registry.options(type)) {
        const key = `${type}.${o.id}`;
        if (o.kind === 'toggle') {
          optionRows.push({
            kind: 'toggle',
            label: t(o.label),
            value: () => Boolean(s().options[key] ?? o.default),
            set: (on) => store.setOption(key, on),
          });
        } else {
          optionRows.push({
            kind: 'selector',
            label: t(o.label),
            choices: o.choices ?? [],
            value: () => String(s().options[key] ?? o.default),
            set: (id) => store.setOption(key, id),
          });
        }
      }
    }
  }
  if (optionRows.length) rows.push({ kind: 'heading', label: t('mod.options') }, ...optionRows);

  rows.push({ kind: 'heading', label: t('mod.launch') });
  rows.push({
    kind: 'toggle',
    label: t('mod.launchSound'),
    value: () => s().launchSound,
    set: (on) => store.setLaunchSound(on),
  });
  rows.push({
    kind: 'toggle',
    label: t('mod.skipLaunch'),
    value: () => s().skipLaunch,
    set: (on) => store.setSkipLaunch(on),
  });
  rows.push({
    kind: 'selector',
    label: t('mod.launchDuration'),
    choices: LAUNCH_DURATIONS.map((ms) => ({ id: String(ms), label: `${(ms / 1000).toFixed(1)} s` })),
    value: () => String(s().launchDuration),
    set: (id) => store.setLaunchDuration(Number(id)),
  });

  rows.push({ kind: 'heading', label: t('mod.session') });
  rows.push({ kind: 'action', label: t('mod.reset'), run: resetSession });

  rows.push({ kind: 'heading', label: t('mod.info') });
  rows.push({ kind: 'info', label: t('mod.version'), value: () => __APP_VERSION__ });
  rows.push({ kind: 'info', label: t('mod.build'), value: () => __BUILD_ID__ });
  rows.push({ kind: 'info', label: t('mod.catalog'), value: () => catalog.generatedAt.slice(0, 10) || '—' });
  return rows;
}
