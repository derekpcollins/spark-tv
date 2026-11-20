import '@fontsource/unbounded/latin-300.css';
import tokens from '../design/tokens.json';
import { applyTokens } from './core/tokens.ts';
import { installImageRetry, runBoot } from './core/boot.ts';
import { mountCanvas } from './core/canvas.ts';
import { createI18n } from './core/i18n.ts';
import { browserPersistence, fromParams, resolveInitial } from './core/store.ts';
import { startApp } from './app.ts';
import './styles/base.css';
import './styles/brand.css';
import './styles/ui.css';

const host = document.querySelector<HTMLElement>('#app')!;
window.sparkBooted = true; // index.html's watchdog stands down

applyTokens(tokens);
installImageRetry();
// The page measures section heights as it's built, so it's built only once styles apply.
void runBoot(host, () => startApp(mountCanvas(host)), {
  errorText: () => {
    const params = new URLSearchParams(location.search);
    const locale = resolveInitial(browserPersistence.load(), fromParams(params)).locale;
    const t = createI18n(() => locale);
    return { message: t('boot.error'), retry: t('boot.retry') };
  },
});
