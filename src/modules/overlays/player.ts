/**
 * Player overlay: the full Spark Free film, letterboxed, with sound. OK or Play/Pause toggles;
 * Left/Right seek; Back closes (which stops and releases the stream). Controls show on any key
 * and hide after a few seconds while playing; they stay up while paused or at the end, where
 * OK plays again from the start.
 */
import { assetUrl, PLAYER_CONTROLS_MS, PLAYER_SEEK_S } from '../../config.ts';
import { overlays } from '../../core/app-registries.ts';
import { localized, type Title } from '../../core/catalog.ts';
import type { Key, KeyResult } from '../../core/types.ts';
import { createVideo } from '../../core/video.ts';

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

overlays.register({
  type: 'player',
  variant: 'A',
  label: 'Player',
  create(props, ctx) {
    const title = props.title as Title;
    const el = document.createElement('div');
    el.className = 'overlay player';
    const video = createVideo('player__video');
    video.el.removeAttribute('aria-hidden');

    const controls = document.createElement('div');
    controls.className = 'player__controls';
    const name = document.createElement('p');
    name.className = 'player__title';
    name.textContent = localized(title, ctx.locale()).title;
    const bar = document.createElement('div');
    bar.className = 'player__bar';
    const state = document.createElement('span');
    state.className = 'player__state';
    const track = document.createElement('div');
    track.className = 'player__track';
    const fill = document.createElement('div');
    fill.className = 'player__fill';
    track.append(fill);
    const time = document.createElement('span');
    time.className = 'player__time';
    bar.append(state, track, time);
    const hint = document.createElement('p');
    hint.className = 'player__hint';
    hint.textContent = ctx.t('player.hint');
    controls.append(name, bar, hint);
    el.append(video.el, controls);

    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    function showControls(): void {
      controls.classList.add('is-visible');
      clearTimeout(hideTimer);
      if (!video.el.paused && !video.el.ended) {
        hideTimer = setTimeout(() => controls.classList.remove('is-visible'), PLAYER_CONTROLS_MS);
      }
    }
    function update(): void {
      const d = video.el.duration;
      const t = video.el.currentTime;
      fill.style.transform = `scaleX(${d ? t / d : 0})`;
      time.textContent = `${formatTime(t)} / ${formatTime(d)}`;
      state.classList.toggle('is-paused', video.el.paused);
    }
    for (const ev of ['timeupdate', 'durationchange', 'play', 'pause']) video.el.addEventListener(ev, update);
    video.el.addEventListener('pause', showControls);
    video.el.addEventListener('ended', showControls);

    const src = title.video ? assetUrl(title.video.full) : '';
    function togglePlay(): void {
      if (video.el.ended) video.el.currentTime = 0;
      if (video.el.paused) void video.el.play()?.catch(() => {});
      else video.el.pause();
    }

    return {
      el,
      focus() {
        if (!video.active && src) video.play(src, { muted: false });
        update();
        showControls();
      },
      blur() {
        // Something opened on top (e.g. the moderator panel): pause, keep the position.
        video.el.pause();
      },
      handleKey(key: Key): KeyResult {
        if (key === 'back') return 'back';
        if (key === 'ok' || key === 'playpause') togglePlay();
        if (key === 'left' || key === 'right') {
          const d = video.el.duration || 0;
          const next = video.el.currentTime + (key === 'right' ? PLAYER_SEEK_S : -PLAYER_SEEK_S);
          video.el.currentTime = Math.min(Math.max(0, next), Math.max(0, d - 0.5));
        }
        showControls();
        update();
        return 'handled';
      },
      destroy() {
        clearTimeout(hideTimer);
        video.stop();
      },
    };
  },
});
