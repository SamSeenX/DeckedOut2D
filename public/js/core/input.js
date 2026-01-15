export const keys = {};
export const mouse = { x: 0, y: 0 };

// Keys that should not trigger browser defaults during gameplay
const GAME_KEYS = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyE",
  "KeyF",
  "ShiftLeft",
  "ShiftRight",
];

let gameActive = false;

export function setGameActive(active) {
  gameActive = active;
}

export function initInput(canvas) {
  // Make canvas focusable
  canvas.tabIndex = 1;
  canvas.style.outline = "none"; // Hide focus outline

  // Focus canvas on click
  canvas.addEventListener("click", () => {
    canvas.focus();
  });

  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;

    // Prevent default browser actions for game keys when game is active
    if (gameActive && GAME_KEYS.includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });

  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / canvas.width) * 2 - 1;
    mouse.y = ((e.clientY - rect.top) / canvas.height) * 2 - 1;
  });

  // Debug mode toggle (Shift + `)
  window.addEventListener("keydown", (e) => {
    if (e.code === "Backquote" && e.shiftKey) {
      window.debugMode = !window.debugMode;
      console.log("Debug Mode:", window.debugMode);

      // Show toast if available
      if (window.showToast) {
        window.showToast(
          window.debugMode ? "🔧 Debug Mode ON" : "Debug Mode OFF",
          2000
        );
      }

      // Turn off god mode when debug mode is disabled
      if (!window.debugMode) {
        window.godMode = false;
      }
    }

    // God Mode toggle (G key, only when debug mode is active)
    if (e.code === "KeyG" && window.debugMode) {
      window.godMode = !window.godMode;
      console.log("God Mode:", window.godMode);

      if (window.showToast) {
        window.showToast(
          window.godMode
            ? "⚡ GOD MODE ON - No clip, No damage"
            : "God Mode OFF",
          2000
        );
      }
    }
  });
}
