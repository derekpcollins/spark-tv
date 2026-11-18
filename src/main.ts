import '@fontsource/unbounded/latin-300.css';
import tokens from '../design/tokens.json';
import { applyTokens } from './core/tokens.ts';
import { mountCanvas } from './core/canvas.ts';
import { startApp } from './app.ts';
import './styles/base.css';
import './styles/brand.css';
import './styles/ui.css';

applyTokens(tokens);
startApp(mountCanvas(document.querySelector<HTMLElement>('#app')!));
