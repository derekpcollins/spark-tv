/**
 * Vite plugin: put the built stylesheet `<link>`s before the module `<script>` in index.html.
 * Vite emits the script first. Chrome waits for the stylesheet anyway, but WebKit (Safari)
 * runs the script as soon as it arrives, so the app could start before its CSS applied.
 * `stylesReady()` in src/core/boot.ts stays as the safety net.
 */
import type { Plugin } from 'vite';

const STYLESHEET = /[ \t]*<link\b[^>]*\brel=["']stylesheet["'][^>]*>[ \t]*\r?\n?/gi;
const MODULE_SCRIPT = /[ \t]*<script\b[^>]*\btype=["']module["'][^>]*\bsrc=[^>]*>\s*<\/script>/i;

/** Move every stylesheet link in <head> to just before the first module script with a src. */
export function cssFirst(html: string): string {
  const headEnd = html.search(/<\/head>/i);
  if (headEnd < 0) return html;
  const head = html.slice(0, headEnd);
  const script = MODULE_SCRIPT.exec(head);
  if (!script) return html;
  const links = head.slice(script.index).match(STYLESHEET);
  if (!links) return html;
  const indent = /^[ \t]*/.exec(script[0])![0];
  const before = head.slice(0, script.index);
  const after = head.slice(script.index).replace(STYLESHEET, '');
  const moved = links.map((l) => `${indent}${l.trim()}\n`).join('');
  return before + moved + after + html.slice(headEnd);
}

export function cssFirstPlugin(): Plugin {
  return {
    name: 'spark-tv:css-first',
    apply: 'build',
    transformIndexHtml: { order: 'post', handler: cssFirst },
  };
}
