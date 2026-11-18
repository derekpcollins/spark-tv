/**
 * Registries: modules register by type + variant and declare their options.
 * Adding a variant = one new file + one register() call; nothing else changes.
 */
import type { OptionSchema } from './types.ts';

export interface Registration<F> {
  type: string;
  variant: string;
  label: string; // shown in the moderator panel
  options?: OptionSchema[];
  create: F;
}

export interface Registry<F> {
  readonly kind: string;
  register(reg: Registration<F>): void;
  /** The registration for type + variant, falling back to the type's first variant. */
  get(type: string, variant?: string): Registration<F>;
  has(type: string): boolean;
  types(): string[];
  variants(type: string): { id: string; label: string }[];
  options(type: string): OptionSchema[];
}

export function createRegistry<F>(kind: string): Registry<F> {
  const byType = new Map<string, Registration<F>[]>();

  return {
    kind,
    register(reg) {
      const list = byType.get(reg.type) ?? [];
      if (list.some((r) => r.variant === reg.variant)) {
        throw new Error(`${kind}: ${reg.type}/${reg.variant} is already registered`);
      }
      list.push(reg);
      byType.set(reg.type, list);
    },
    get(type, variant) {
      const list = byType.get(type);
      if (!list?.length) throw new Error(`${kind}: no module registered for type "${type}"`);
      return list.find((r) => r.variant === variant) ?? list[0]!;
    },
    has: (type) => (byType.get(type)?.length ?? 0) > 0,
    types: () => [...byType.keys()],
    variants: (type) => (byType.get(type) ?? []).map((r) => ({ id: r.variant, label: r.label })),
    options(type) {
      const seen = new Map<string, OptionSchema>();
      for (const r of byType.get(type) ?? []) for (const o of r.options ?? []) seen.set(o.id, o);
      return [...seen.values()];
    },
  };
}
