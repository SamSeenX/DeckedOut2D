import { map } from "../data/map.js";
import {
  PLAYER_MAX_HP,
  COMPASS_UPDATE_INTERVAL,
  COMPASS_ROTATION_STEP,
  HAZE_CRITICAL_THRESHOLD,
} from "../data/config.js";
import { stopHeartbeatSystem, stopAmbientAudio } from "./audio.js";
import { triggerHaptic, HAPTIC_MALFUNCTION } from "./haptics.js";

// ============================================
// DOM ELEMENT CACHE (Populated once on init)
// ============================================
let domCache = {
  hazeContainer: null,
  hpContainer: null,
  emberDisplay: null,
  foodDisplay: null,
  artifactIcon: null,
  compassNeedle: null,
  compassContainer: null,
  hazeBars: [], // Pre-created haze bar elements
  hearts: [], // Pre-created heart elements
};

// Previous state for dirty checking (only update DOM when values change)
let prevState = {
  haze: -1,
  hp: -1,
  embers: -1,
  food: -1,
  hasArtifact: null,
};

let lastCompassUpdate = 0;
let uiInitialized = false;

/**
 * Initialize UI element cache - call once after DOM is ready
 */
export function initUI() {
  if (uiInitialized) return;

  // Cache frequently accessed elements
  domCache.hazeContainer = document.getElementById("haze-meter-container");
  domCache.hpContainer = document.getElementById("hp-container");
  domCache.emberDisplay = document.getElementById("ember-display");
  domCache.foodDisplay = document.getElementById("food-display");
  domCache.artifactIcon = document.getElementById("artifact-icon");
  domCache.compassNeedle = document.getElementById("compass-needle");
  domCache.compassContainer = document.getElementById("compass-container");

  // Pre-create haze bars (20 bars for 100 max haze / 5 per bar)
  if (domCache.hazeContainer) {
    domCache.hazeContainer.innerHTML = "";
    for (let i = 0; i < 20; i++) {
      const bar = document.createElement("div");
      bar.classList.add("haze-bar");
      domCache.hazeContainer.appendChild(bar);
      domCache.hazeBars.push(bar);
    }
  }

  // Pre-create heart elements
  if (domCache.hpContainer) {
    domCache.hpContainer.innerHTML = "";
    for (let i = 0; i < PLAYER_MAX_HP; i++) {
      const heart = document.createElement("div");
      heart.classList.add("heart", "full");
      domCache.hpContainer.appendChild(heart);
      domCache.hearts.push(heart);
    }
  }

  uiInitialized = true;
}

/**
 * Main UI update function - called every frame
 * Optimized to only update DOM when values actually change
 */
