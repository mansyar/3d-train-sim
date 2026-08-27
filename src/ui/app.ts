export function mountApp(root: HTMLElement): void {
  root.innerHTML = `
    <canvas id="scene-canvas" aria-label="Tiny Tracks 3D world"></canvas>
    <div class='toybox-rail' role='toolbar' aria-label='Toy box'>
      <button class='toy-slot' type='button' aria-label='Track pieces (coming soon)'>🛤️</button>
      <button class='toy-slot' type='button' aria-label='Scenery (coming soon)'>🌳</button>
      <button class='toy-slot' type='button' aria-label='Trains (coming soon)'>🚂</button>
    </div>
  `;
}
