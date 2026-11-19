/**
 * Ad banner: a full-width third-party ad card, the same size and treatment as the Credits
 * banner. The image is a background crop on R2; the advertiser's name and tagline are live,
 * translated text over a left-to-right scrim. An "Ad" badge marks it as paid placement.
 * Takes focus like any card; OK does nothing. Hidden entirely when the `visible` option is off.
 */
import { assetUrl } from '../../config.ts';
import { sections } from '../../core/app-registries.ts';
import type { Key, KeyResult } from '../../core/types.ts';

/** Advertisers, keyed by the layout's `ad` field. Images are cut by `npm run ads`. */
const ADS: Record<string, { image: string; name: string; tagline: string }> = {
  northwake: {
    image: 'ads/northwake-banner.webp',
    name: 'ad.northwake.name',
    tagline: 'ad.northwake.tagline',
  },
};

sections.register({
  type: 'ad',
  variant: 'banner',
  label: 'Banner',
  options: [{ id: 'visible', label: 'opt.adVisible', kind: 'toggle', default: true }],
  create(config, ctx) {
    const ad = ADS[config.ad ?? 'northwake'] ?? ADS.northwake!;
    const el = document.createElement('section');
    el.className = 'ad';
    const frame = document.createElement('div');
    frame.className = 'ad__frame button';

    const media = document.createElement('div');
    media.className = 'ad__media';
    const img = document.createElement('img');
    img.className = 'ad__img';
    img.alt = '';
    img.setAttribute('loading', 'lazy');
    img.decoding = 'async';
    img.addEventListener('load', () => media.classList.add('is-loaded'), { once: true });
    img.src = assetUrl(ad.image);
    const scrim = document.createElement('div');
    scrim.className = 'ad__scrim';
    media.append(img, scrim);

    const text = document.createElement('div');
    text.className = 'ad__text';
    const name = document.createElement('div');
    name.className = 'ad__name';
    name.textContent = ctx.t(ad.name);
    const tagline = document.createElement('div');
    tagline.className = 'ad__tagline';
    tagline.textContent = ctx.t(ad.tagline);
    text.append(name, tagline);

    const badge = document.createElement('span');
    badge.className = 'ad__badge';
    badge.textContent = ctx.t('ad.badge');

    frame.append(media, text, badge);
    el.append(frame);

    return {
      el,
      focus: () => frame.classList.add('is-focused'),
      blur: () => frame.classList.remove('is-focused'),
      handleKey(key: Key): KeyResult {
        if (key === 'up') return 'exit-up';
        if (key === 'down') return 'exit-down';
        if (key === 'back') return 'back';
        return 'handled'; // OK does nothing
      },
      destroy() {
        img.removeAttribute('src');
      },
    };
  },
});