export function updateUI(gameState, player) {
  // Ensure UI is initialized
  if (!uiInitialized) initUI();

  // --- HAZE METER (only update when haze changes significantly) ---
  const currentHazeBar = Math.floor(gameState.haze / 5);
  const currentHazeRemainder = gameState.haze % 5;
  const prevHazeBar = Math.floor(prevState.haze / 5);
  const prevHazeRemainder = prevState.haze % 5;

  // Only update if bar count or remainder changed (rounded to 0.5 for smooth transitions)
  if (
    currentHazeBar !== prevHazeBar ||
    Math.floor(currentHazeRemainder * 2) !== Math.floor(prevHazeRemainder * 2)
  ) {
    const hazePerBar = 5;
    const fullBars = Math.floor(gameState.haze / hazePerBar);
    const remainder = gameState.haze % hazePerBar;

    for (let i = 0; i < domCache.hazeBars.length; i++) {
      const bar = domCache.hazeBars[i];

      if (i < fullBars) {
        bar.classList.add("filled");
        bar.style.opacity = "1";
      } else if (i === fullBars && remainder > 0) {
        bar.classList.add("filled");
        const opacity = 0.2 + (remainder / hazePerBar) * 0.8;
        bar.style.opacity = opacity.toFixed(2);
      } else {
        bar.classList.remove("filled");
        bar.style.opacity = "1";
      }
    }
    prevState.haze = gameState.haze;
  }

  // --- HEARTS (only update when HP changes) ---
  const currentHP = Math.floor(player.hp);
  if (currentHP !== prevState.hp) {
    for (let i = 0; i < domCache.hearts.length; i++) {
      const heart = domCache.hearts[i];
      if (i < currentHP) {
        heart.classList.add("full");
        heart.classList.remove("empty");
      } else {
        heart.classList.remove("full");
        heart.classList.add("empty");
      }
    }
    prevState.hp = currentHP;
  }

  // --- EMBERS (only update when changed) ---
  if (gameState.embers !== prevState.embers) {
    domCache.emberDisplay.innerText = gameState.embers;
    prevState.embers = gameState.embers;
  }

  // --- FOOD (only update when changed) ---
  if (gameState.inventory.food !== prevState.food) {
    domCache.foodDisplay.innerText = gameState.inventory.food;
    prevState.food = gameState.inventory.food;
  }

  // --- ARTIFACT ICON (only update when hasArtifact changes) ---
  if (gameState.hasArtifact !== prevState.hasArtifact) {
    const artIcon = domCache.artifactIcon;
    if (gameState.hasArtifact) {
      const iconFile = gameState.targetArtifactItem?.icon;
      if (iconFile) {
        artIcon.innerHTML = `<img src="/assets/artifacts/${iconFile}" alt="${gameState.targetArtifactItem.name}">`;
      } else {
        artIcon.textContent = "👑";
      }
      artIcon.classList.remove("empty");
      artIcon.title = gameState.targetArtifactItem?.name || "Artifact";
    } else {
      artIcon.textContent = "?";
      artIcon.classList.add("empty");
    }
    prevState.hasArtifact = gameState.hasArtifact;
  }

  // --- COMPASS (Throttled - already optimized) ---
  const now = Date.now();
  if (now - lastCompassUpdate > COMPASS_UPDATE_INTERVAL) {
    lastCompassUpdate = now;

    let target = null;

    if (!gameState.hasArtifact) {
      target = gameState.targetArtifactLoc;
    } else {
      // Find nearest exit using cached exitSpots (efficient - no map iteration)
      if (gameState.exitSpots && gameState.exitSpots.length > 0) {
        let minDistSq = Infinity;
        for (const exit of gameState.exitSpots) {
          // Use squared distance to avoid Math.sqrt
          const dSq = (player.x - exit.x) ** 2 + (player.y - exit.y) ** 2;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            target = exit;
          }
        }
      }
    }

    const needle = domCache.compassNeedle;
    const container = domCache.compassContainer;

    if (target) {
      const dx = target.x + 0.5 - player.x;
      const dy = target.y + 0.5 - player.y;
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);

      if (gameState.haze >= HAZE_CRITICAL_THRESHOLD) {
        angle = Math.random() * 360;
        needle.style.filter = "hue-rotate(45deg) drop-shadow(0 0 5px red)";
        container.style.borderColor = "#ff0000";
        if (Math.random() < 0.1) triggerHaptic(HAPTIC_MALFUNCTION);
      } else {
        needle.style.filter = "none";
        if (COMPASS_ROTATION_STEP > 0) {
          angle =
            Math.round(angle / COMPASS_ROTATION_STEP) * COMPASS_ROTATION_STEP;
        }
      }

      needle.style.transform = `rotate(${angle}deg)`;
      needle.style.opacity = "1";

      if (gameState.haze < HAZE_CRITICAL_THRESHOLD) {
        if (!gameState.hasArtifact) {
          container.style.borderColor = "#ffd700";
          needle.style.color = "#ff0000";
        } else {
          container.style.borderColor = "#00ff00";
          needle.style.color = "#00ff00";
        }
      }
    } else {
      needle.style.opacity = "0.3";
    }
  }
}

