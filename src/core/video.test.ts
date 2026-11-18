/** Video rules (CLAUDE.md): preload none, src only while playing, stop releases the stream. */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { formatTime } from '../modules/overlays/player.ts';
import { createVideo } from './video.ts';

beforeAll(() => {
  // jsdom has no media pipeline.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
});

describe('managed video', () => {
  it('starts with preload="none" and no src', () => {
    const v = createVideo('x');
    expect(v.el.preload).toBe('none');
    expect(v.el.hasAttribute('src')).toBe(false);
    expect(v.active).toBe(false);
  });

  it('sets src only on play, muted by default', () => {
    const v = createVideo('x');
    v.play('https://example.test/a.mp4');
    expect(v.el.getAttribute('src')).toBe('https://example.test/a.mp4');
    expect(v.el.muted).toBe(true);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('on stop: pauses, removes src and calls load() to release the stream', () => {
    const v = createVideo('x');
    v.play('https://example.test/a.mp4', { muted: false });
    v.el.classList.add('is-playing');
    v.stop();
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(v.el.hasAttribute('src')).toBe(false);
    expect(HTMLMediaElement.prototype.load).toHaveBeenCalled();
    expect(v.el.classList.contains('is-playing')).toBe(false);
    expect(v.active).toBe(false);
  });
});

describe('player time format', () => {
  it('formats m:ss and h:mm:ss, and survives NaN before metadata loads', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(464.1)).toBe('7:44');
    expect(formatTime(3725)).toBe('1:02:05');
    expect(formatTime(NaN)).toBe('0:00');
  });
});
