export function mountApp(root: HTMLElement): HTMLCanvasElement {
  root.innerHTML = `
    <canvas class="scene-canvas" aria-label="Tiny Tracks 3D world"></canvas>
    <div class='toybox-rail' role='toolbar' aria-label='Toy box'>
      <button class='toy-slot' type='button' aria-label='Track pieces (coming soon)'>🛤️</button>
      <button class='toy-slot' type='button' aria-label='Scenery (coming soon)'>🌳</button>
      <button class='toy-slot' type='button' aria-label='Trains (coming soon)'>🚂</button>
    </div>
  `;
  const canvas = root.querySelector<HTMLCanvasElement>('.scene-canvas');
  if (!canvas) {
    throw new Error('scene canvas missing from app frame');
  }
  return canvas;
}
