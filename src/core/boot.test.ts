import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installImageRetry, runBoot, showBootError, stylesReady, withRetryParam } from './boot.ts';

const root = document.documentElement;
function stylesApplied(on: boolean): void {
  if (on) root.style.setProperty('--styles-ready', '1');
  else root.style.removeProperty('--styles-ready');
}

function addStylesheet(href = '/assets/index.css'): HTMLLinkElement {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.setAttribute('href', href);
  document.head.append(link);
  return link;
}

beforeEach(() => {
  vi.useFakeTimers();
  stylesApplied(false);
  document.head.replaceChildren();
  document.body.replaceChildren();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('withRetryParam', () => {
  it('adds or replaces the retry param and keeps the rest of the URL', () => {
    expect(withRetryParam('/a.css', 1)).toBe('/a.css?retry=1');
    expect(withRetryParam('https://x.org/p.jpg?w=5', 2)).toBe('https://x.org/p.jpg?w=5&retry=2');
    expect(withRetryParam('/a.css?retry=1#x', 2)).toBe('/a.css?retry=2#x');
  });
});

describe('stylesReady', () => {
  it('resolves at once when the stylesheet already applies', async () => {
    stylesApplied(true);
    await expect(stylesReady()).resolves.toBeUndefined();
  });

  it('waits for a late stylesheet (the WebKit startup race)', async () => {
    addStylesheet();
    let done = false;
    void stylesReady().then(() => (done = true));
    await vi.advanceTimersByTimeAsync(500);
    expect(done).toBe(false);
    stylesApplied(true);
    await vi.advanceTimersByTimeAsync(50);
    expect(done).toBe(true);
  });

  const links = () => [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')];

  it('re-requests a stylesheet that fails, then resolves when the retry applies', async () => {
    const first = addStylesheet();
    const ready = stylesReady();
    first.dispatchEvent(new Event('error'));
    expect(links().map((l) => l.getAttribute('href'))).toEqual([
      '/assets/index.css',
      '/assets/index.css?retry=1',
    ]);
    stylesApplied(true);
    links()[1]!.dispatchEvent(new Event('load'));
    await expect(ready).resolves.toBeUndefined();
  });

  it('re-requests a stylesheet that stalls, even when no error event arrives', async () => {
    addStylesheet();
    const ready = stylesReady(document, { stallMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(links().map((l) => l.getAttribute('href'))).toEqual([
      '/assets/index.css',
      '/assets/index.css?retry=1',
    ]);
    stylesApplied(true);
    await vi.advanceTimersByTimeAsync(50);
    await expect(ready).resolves.toBeUndefined();
  });

  it('gives up after its retries', async () => {
    addStylesheet();
    const ready = stylesReady(document, { retries: 2 });
    for (let i = 0; i < 3; i++) links().at(-1)!.dispatchEvent(new Event('error'));
    await expect(ready).rejects.toThrow('stylesheet failed');
    expect(links()).toHaveLength(3);
  });

  it('gives up after the timeout', async () => {
    addStylesheet();
    const ready = stylesReady(document, { timeoutMs: 1000, stallMs: 400 });
    const check = expect(ready).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(1000);
    await check;
  });
});

describe('runBoot', () => {
  const text = () => ({ message: 'Spark TV didn’t load.', retry: 'Retry' });

  it('starts the app only after styles apply, replacing the loading state', async () => {
    const host = document.createElement('div');
    host.innerHTML = '<div class="boot"></div>';
    let release!: () => void;
    const styles = () => new Promise<void>((r) => (release = r));
    const start = vi.fn(() => host.append(document.createElement('main')));
    const booted = runBoot(host, start, { styles, errorText: text });
    await Promise.resolve();
    expect(start).not.toHaveBeenCalled(); // no measuring against unstyled markup
    release();
    await expect(booted).resolves.toBe(true);
    expect(start).toHaveBeenCalledTimes(1);
    expect(host.querySelector('.boot')).toBeNull();
    expect(host.querySelector('main')).not.toBeNull();
  });

  it('shows the error state when styles never load, and never starts the app', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = document.createElement('div');
    const start = vi.fn();
    const onRetry = vi.fn();
    const ok = await runBoot(host, start, {
      styles: () => Promise.reject(new Error('x')),
      errorText: text,
      onRetry,
    });
    expect(ok).toBe(false);
    expect(start).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('didn’t load');
    host.querySelector('button')!.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the error state when the app throws while starting', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const host = document.createElement('div');
    const ok = await runBoot(
      host,
      () => {
        throw new Error('boom');
      },
      { styles: () => Promise.resolve(), errorText: text, onRetry: () => {} },
    );
    expect(ok).toBe(false);
    expect(host.querySelector('.boot--error')).not.toBeNull();
  });
});

describe('showBootError', () => {
  it('retries once on OK from the remote, even when the button click also fires', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const onRetry = vi.fn();
    const button = showBootError(host, { message: 'm', retry: 'Retry' }, onRetry);
    expect(document.activeElement).toBe(button);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    button.click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('installImageRetry', () => {
  it('retries a failed image with backoff, up to the limit', async () => {
    const stop = installImageRetry(document, 2, 100);
    const img = document.createElement('img');
    img.src = 'https://image.tmdb.org/t/p/w500/a.jpg';
    document.body.append(img);
    img.dispatchEvent(new Event('error'));
    await vi.advanceTimersByTimeAsync(100);
    expect(img.getAttribute('src')).toBe('https://image.tmdb.org/t/p/w500/a.jpg?retry=1');
    img.dispatchEvent(new Event('error'));
    await vi.advanceTimersByTimeAsync(200);
    expect(img.getAttribute('src')).toBe('https://image.tmdb.org/t/p/w500/a.jpg?retry=2');
    img.dispatchEvent(new Event('error'));
    await vi.advanceTimersByTimeAsync(1000);
    expect(img.getAttribute('src')).toBe('https://image.tmdb.org/t/p/w500/a.jpg?retry=2');
    stop();
  });

  it('leaves an image alone if the module dropped its src meanwhile', async () => {
    const stop = installImageRetry(document, 2, 100);
    const img = document.createElement('img');
    img.src = '/a.jpg';
    document.body.append(img);
    img.dispatchEvent(new Event('error'));
    img.removeAttribute('src');
    await vi.advanceTimersByTimeAsync(500);
    expect(img.hasAttribute('src')).toBe(false);
    stop();
  });
});
