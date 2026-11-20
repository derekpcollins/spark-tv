/**
 * Startup guards. The page measures section heights when it's built, so it must not be built
 * until the stylesheet is applied: WebKit runs the module script without waiting for the
 * `<link rel="stylesheet">` that follows it, and heights measured on unstyled markup put every
 * section in the wrong place (the header scrolled off, rows misplaced).
 *
 * - stylesReady: waits for the `--styles-ready` sentinel from base.css, re-requesting a
 *   stylesheet that fails, and rejects after a timeout.
 * - installImageRetry: retries any image that fails to load, with backoff.
 * - showBootError: the error state with a Retry button. It's styled by index.html's inline
 *   boot styles, so it still works when the stylesheet is what failed.
 */

import { bindKeys } from './keymap.ts';

const SENTINEL = '--styles-ready';

export interface StylesOptions {
  /** Give up (reject) after this long without styles. */
  timeoutMs?: number;
  /** How many times to request the stylesheets again. */
  retries?: number;
  /** Request again if styles still don't apply after this long, even without an error event. */
  stallMs?: number;
  pollMs?: number;
}

function sentinelPresent(doc: Document): boolean {
  return doc.defaultView?.getComputedStyle(doc.documentElement).getPropertyValue(SENTINEL).trim() === '1';
}

/** Add (or replace) a `retry` query param, so a retried request can't be answered by a failed cache entry. */
export function withRetryParam(url: string, attempt: number): string {
  const [rest = '', hash] = url.split('#');
  const [path = '', query] = rest.split('?');
  const params = new URLSearchParams(query);
  params.set('retry', String(attempt));
  return `${path}?${params.toString()}${hash ? `#${hash}` : ''}`;
}

export function stylesReady(doc: Document = document, opts: StylesOptions = {}): Promise<void> {
  const { timeoutMs = 20_000, retries = 2, stallMs = 4_000, pollMs = 50 } = opts;
  if (sentinelPresent(doc)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const originals = [...doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')];
    const attemptOf = new WeakMap<HTMLLinkElement, number>();
    const cleanups: (() => void)[] = [];
    let attempt = 0;
    let settled = false;
    const finish = (err?: Error): void => {
      if (settled) return;
      settled = true;
      cleanups.forEach((c) => c());
      if (err) reject(err);
      else resolve();
    };
    const check = (): void => {
      if (sentinelPresent(doc)) finish();
    };

    // Request every stylesheet again. The old links stay, in case they're only slow.
    const newest = new Map(originals.map((l) => [l, l]));
    const retry = (): void => {
      attempt++;
      originals.forEach((link) => {
        const next = link.cloneNode() as HTMLLinkElement;
        next.href = withRetryParam(link.getAttribute('href') ?? link.href, attempt);
        attemptOf.set(next, attempt);
        newest.get(link)!.after(next); // keep the stylesheets' cascade order
        newest.set(link, next);
        watch(next);
      });
    };

    function watch(link: HTMLLinkElement): void {
      const onLoad = (): void => check();
      const onError = (): void => {
        if ((attemptOf.get(link) ?? 0) < attempt) return; // a newer attempt is in flight
        if (attempt < retries) retry();
        else finish(new Error(`stylesheet failed: ${link.href}`));
      };
      link.addEventListener('load', onLoad);
      link.addEventListener('error', onError);
      cleanups.push(() => {
        link.removeEventListener('load', onLoad);
        link.removeEventListener('error', onError);
      });
    }
    originals.forEach(watch);

    // Polling covers stylesheets that finished before we started listening, and dev, where
    // Vite injects styles from JS. The stall timer covers a stylesheet that failed before we
    // were listening (WebKit can fail it before the module runs), so no error event comes.
    const poll = setInterval(check, pollMs);
    const stall = setInterval(() => attempt < retries && retry(), stallMs);
    const timer = setTimeout(() => finish(new Error('stylesheet timed out')), timeoutMs);
    cleanups.push(() => {
      clearInterval(poll);
      clearInterval(stall);
      clearTimeout(timer);
    });
  });
}

/** Retry failed images (any `<img>` under root) up to `retries` times, waiting longer each time. */
export function installImageRetry(
  root: Document | HTMLElement = document,
  retries = 2,
  baseDelayMs = 800,
): () => void {
  const onError = (e: Event): void => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    const src = img.getAttribute('src');
    if (!src) return;
    const n = Number(img.dataset.retries ?? 0) + 1;
    if (n > retries) return;
    img.dataset.retries = String(n);
    setTimeout(() => {
      // Skip if the module dropped or replaced the image meanwhile (unmounted, recycled).
      if (img.getAttribute('src') === src) img.src = withRetryParam(src, n);
    }, baseDelayMs * n);
  };
  root.addEventListener('error', onError, true); // image errors don't bubble; capture them
  return () => root.removeEventListener('error', onError, true);
}

export interface BootErrorText {
  message: string;
  retry: string;
}

/** Replace host's content with the error state. Retry reloads the page by default. */
export function showBootError(
  host: HTMLElement,
  text: BootErrorText,
  onRetry: () => void = () => location.reload(),
): HTMLButtonElement {
  let retried = false;
  const retry = (): void => {
    if (retried) return; // Enter on the focused button fires both the click and the keymap
    retried = true;
    unbind();
    onRetry();
  };
  const box = document.createElement('div');
  box.className = 'boot boot--error';
  box.setAttribute('role', 'alert');
  const msg = document.createElement('p');
  msg.className = 'boot__message';
  msg.textContent = text.message;
  const button = document.createElement('button');
  button.className = 'boot__retry';
  button.type = 'button';
  button.textContent = text.retry;
  button.addEventListener('click', retry);
  box.append(msg, button);
  host.replaceChildren(box);
  button.focus();
  // The app never bound its keys, so OK on the remote is wired here, through the keymap.
  const unbind = bindKeys(window, (key) => {
    if (key === 'ok') retry();
  });
  return button;
}

export interface BootDeps {
  /** Resolves once styles apply; defaults to stylesReady(). */
  styles?: () => Promise<void>;
  /** Text for the error state, resolved lazily (only on failure). */
  errorText: () => BootErrorText;
  onRetry?: () => void;
}

/**
 * Wait for styles, clear the loading state and start the app; on any failure, log it and show
 * the error state. Returns whether the app started.
 */
export async function runBoot(host: HTMLElement, start: () => void, deps: BootDeps): Promise<boolean> {
  try {
    await (deps.styles ?? stylesReady)();
    host.replaceChildren(); // drop index.html's loading state
    start();
    return true;
  } catch (err) {
    console.error('[spark-tv] startup failed', err);
    showBootError(host, deps.errorText(), deps.onRetry);
    return false;
  }
}
