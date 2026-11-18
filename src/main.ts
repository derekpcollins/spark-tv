import '@fontsource/unbounded/latin-300.css';
import tokens from '../design/tokens.json';
import { applyTokens } from './core/tokens.ts';
import { mountCanvas } from './core/canvas.ts';
import { createWordmark } from './brand/wordmark.ts';
import './styles/base.css';
import './styles/brand.css';

applyTokens(tokens);
const canvas = mountCanvas(document.querySelector<HTMLElement>('#app')!);

// Placeholder until Home lands in Milestone 1: the stacked lockup, centered.
const holder = document.createElement('div');
holder.className = 'placeholder-center';
holder.append(createWordmark({ fontSize: 56, lockup: 'stacked' }));
canvas.append(holder);
