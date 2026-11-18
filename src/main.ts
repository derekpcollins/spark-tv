import tokens from '../design/tokens.json';
import { applyTokens } from './core/tokens.ts';
import { mountCanvas } from './core/canvas.ts';
import './styles/base.css';

applyTokens(tokens);
const canvas = mountCanvas(document.querySelector<HTMLElement>('#app')!);

const wordmark = document.createElement('div');
wordmark.className = 'wordmark';
wordmark.textContent = 'Spark TV';
wordmark.style.cssText =
  'position:absolute;inset:0;display:grid;place-items:center;font-size:var(--font-size-xxl);font-weight:var(--font-weight-bold);color:var(--color-brand-wordmark)';
canvas.append(wordmark);
