/** App configuration that isn't a design token. */

/** Moderator panel key sequence: `key` pressed `count` times within `windowMs`. Map a remote button to this key through FLIRC. */
export const MODERATOR_SEQUENCE = { key: 'm', count: 3, windowMs: 1500 };

/**
 * Launch snap sound. `src` stays null (silence) until the recorded snap lands in
 * public/assets/audio/. `peakMs` is where the snap's peak sits inside the file, so playback
 * starts early enough for the peak to hit 300 ms into the timeline.
 */
export const SNAP_SOUND: { src: string | null; peakMs: number } = { src: null, peakMs: 0 };

/** The launch timeline in ms at its default length (docs/SPEC.md, "Launch sequence"). */
export const LAUNCH_TIMELINE_MS = 2700;
export const LAUNCH_DURATIONS = [1800, 2700, 4000];
