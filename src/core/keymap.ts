/**
 * The one place keyboard input is read. Remote/FLIRC codes are added to the bindings,
 * never to navigation code. Back accepts Escape and Backspace.
 */
import type { Key } from './types.ts';

export type Bindings = Record<string, Key>;

/** KeyboardEvent.key (or .code) → app key. */
export const DEFAULT_BINDINGS: Bindings = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Enter: 'ok',
  NumpadEnter: 'ok',
  Escape: 'back',
  Backspace: 'back',
  BrowserBack: 'back',
  GoBack: 'back',
  MediaPlayPause: 'playpause',
  ' ': 'playpause',
};

export function resolveKey(
  event: Pick<KeyboardEvent, 'key' | 'code'>,
  bindings: Bindings = DEFAULT_BINDINGS,
): Key | null {
  return bindings[event.key] ?? bindings[event.code] ?? null;
}

/**
 * Listens on `target` and calls `handler` with app keys. Held arrows repeat;
 * OK and Back don't, so a held button can't fire twice.
 */
export function bindKeys(
  target: Pick<Window, 'addEventListener' | 'removeEventListener'>,
  handler: (key: Key) => void,
  bindings: Bindings = DEFAULT_BINDINGS,
): () => void {
  const listener = (event: KeyboardEvent): void => {
    const key = resolveKey(event, bindings);
    if (!key) return;
    event.preventDefault();
    if (event.repeat && (key === 'ok' || key === 'back' || key === 'playpause')) return;
    handler(key);
  };
  target.addEventListener('keydown', listener as EventListener);
  return () => target.removeEventListener('keydown', listener as EventListener);
}
