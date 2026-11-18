import { describe, expect, it } from 'vitest';
import { createRegistry } from './registry.ts';
import { DEFAULT_BINDINGS, resolveKey } from './keymap.ts';

type Factory = () => string;

describe('registry', () => {
  it('registers variants per type and lists them for the moderator panel', () => {
    const r = createRegistry<Factory>('sections');
    r.register({ type: 'hero', variant: 'A', label: 'Video billboard', create: () => 'a' });
    r.register({ type: 'hero', variant: 'B', label: 'Static carousel', create: () => 'b' });
    expect(r.types()).toEqual(['hero']);
    expect(r.variants('hero')).toEqual([
      { id: 'A', label: 'Video billboard' },
      { id: 'B', label: 'Static carousel' },
    ]);
    expect(r.get('hero', 'B').create()).toBe('b');
  });

  it('falls back to the first variant when the requested one is missing', () => {
    const r = createRegistry<Factory>('cards');
    r.register({ type: 'card', variant: 'poster', label: 'Poster', create: () => 'p' });
    expect(r.get('card', 'nope').variant).toBe('poster');
    expect(r.get('card').variant).toBe('poster');
  });

  it('rejects duplicate registrations and unknown types', () => {
    const r = createRegistry<Factory>('overlays');
    r.register({ type: 'x', variant: 'A', label: 'A', create: () => '' });
    expect(() => r.register({ type: 'x', variant: 'A', label: 'A', create: () => '' })).toThrow(/already/);
    expect(() => r.get('missing')).toThrow(/no module/);
    expect(r.has('missing')).toBe(false);
  });

  it('merges declared options across variants by id', () => {
    const r = createRegistry<Factory>('sections');
    const opt = { id: 'autoplay', label: 'opt.autoplay', kind: 'toggle' as const, default: true };
    r.register({ type: 'hero', variant: 'A', label: 'A', options: [opt], create: () => '' });
    r.register({ type: 'hero', variant: 'B', label: 'B', options: [opt], create: () => '' });
    expect(r.options('hero')).toEqual([opt]);
  });
});

describe('keymap', () => {
  it('maps arrows, OK, both Back keys and play/pause', () => {
    const k = (key: string) => resolveKey({ key, code: '' });
    expect(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].map(k)).toEqual([
      'up',
      'down',
      'left',
      'right',
    ]);
    expect(k('Enter')).toBe('ok');
    expect(k('Escape')).toBe('back');
    expect(k('Backspace')).toBe('back');
    expect(k('MediaPlayPause')).toBe('playpause');
    expect(k(' ')).toBe('playpause');
    expect(k('q')).toBeNull();
  });

  it('accepts extra bindings for remote/FLIRC codes', () => {
    expect(resolveKey({ key: 'F13', code: 'F13' }, { ...DEFAULT_BINDINGS, F13: 'back' })).toBe('back');
  });
});
