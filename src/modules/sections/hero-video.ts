/** Hero A: full-bleed video billboard. Spark Free slides play their trailer (muted unless the option is on). */
import { sections } from '../../core/app-registries.ts';
import { createHero } from './hero-shared.ts';

sections.register({
  type: 'hero',
  variant: 'A',
  label: 'Video billboard',
  options: [
    { id: 'dots', label: 'opt.heroDots', kind: 'toggle', default: true },
    { id: 'sound', label: 'opt.heroSound', kind: 'toggle', default: false },
  ],
  create: (config, ctx) => createHero(config, ctx, { video: true }),
});
