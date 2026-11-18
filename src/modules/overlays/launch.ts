/**
 * Launch sequence (Glint): black → snap + white point → ignite → settle → streak with the
 * wordmark sliding out from behind the mark → the white-hot core cools to amber → fade to
 * Home. Transform and opacity only. Timeline in docs/SPEC.md, scaled to `durationMs`.
 */
import { overlays } from '../../core/app-registries.ts';
import { createMark } from '../../brand/mark.ts';
import { markMarkup } from '../../brand/glint.ts';
import { LAUNCH_TIMELINE_MS, SNAP_SOUND } from '../../config.ts';
import type { KeyResult } from '../../core/types.ts';

const FONT_SIZE = 56;
const MARK_WIDTH = Math.round(FONT_SIZE * 3.2);
const IGNITE = 'cubic-bezier(.2,.8,.2,1)'; // tokens-ok: mirrors motion.easing.ignite for WAAPI

/** Keyframe offset for a time on the default 2700 ms timeline. */
const at = (ms: number): number => ms / LAUNCH_TIMELINE_MS;

overlays.register({
  type: 'launch',
  variant: 'default',
  label: 'Launch sequence',
  create(props) {
    const duration = (props.durationMs as number) ?? LAUNCH_TIMELINE_MS;
    const sound = Boolean(props.sound);
    const onDone = props.onDone as () => void;

    const el = document.createElement('div');
    el.className = 'overlay launch';
    const lockup = document.createElement('div');
    lockup.className = 'launch__lockup brand brand--stacked';
    lockup.style.setProperty('--brand-font-size', `${FONT_SIZE}px`);

    const markWrap = document.createElement('div');
    markWrap.className = 'launch__mark';
    const markInner = document.createElement('div');
    markInner.className = 'launch__mark-inner';
    markInner.append(createMark({ size: MARK_WIDTH }));
    // White-hot core: the same shape filled white, laid over the mark, fading to reveal amber.
    const core = document.createElement('div');
    core.className = 'launch__core';
    core.innerHTML = markMarkup({
      cut: 'large',
      onLight: false,
      halo: false,
      idPrefix: 'launch-core',
      color: () => 'var(--color-mark-stop-0)',
      width: MARK_WIDTH,
    });
    markInner.append(core);
    markWrap.append(markInner);

    const mask = document.createElement('div');
    mask.className = 'launch__mask';
    const words = document.createElement('div');
    words.className = 'brand__text';
    words.setAttribute('role', 'img');
    words.setAttribute('aria-label', 'Spark TV');
    words.innerHTML = '<span class="brand__spark">SPARK</span><span class="brand__tv">TV</span>';
    mask.append(words);
    lockup.append(markWrap, mask);
    el.append(lockup);

    const animations: Animation[] = [];
    const timers: number[] = [];
    let finished = false;
    const finish = (): void => {
      if (finished) return;
      finished = true;
      onDone();
    };

    function play(): void {
      const opts: KeyframeAnimationOptions = { duration, fill: 'forwards' };
      if (typeof el.animate !== 'function') {
        timers.push(window.setTimeout(finish, duration));
        return;
      }
      animations.push(
        markWrap.animate(
          [
            { offset: 0, opacity: 0, transform: 'scale(0.06)' },
            { offset: at(299), opacity: 0, transform: 'scale(0.06)' },
            { offset: at(300), opacity: 1, transform: 'scale(0.06)', easing: IGNITE },
            { offset: at(360), opacity: 1, transform: 'scale(1.08)' },
            { offset: at(480), opacity: 1, transform: 'scale(1)' },
            { offset: 1, opacity: 1, transform: 'scale(1)' },
          ],
          opts,
        ),
        markInner.animate(
          [
            { offset: 0, transform: 'scaleX(1)' },
            { offset: at(520), transform: 'scaleX(1)' },
            { offset: at(810), transform: 'scaleX(1.4)' },
            { offset: at(1100), transform: 'scaleX(1)' },
            { offset: 1, transform: 'scaleX(1)' },
          ],
          opts,
        ),
        core.animate(
          [
            { offset: 0, opacity: 1 },
            { offset: at(1100), opacity: 1 },
            { offset: at(2200), opacity: 0 },
            { offset: 1, opacity: 0 },
          ],
          opts,
        ),
        words.animate(
          [
            { offset: 0, transform: 'translateX(-105%)' },
            { offset: at(520), transform: 'translateX(-105%)' },
            { offset: at(1100), transform: 'translateX(0)' },
            { offset: 1, transform: 'translateX(0)' },
          ],
          opts,
        ),
      );
      const fade = el.animate(
        [
          { offset: 0, opacity: 1 },
          { offset: at(2200), opacity: 1 },
          { offset: 1, opacity: 0 },
        ],
        opts,
      );
      animations.push(fade);
      fade.finished.then(finish, () => {});

      if (sound && SNAP_SOUND.src) {
        const audio = new Audio(SNAP_SOUND.src);
        audio.preload = 'auto';
        const startAt = Math.max(0, at(300) * duration - SNAP_SOUND.peakMs);
        timers.push(window.setTimeout(() => void audio.play().catch(() => {}), startAt));
      }
    }

    return {
      el,
      focus() {
        if (!animations.length && !timers.length) play();
      },
      blur() {},
      handleKey(): KeyResult {
        return 'handled'; // The launch can't be interrupted; the moderator can skip it.
      },
      destroy() {
        animations.forEach((a) => a.cancel());
        timers.forEach((t) => clearTimeout(t));
      },
    };
  },
});
