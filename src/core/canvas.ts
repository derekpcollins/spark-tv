/**
 * Fixed 1920×1080 canvas, scaled to fit the window with one CSS transform
 * and letterboxed when the aspect ratio differs. Components measure with
 * offsetWidth/offsetHeight (unscaled), never getBoundingClientRect.
 */
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;

export function fitScale(viewportWidth: number, viewportHeight: number): number {
  return Math.min(viewportWidth / CANVAS_WIDTH, viewportHeight / CANVAS_HEIGHT);
}

export function mountCanvas(host: HTMLElement): HTMLElement {
  const stage = document.createElement('div');
  stage.className = 'stage';
  const canvas = document.createElement('div');
  canvas.className = 'canvas';
  stage.append(canvas);
  host.append(stage);

  const layout = (): void => {
    const scale = fitScale(window.innerWidth, window.innerHeight);
    const x = (window.innerWidth - CANVAS_WIDTH * scale) / 2;
    const y = (window.innerHeight - CANVAS_HEIGHT * scale) / 2;
    canvas.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  };
  layout();
  window.addEventListener('resize', layout);
  return canvas;
}