export function showToast(message, duration = 3000) {
  let toast = document.getElementById("toast-message");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-message";
    document.body.appendChild(toast);
  }

  toast.classList.remove("exiting");
  toast.classList.remove("visible");
  void toast.offsetWidth; // Force reflow

  toast.textContent = message;
  toast.classList.add("visible");

  if (toast.timeout) clearTimeout(toast.timeout);
  if (toast.exitTimeout) clearTimeout(toast.exitTimeout);

  toast.timeout = setTimeout(() => {
    toast.classList.add("exiting");
    toast.exitTimeout = setTimeout(() => {
      toast.classList.remove("visible");
      toast.classList.remove("exiting");
    }, 500);
  }, duration);
}
/**
 * Play artifact collection animation
 * Icon pops up from world position and flies to the HUD slot
 * With glowing particle effects
 */
export function playArtifactCollectAnimation(
  worldX,
  worldY,
  camX,
  camY,
  tileSize,
  iconPath
) {
  const canvas = document.getElementById("gameCanvas");
  const container = document.getElementById("game-container");
  const artifactSlot = document.getElementById("artifact-icon");

  if (!canvas || !container || !artifactSlot) return;

  // Calculate screen position of artifact in world
  const canvasRect = canvas.getBoundingClientRect();
  const startX = canvasRect.left + (worldX - camX) * tileSize;
  const startY = canvasRect.top + (worldY - camY) * tileSize;

  // Get target position (artifact slot in HUD)
  const slotRect = artifactSlot.getBoundingClientRect();
  const endX = slotRect.left + slotRect.width / 2;
  const endY = slotRect.top + slotRect.height / 2;

  // Create particle container
  const particleContainer = document.createElement("div");
  particleContainer.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    z-index: 9998;
    pointer-events: none;
    overflow: hidden;
  `;
  container.appendChild(particleContainer);

  // Spawn glowing particles around the artifact
  function spawnParticle(originX, originY, delay) {
    setTimeout(() => {
      const particle = document.createElement("div");
      const angle = Math.random() * Math.PI * 2;
      const distance = 30 + Math.random() * 40;
      const size = 4 + Math.random() * 8;
      const duration = 0.6 + Math.random() * 0.4;

      // Random gold/white color
      const colors = ["#ffd700", "#fff8dc", "#ffec8b", "#ffffff", "#ffa500"];
      const color = colors[Math.floor(Math.random() * colors.length)];

      particle.style.cssText = `
        position: fixed;
        left: ${originX}px;
        top: ${originY}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        box-shadow: 0 0 ${size * 2}px ${color}, 0 0 ${size * 4}px ${color};
        transform: translate(-50%, -50%) scale(0);
        opacity: 1;
        z-index: 9999;
      `;

      particleContainer.appendChild(particle);
      void particle.offsetWidth;

      // Animate outward then fade
      particle.style.transition = `all ${duration}s ease-out`;
      particle.style.transform = `translate(
        calc(-50% + ${Math.cos(angle) * distance}px), 
        calc(-50% + ${Math.sin(angle) * distance}px)
      ) scale(1)`;
      particle.style.opacity = "0";

      setTimeout(() => particle.remove(), duration * 1000);
    }, delay);
  }

  // Create floating artifact element - start VERY small
  const floatingIcon = document.createElement("div");
  floatingIcon.className = "artifact-collect-anim";
  floatingIcon.innerHTML = `<img src="${iconPath}" alt="Artifact">`;
  floatingIcon.style.cssText = `
    position: fixed;
    left: ${startX}px;
    top: ${startY}px;
    width: 120px;
    height: 120px;
    z-index: 9999;
    pointer-events: none;
    transform: translate(-50%, -50%) translateY(40px) scale(0);
    filter: drop-shadow(0 0 10px gold);
  `;

  const img = floatingIcon.querySelector("img");
  img.style.cssText = `
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  `;

  container.appendChild(floatingIcon);

  // Force reflow
  void floatingIcon.offsetWidth;

  // === PHASE 1: Pop up from ground - GROW LARGE (0-500ms) ===
  floatingIcon.style.transition =
    "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.5s ease";
  floatingIcon.style.transform =
    "translate(-50%, -50%) translateY(-80px) scale(1.5)";
  floatingIcon.style.filter =
    "drop-shadow(0 0 30px gold) drop-shadow(0 0 15px white)";

  // Spawn burst of particles
  for (let i = 0; i < 12; i++) {
    spawnParticle(startX, startY - 20, i * 30);
  }

  // === PHASE 2: Hold and pulse at max size (500-900ms) ===
  setTimeout(() => {
    floatingIcon.style.transition =
      "transform 0.4s ease-in-out, filter 0.4s ease";
    floatingIcon.style.transform =
      "translate(-50%, -50%) translateY(-100px) scale(1.3)";
    floatingIcon.style.filter =
      "drop-shadow(0 0 40px gold) drop-shadow(0 0 20px white) drop-shadow(0 0 5px orange)";

    // More particles during pulse
    for (let i = 0; i < 8; i++) {
      spawnParticle(startX, startY - 80, i * 50);
    }
  }, 500);

  // === PHASE 3: Fly to HUD - SHRINK DOWN (900-1500ms) ===
  setTimeout(() => {
    floatingIcon.style.transition =
      "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    floatingIcon.style.left = `${endX}px`;
    floatingIcon.style.top = `${endY}px`;
    floatingIcon.style.transform =
      "translate(-50%, -50%) translateY(0) scale(0.4)";
    floatingIcon.style.filter = "drop-shadow(0 0 15px gold)";

    // Trail particles during flight
    const flyDuration = 600;
    const startTime = Date.now();
    const trailInterval = setInterval(() => {
      const progress = (Date.now() - startTime) / flyDuration;
      if (progress >= 1) {
        clearInterval(trailInterval);
        return;
      }
      const currentX = startX + (endX - startX) * progress;
      const currentY = startY - 100 + (endY - (startY - 100)) * progress;
      spawnParticle(currentX, currentY, 0);
    }, 50);
  }, 900);

  // === PHASE 4: Shrink into slot (1500-1700ms) ===
  setTimeout(() => {
    floatingIcon.style.transition = "all 0.2s ease-in";
    floatingIcon.style.transform =
      "translate(-50%, -50%) translateY(0) scale(0)";
    floatingIcon.style.opacity = "0";

    // Flash the artifact slot with glow
    artifactSlot.style.transition =
      "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s ease";
    artifactSlot.style.transform = "scale(1.4)";
    artifactSlot.style.filter =
      "drop-shadow(0 0 20px gold) drop-shadow(0 0 10px white)";

    // Final burst of particles at slot
    for (let i = 0; i < 8; i++) {
      spawnParticle(endX, endY, i * 20);
    }

    setTimeout(() => {
      artifactSlot.style.transition =
        "transform 0.3s ease-out, filter 0.3s ease";
      artifactSlot.style.transform = "scale(1)";
      artifactSlot.style.filter = "none";
    }, 200);
  }, 1500);

  // Cleanup
  setTimeout(() => {
    floatingIcon.remove();
    particleContainer.remove();
  }, 2000);
}

export function showVictory(artifact, mapEmbers) {
  const overlay = document.getElementById("victory-overlay");
  document.getElementById("victory-artifact-name").innerText = artifact.name;
  document.getElementById("victory-artifact-desc").innerText =
    artifact.description;
  const vIcon = document.getElementById("victory-artifact-icon");
  if (artifact.icon) {
    vIcon.innerHTML = `<img src="/assets/artifacts/${artifact.icon}" alt="${artifact.name}">`;
  } else {
    vIcon.innerText = "🏆";
  }

  const artifactValue = artifact.value || 0;
  const totalEmbers = mapEmbers + artifactValue;

  const statsContainer = document.querySelector(".victory-stats");
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stat-row">
        <span>🔥 Embers Collected:</span>
        <strong>${mapEmbers}</strong>
      </div>
      <div class="stat-row">
        <span>${artifact.icon} Artifact Value:</span>
        <strong>${artifactValue}</strong>
      </div>
      <hr class="stat-divider">
      <div class="stat-row total-row">
        <span>🏆 TOTAL:</span>
        <strong>${totalEmbers}</strong>
      </div>
    `;
  }

  stopHeartbeatSystem();
  stopAmbientAudio();
  overlay.classList.remove("hidden");
  overlay.onclick = () => location.reload();
}
