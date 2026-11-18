/**
 * Managed <video> that enforces the project's video rules (CLAUDE.md, "Video"):
 * preload="none"; src is set only when playback is wanted; stop() pauses, removes src and calls
 * load() so the browser releases the stream. Callers stop on blur, which covers "never play
 * under an overlay" (pushing an overlay blurs what's below it).
 */
export interface ManagedVideo {
  el: HTMLVideoElement;
  play(src: string, opts?: { muted?: boolean; loop?: boolean }): void;
  stop(): void;
  readonly active: boolean;
}

export function createVideo(className: string): ManagedVideo {
  const el = document.createElement('video');
  el.className = className;
  el.preload = 'none';
  el.playsInline = true;
  el.disablePictureInPicture = true;
  el.setAttribute('aria-hidden', 'true');
  let active = false;
  // Fade in only once frames are actually playing, so a slow start never shows a black box.
  el.addEventListener('playing', () => el.classList.add('is-playing'));

  return {
    el,
    get active() {
      return active;
    },
    play(src, opts = {}) {
      active = true;
      el.muted = opts.muted ?? true;
      el.loop = opts.loop ?? false;
      if (el.getAttribute('src') !== src) el.src = src;
      const p = el.play() as Promise<void> | undefined;
      // Autoplay can be refused (e.g. sound before a gesture); the poster stays up.
      p?.catch(() => {});
    },
    stop() {
      if (!active) return;
      active = false;
      el.classList.remove('is-playing');
      el.pause();
      el.removeAttribute('src');
      el.load();
    },
  };
}
