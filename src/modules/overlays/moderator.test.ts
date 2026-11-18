/** Moderator panel theme: dark by default, switchable to light, remembered outside the store. */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { overlays } from '../../core/app-registries.ts';
import type { Catalog } from '../../core/catalog.ts';
import { createMemory } from '../../core/focus.ts';
import { createI18n } from '../../core/i18n.ts';
import type { ModuleContext } from '../../core/types.ts';

beforeAll(async () => {
  await import('../index.ts');
});
beforeEach(() => localStorage.clear());

const ctx: ModuleContext = {
  catalog: { generatedAt: '', region: 'US', titles: {}, providers: {}, sections: {} } as Catalog,
  t: createI18n(() => 'en'),
  locale: () => 'en',
  memory: createMemory(),
  option: () => undefined,
  openOverlay: () => undefined,
  openTitle: () => undefined,
};

function open() {
  const panel = overlays.get('moderator').create({ rows: [], subscribe: () => () => undefined }, ctx);
  document.body.append(panel.el);
  panel.focus({ from: 'initial' });
  return panel;
}

describe('moderator panel theme', () => {
  it('opens dark by default with a Theme row', () => {
    const panel = open();
    expect(panel.el.classList.contains('moderator--dark')).toBe(true);
    expect(panel.el.querySelector('.settings__row.is-focused')?.textContent).toContain('Dark');
  });

  it('switches to light and remembers it for the next open', () => {
    const panel = open();
    panel.handleKey('right');
    expect(panel.el.classList.contains('moderator--dark')).toBe(false);
    expect(panel.el.querySelector('.settings__row.is-focused')?.textContent).toContain('Light');
    expect(open().el.classList.contains('moderator--dark')).toBe(false);
  });
});
