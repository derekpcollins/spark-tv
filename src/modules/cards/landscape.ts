import { cards } from '../../core/app-registries.ts';
import { px } from '../../core/layout-tokens.ts';
import { titleCard } from './title-card.ts';

cards.register({
  type: 'landscape',
  variant: 'default',
  label: 'Landscape (16:9)',
  create: (id, ctx) => titleCard(id, ctx, 'landscape', px('card', 'landscape-width')),
});
