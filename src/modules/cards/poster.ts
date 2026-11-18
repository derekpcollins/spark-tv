import { cards } from '../../core/app-registries.ts';
import { px } from '../../core/layout-tokens.ts';
import { titleCard } from './title-card.ts';

cards.register({
  type: 'poster',
  variant: 'default',
  label: 'Poster (2:3)',
  create: (id, ctx) => titleCard(id, ctx, 'poster', px('card', 'poster-width')),
});
