/** Numeric layout values from design/tokens.json, for code that positions things. */
import tokens from '../../design/tokens.json';

type Group = 'layout' | 'card';

export function px(group: Group, name: string): number {
  const value = (tokens[group] as Record<string, string>)[name];
  if (!value) throw new Error(`Unknown token ${group}.${name}`);
  return parseFloat(value);
}
