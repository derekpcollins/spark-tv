import { describe, expect, it } from 'vitest';
import { cssFirst } from './css-first.ts';

const built = `<!doctype html>
<html lang="en">
  <head>
    <title>Spark TV</title>
    <style>.boot{}</style>
    <script type="module" crossorigin src="/assets/index-abc.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-def.css">
  </head>
  <body>
    <div id="app"></div>
    <script>setTimeout(function () {}, 30000);</script>
  </body>
</html>`;

describe('cssFirst', () => {
  it('moves the stylesheet before the module script', () => {
    const out = cssFirst(built);
    const css = out.indexOf('index-def.css');
    const js = out.indexOf('index-abc.js');
    expect(css).toBeGreaterThan(0);
    expect(css).toBeLessThan(js);
    expect(out.match(/index-def\.css/g)).toHaveLength(1);
    expect(out).toContain(
      '    <link rel="stylesheet" crossorigin href="/assets/index-def.css">\n    <script type="module"',
    );
  });

  it('leaves the body, the inline styles and an already-ordered head alone', () => {
    const once = cssFirst(built);
    expect(cssFirst(once)).toBe(once);
    expect(once.slice(once.indexOf('<body>'))).toBe(built.slice(built.indexOf('<body>')));
    expect(once).toContain('<style>.boot{}</style>');
  });

  it('does nothing without a module script', () => {
    const html = '<html><head><link rel="stylesheet" href="a.css"></head><body></body></html>';
    expect(cssFirst(html)).toBe(html);
  });
});
