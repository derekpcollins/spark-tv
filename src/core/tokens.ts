/**
 * Design tokens: design/tokens.json flattened into CSS custom properties.
 * `{color.raw.white}` references are resolved; paths become `--color-raw-white`.
 */
type TokenTree = { [key: string]: string | TokenTree };

const REF = /^\{([^}]+)\}$/;

function lookup(tree: TokenTree, path: string): string | TokenTree | undefined {
  let node: string | TokenTree | undefined = tree;
  for (const part of path.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[part];
  }
  return node;
}

function resolve(tree: TokenTree, value: string, seen: Set<string> = new Set()): string {
  const match = REF.exec(value);
  if (!match) return value;
  const path = match[1] ?? '';
  if (seen.has(path)) throw new Error(`Circular token reference: ${path}`);
  const target = lookup(tree, path);
  if (typeof target !== 'string') throw new Error(`Unknown token reference: ${path}`);
  seen.add(path);
  return resolve(tree, target, seen);
}

export function flattenTokens(tree: TokenTree): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (node: TokenTree, prefix: string[]): void => {
    for (const [key, value] of Object.entries(node)) {
      const path = [...prefix, key];
      if (typeof value === 'string') out[`--${path.join('-')}`] = resolve(tree, value);
      else walk(value, path);
    }
  };
  walk(tree, []);
  return out;
}

export function applyTokens(tree: TokenTree, target: HTMLElement = document.documentElement): void {
  for (const [name, value] of Object.entries(flattenTokens(tree))) {
    target.style.setProperty(name, value);
  }
}
