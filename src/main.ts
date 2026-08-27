// Tiny Tracks — application entry point.
// Phase 3 replaces this stub with the app frame (canvas + toybox rail).

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  const greeting = document.createElement("h1");
  greeting.textContent = "🚂 Tiny Tracks";
  app.appendChild(greeting);
}
