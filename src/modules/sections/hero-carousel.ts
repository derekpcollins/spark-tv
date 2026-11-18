/** Hero B: static carousel (backdrops only). */
import { sections } from '../../core/app-registries.ts';
import { createHero } from './hero-shared.ts';

sections.register({
  type: 'hero',
  variant: 'B',
  label: 'Static carousel',
  options: [{ id: 'dots', label: 'opt.heroDots', kind: 'toggle', default: true }],
  create: (config, ctx) => createHero(config, ctx, { video: false }),
});
