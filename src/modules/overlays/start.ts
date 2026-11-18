/**
 * Start screen: "Press OK to start". The OK press is the user gesture that unlocks audio
 * for the launch snap, and the screen doubles as the reset point between participants.
 */
import { overlays } from '../../core/app-registries.ts';
import type { Key, KeyResult } from '../../core/types.ts';

/** Browsers allow audio after a user gesture; resuming a context inside the key handler unlocks it. */
function unlockAudio(): void {
  try {
    const Ctx = window.AudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    void ctx.resume().then(() => ctx.close());
  } catch {
    /* no audio available: the launch runs silently */
  }
}

overlays.register({
  type: 'start',
  variant: 'default',
  label: 'Start screen',
  create(props, ctx) {
    const onStart = props.onStart as () => void;
    const el = document.createElement('div');
    el.className = 'overlay start';
    const prompt = document.createElement('p');
    prompt.className = 'start__prompt';
    prompt.textContent = ctx.t('start.prompt');
    el.append(prompt);
    return {
      el,
      focus() {},
      blur() {},
      handleKey(key: Key): KeyResult {
        if (key === 'ok') {
          unlockAudio();
          onStart();
        }
        return 'handled'; // Back does nothing here: this is the reset point.
      },
      destroy() {},
    };
  },
});
