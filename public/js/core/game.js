import {
  TILE_SIZE,
  VIEW_W,
  VIEW_H,
  updateViewDimensions,
  DESKTOP_WIDTH,
  DESKTOP_HEIGHT,
  DESKTOP_VIEW_W,
  DESKTOP_VIEW_H,
  MOBILE_WIDTH,
  MOBILE_HEIGHT,
  MOBILE_VIEW_W,
  MOBILE_VIEW_H,
  MOBILE_INITIAL_HEIGHT_VH,
  FLASHLIGHT_RADIUS,
  DIM_VIEW_RADIUS,
  SHADOW_EDGE_OPACITY,
  SHADOW_INNER_OPACITY,
  EMBER_SPAWN_CHANCE,
  BERRY_REGROW_CHANCE,
  PHANTOM_START_HAZE,
  PHANTOM_SPAWN_INTERVAL,
  PHANTOM_SPAWN_CHANCE,
  SPAWNER_ACTIVATION_RANGE,
  PLAYER_MAX_HP,
  HAZE_DECAY_AMOUNT,
  HAZE_DECAY_INTERVAL,
  MAX_HAZE,
  STRESS_MULTI_AT_MAX_HAZE,
  MAX_LOOK_OFFSET,
  HAZE_PROXIMITY_INC,
  PROXIMITY_RANGE,
  HAZE_EMBER_REDUCTION,
  HAZE_CRITICAL_THRESHOLD,
  PHANTOM_CRITICAL_SPAWN_MULT,
} from "../data/config.js";
import {
  triggerHaptic,
  HAPTIC_EMBER,
  HAPTIC_ARTIFACT,
} from "../core/haptics.js";

import { map } from "../data/map.js";
import {
  BLOCK_DEFS,
  DEFAULT_BLOCK,
  loadBlockTextures,
  getBlockTexture,
} from "../world/tiles.js";
import { player, updatePlayer } from "../entities/player.js";
import { FrostBeast } from "../entities/frostbeast.js";
import { Specter } from "../entities/specter.js";
import { Phantom } from "../entities/phantom.js";
import { Ember } from "../entities/ember.js";
import { Berry } from "../entities/berry.js";
import { getRandomArtifact } from "../data/artifacts.js";
import { gameState } from "./state.js";

import { initInput, mouse, setGameActive } from "./input.js";
import { initTouchControls, updateTouchVisibility } from "./touch.js";
import {
  playGong,
  speak,
  playDing,
  playScaryDing,
  startHeartbeatSystem,
  stopHeartbeatSystem,
  startAmbientAudio,
  stopAmbientAudio,
  playEmberCollect,
  playGameOverSequence,
  playJson,
  playStartSequence,
  playDoorRumble,
} from "./audio.js";
import { getCamera, triggerShake } from "./camera.js"; // Restored import
import { checkLineOfSight, getFocusPoint } from "../world/lighting.js"; // Restored import
import { updateUI, showToast } from "./ui.js";
import { AUDIO_ASSETS } from "../data/assets.js";

// Setup
const canvas = document.getElementById("gameCanvas");
const container = document.getElementById("game-container"); // Need reference to container
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false; // Pixel Art Rendering
let globalScale = 1;

// --- Device Detection & Config Application ---
function applyDeviceConfig() {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  if (isMobile) {
    // Mobile Settings: Fullscreen Dynamic
    const isFullscreen =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement;

    // Width is always 100vw
    canvas.width = window.innerWidth;

    // Height depends on fullscreen state
    if (isFullscreen) {
      canvas.height = window.innerHeight; // 100vh
    } else {
      canvas.height = window.innerHeight * MOBILE_INITIAL_HEIGHT_VH; // 90vh
    }

    // Apply size to container
    if (container) {
      container.style.width = `${canvas.width}px`;
      container.style.height = `${canvas.height}px`;
    }

    // Dynamic Scaling to fit 15x10 Grid
    const targetW = MOBILE_VIEW_W * TILE_SIZE;
    const targetH = MOBILE_VIEW_H * TILE_SIZE; // 15x10 as requested

    // Calculate needed scale to fit target tiles into actual screen
    const scaleX = canvas.width / targetW;
    const scaleY = canvas.height / targetH;

    globalScale = Math.min(scaleX, scaleY);

    let viewW = Math.ceil(canvas.width / (TILE_SIZE * globalScale));
    let viewH = Math.ceil(canvas.height / (TILE_SIZE * globalScale));

    updateViewDimensions(viewW, viewH);
  } else {
    // Desktop Settings
    globalScale = 1;
    canvas.width = DESKTOP_WIDTH;
    canvas.height = DESKTOP_HEIGHT;

    if (container) {
      container.style.width = `${DESKTOP_WIDTH}px`;
      container.style.height = `${DESKTOP_HEIGHT}px`;
    }

    updateViewDimensions(DESKTOP_VIEW_W, DESKTOP_VIEW_H);
  }
}

function checkOrientation() {
  const warning = document.getElementById("rotate-warning");
  // Show warning only if on mobile AND in portrait mode
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  const isPortrait = window.innerHeight > window.innerWidth;

  if (isMobile && isPortrait) {
    warning.classList.remove("hidden");
    // Optional: Pause game?
  } else {
    warning.classList.add("hidden");
  }
}

applyDeviceConfig();
checkOrientation();
window.addEventListener("resize", () => {
  applyDeviceConfig(); // Update resolution if window changes
  checkOrientation(); // Check orientation
});

// Listen for fullscreen changes to update layout
document.addEventListener("fullscreenchange", applyDeviceConfig);
document.addEventListener("webkitfullscreenchange", applyDeviceConfig);
// ---------------------------------------------

let enemies = [];
let projectiles = [];
let embers = [];
let berries = [];
let regrowingBushes = []; // {x, y, readyTime}
let treasureSpots = []; // [{x, y}]

let lastPhantomSpawnHaze = 0;
let lastHazeDecayTime = 0;

let isGameRunning = false;

// Initialize Input
initInput(canvas);

// ===== RLE Decompression =====
// Decompress a row that may contain [count, tile] entries
function decompressRowRLE(row) {
  const decompressed = [];
  for (const item of row) {
    // Check if item is RLE encoded: [count, tile]
    if (
      Array.isArray(item) &&
      item.length === 2 &&
      typeof item[0] === "number"
    ) {
      const count = item[0];
      const tile = item[1];
      for (let i = 0; i < count; i++) {
        decompressed.push(tile);
      }
    } else {
      decompressed.push(item);
    }
  }
  return decompressed;
}

// Decompress entire map (modifies in place)
function decompressMap() {
  for (let y = 0; y < map.length; y++) {
    map[y] = decompressRowRLE(map[y]);
  }
  console.log(
    `Map decompressed: ${map.length} rows, ${map[0]?.length || 0} columns`
  );
}

// --- MAP PARSER ---
function setupLevel() {
  // Decompress RLE-encoded map data first
  decompressMap();

  enemies = [];
  projectiles = [];
  embers = [];
  berries = [];
  regrowingBushes = [];
  treasureSpots = [];
  gameState.haze = 0;
  lastHazeDecayTime = 0;

  gameState.hasArtifact = false;
  gameState.gameWon = false;

  lastPhantomSpawnHaze = PHANTOM_START_HAZE - PHANTOM_SPAWN_INTERVAL; // Ensure correct first spawn timing

  // Collect all player spawn points for random selection
  let playerSpawnPoints = [];

  // Scan map for Spawn Objects
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[0].length; x++) {
      let cell = map[y][x];

      // Check if cell is an object (contains metadata)
      if (typeof cell === "object" && cell !== null) {
        // 1. Handle Spawns
        if (cell.spawn === "player") {
          // Collect spawn point for random selection later
          playerSpawnPoints.push({ x: x + 0.5, y: y + 0.5 });
        } else if (cell.spawn === "enemy" || cell.spawn === "frostbeast") {
          // Default to FrostBeast for generic 'enemy' spawn
          enemies.push(new FrostBeast(x + 0.5, y + 0.5));
        } else if (cell.spawn === "specter") {
          enemies.push(new Specter(x + 0.5, y + 0.5));
        }

        // 2. Normalize Map
        // We must preserve 'v' (or legacy 'variant') and 'z' if they exist.
        // If it has important metadata (z, v/variant), keep it as an object.
        // Otherwise, we can simplify it to a number IF we want to optimization,
        // BUT current logic suggests we should just keep the object structure if it was already an object to be safe.

        // Construct the normalized cell
        let newCell = { id: cell.id !== undefined ? cell.id : 0 };
        if (cell.z !== undefined) newCell.z = cell.z;
        // Support both v (new) and variant (legacy)
        const variantVal = cell.v || cell.variant;
        if (variantVal !== undefined) newCell.v = variantVal;

        // If the only thing is ID, revert to number (optional optimization, matches previous logic style)
        if (newCell.z === undefined && newCell.v === undefined) {
          map[y][x] = newCell.id;
        } else {
          map[y][x] = newCell;
        }
      }
      // Preserve Attributes if switching to object
      if (cell.isArtifactSpot || cell.isTreasure || cell.isExit) {
        if (typeof map[y][x] !== "object") {
          map[y][x] = { id: map[y][x] };
        }
        if (cell.isArtifactSpot) map[y][x].isArtifactSpot = true;
        if (cell.isTreasure) {
          map[y][x].isTreasure = true;
          treasureSpots.push({ x: x + 0.5, y: y + 0.5 });
        }
        if (cell.isExit) map[y][x].isExit = true;
      }

      // 3. Register Pre-Place Bushes
      // If the map starts with ID 7 (Empty Bush), add it to regrowth queue
      let blockId =
        typeof map[y][x] === "object" ? map[y][x].id || 0 : map[y][x];
      if (blockId === 7) {
        regrowingBushes.push({ x, y });
      }
    }
  }

  // 2. Select Random Player Spawn Point (BEFORE artifact selection)
  if (playerSpawnPoints.length > 0) {
    const spawnPoint =
      playerSpawnPoints[Math.floor(Math.random() * playerSpawnPoints.length)];
    player.x = spawnPoint.x;
    player.y = spawnPoint.y;
    console.log(
      `Player spawned at random start point (${spawnPoint.x}, ${spawnPoint.y}) from ${playerSpawnPoints.length} available`
    );
  } else {
    console.warn("No Player Spawn Points found on map! Defaulting to (5, 5)");
    player.x = 5.5;
    player.y = 5.5;
  }

  // 3. Select Random Artifact Location (skip the nearest spot to player)
  let artifactSpots = [];
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[0].length; x++) {
      let cell = map[y][x];
      if (typeof cell === "object" && cell.isArtifactSpot) {
        artifactSpots.push({ x, y });
      }
    }
  }

  if (artifactSpots.length > 0) {
    // Sort by distance to player (ascending)
    artifactSpots.sort((a, b) => {
      const distA = (a.x - player.x) ** 2 + (a.y - player.y) ** 2;
      const distB = (b.x - player.x) ** 2 + (b.y - player.y) ** 2;
      return distA - distB;
    });

    // Skip the nearest 10% of artifact spots (at least 1) if there are multiple spots
    const skipCount = Math.max(1, Math.floor(artifactSpots.length * 0.1));
    let eligibleSpots =
      artifactSpots.length > skipCount
        ? artifactSpots.slice(skipCount)
        : artifactSpots;

    // Pick random from eligible spots
    let spot = eligibleSpots[Math.floor(Math.random() * eligibleSpots.length)];
    gameState.targetArtifactLoc = spot;
    gameState.targetArtifactItem = getRandomArtifact();

    console.log(
      `Artifact placed at (${spot.x}, ${spot.y}), skipped ${skipCount} nearest spots. ${eligibleSpots.length} eligible of ${artifactSpots.length} total`
    );
  } else {
    console.warn("No Artifact Spots found on map!");
  }
}

// --- MAIN LOOP ---
function gameLoop(timestamp) {
  if (!isGameRunning) return;

  // Check Death
  if (player.hp <= 0) {
    handleGameOver();
    return;
  }

  // Check Victory (Pause Game)
  if (gameState.gameWon) {
    return;
  }

  // Haze Decay Logic
  if (timestamp - lastHazeDecayTime > HAZE_DECAY_INTERVAL) {
    if (gameState.haze > 0) {
      gameState.haze = Math.max(0, gameState.haze - HAZE_DECAY_AMOUNT);
      updateUI(gameState, player);
      // Optional: Toast "Haze reduced..."? No, keep it subtle.
    }
    lastHazeDecayTime = timestamp;
  }

  updatePlayer();

  // Phantom Spawning Logic
  if (gameState.haze >= PHANTOM_START_HAZE) {
    if (gameState.haze >= lastPhantomSpawnHaze + PHANTOM_SPAWN_INTERVAL) {
      // Update tracking to consume this interval check regardless of success
      // This prevents checking every frame once past the threshold.
      // Alignment to grid ensures we check at 60, 70, 80...
      lastPhantomSpawnHaze =
        Math.floor(gameState.haze / PHANTOM_SPAWN_INTERVAL) *
        PHANTOM_SPAWN_INTERVAL;

      // Probability Check
      let spawnChance = PHANTOM_SPAWN_CHANCE;
      // High Haze Multiplier
      if (gameState.haze >= HAZE_CRITICAL_THRESHOLD) {
        spawnChance *= PHANTOM_CRITICAL_SPAWN_MULT; // More dangerous
      }

      if (Math.random() < spawnChance) {
        enemies.push(new Phantom(player.x, player.y));
        playScaryDing();
        showToast("A Phantom has been summoned!", 2000);
      }
    }
  } else {
    // Keeps 'lastPhantomSpawn' updated so the first spawn happens immediately at 60
    lastPhantomSpawnHaze = PHANTOM_START_HAZE - PHANTOM_SPAWN_INTERVAL;
  }

  // Update Enemies & Proximity Stress
  enemies.forEach((enemy, index) => {
    enemy.update(player, map, timestamp, projectiles);

    // Sixth Sense Logic: Build Haze if near but not (yet) seen/chasing
    // (If they are chasing, the Aggro penalty already hit, but maybe sustained stress?)
    // Let's stick to "Sixth Sense" - near but not yet fully engaged, OR just general proximity terror.
    // If simply "near", it covers all cases which is good. Being chased SHOULD be stressful.
    const dist = Math.sqrt(
      (player.x - enemy.x) ** 2 + (player.x - enemy.y) ** 2
    );
    if (dist <= PROXIMITY_RANGE) {
      gameState.haze += HAZE_PROXIMITY_INC;
    }

    // Simple death check (if phantom)
    if (enemy.type === "phantom" && enemy.hp <= 0) {
      enemies.splice(index, 1);
    }
  });

  // Update Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    const status = p.update();
    if (status === "wall" || !p.active) {
      projectiles.splice(i, 1);
    } else if (
      Math.sqrt((p.x - player.x) ** 2 + (p.y - player.y) ** 2) <
      player.radius + p.radius
    ) {
      // Player Hit!
      player.takeDamage(1);
      projectiles.splice(i, 1);
    }
  }

  // Update Embers
  for (let i = embers.length - 1; i >= 0; i--) {
    const e = embers[i];
    const wasCollected = e.update(player, 0);

    if (e.collected) {
      if (wasCollected) {
        gameState.embers++;
        gameState.embersCollected++;
        gameState.haze = Math.max(0, gameState.haze - HAZE_EMBER_REDUCTION); // Relief
        updateUI(gameState, player);
        // Sound effect here?
        playEmberCollect();
        triggerHaptic(HAPTIC_EMBER); // Small tick
      }
      embers.splice(i, 1);
    }
  }

  // Update Berries
  for (let i = berries.length - 1; i >= 0; i--) {
    const b = berries[i];
    const wasCollected = b.update(player);

    if (b.collected) {
      if (wasCollected) {
        gameState.inventory.food++;
        showToast("Picked up a Berry", 1000);
        updateUI(gameState, player);
        // Sound effect
        playDing();
        triggerHaptic(HAPTIC_EMBER); // Same as generic pickup?
      }
      berries.splice(i, 1);
    }
  }

  // Regrow Bushes (Proximity Based)
  for (let i = regrowingBushes.length - 1; i >= 0; i--) {
    const b = regrowingBushes[i];

    // Check Distance (10 blocks)
    const dist = Math.sqrt((player.x - b.x) ** 2 + (player.y - b.y) ** 2);

    if (dist <= SPAWNER_ACTIVATION_RANGE) {
      // Random Chance (from constants)
      if (Math.random() < BERRY_REGROW_CHANCE) {
        // Restore to Berry Bush (ID 8)
        if (typeof map[b.y][b.x] === "object") {
          map[b.y][b.x].id = 8;
        } else {
          map[b.y][b.x] = 8;
        }
        regrowingBushes.splice(i, 1);
        // Optional: Particle effect or sound?
      }
    }
  }

  updateSpawners();

  // Update UI every frame for smooth compass
  updateUI(gameState, player);

  draw();
  requestAnimationFrame(gameLoop);
}

// --- AMBIENT OCCLUSION ---
// Draws subtle gradient shadows on floor tile edges adjacent to walls
function drawAmbientOcclusion(ctx, camX, camY, litTiles, dimViewRadius) {
  // Helper to draw a single pass of shadows
  const drawAOPass = (size, color, cornerRadiusMult) => {
    for (let y = Math.floor(camY); y < camY + VIEW_H + 1; y++) {
      for (let x = Math.floor(camX); x < camX + VIEW_W + 1; x++) {
        if (y >= map.length || x >= map[0].length || y < 0 || x < 0) continue;

        // Only draw AO for visible tiles
        const isLit = litTiles.has(`${x},${y}`);
        const distToPlayer = Math.sqrt(
          (player.x - x) ** 2 + (player.y - y) ** 2
        );
        const isDim = distToPlayer <= dimViewRadius;
        if (!isLit && !isDim) continue;

        let tile = map[y][x];
        let id = typeof tile === "object" ? tile.id : tile;
        let block = BLOCK_DEFS[id] || DEFAULT_BLOCK;
        if (!block.solid) continue; // Only process walls

        const wallPx = (x - camX) * TILE_SIZE;
        const wallPy = (y - camY) * TILE_SIZE;

        // Helper to check if neighbor is a visible floor
        const isVisibleFloor = (nx, ny) => {
          if (ny >= map.length || nx >= map[0].length || ny < 0 || nx < 0)
            return false;
          const nTile = map[ny][nx];
          const nId = typeof nTile === "object" ? nTile.id : nTile;
          const nBlock = BLOCK_DEFS[nId] || DEFAULT_BLOCK;
          if (nBlock.solid) return false;
          // Check visibility
          const nIsLit = litTiles.has(`${nx},${ny}`);
          const nDistToPlayer = Math.sqrt(
            (player.x - nx) ** 2 + (player.y - ny) ** 2
          );
          return nIsLit || nDistToPlayer <= dimViewRadius;
        };

        // --- Linear Shadows ---

        // Bottom (Shadow on floor at y+1)
        if (isVisibleFloor(x, y + 1)) {
          const floorPy = (y + 1 - camY) * TILE_SIZE;
          const grad = ctx.createLinearGradient(0, floorPy, 0, floorPy + size);
          grad.addColorStop(0, color);
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.fillRect(wallPx, floorPy, TILE_SIZE, size);
        }

        // Top (Shadow on floor at y-1)
        if (isVisibleFloor(x, y - 1)) {
          const floorPy = (y - 1 - camY) * TILE_SIZE;
          const grad = ctx.createLinearGradient(
            0,
            floorPy + TILE_SIZE,
            0,
            floorPy + TILE_SIZE - size
          );
          grad.addColorStop(0, color);
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.fillRect(wallPx, floorPy + TILE_SIZE - size, TILE_SIZE, size);
        }

        // Right (Shadow on floor at x+1)
        if (isVisibleFloor(x + 1, y)) {
          const floorPx = (x + 1 - camX) * TILE_SIZE;
          const grad = ctx.createLinearGradient(floorPx, 0, floorPx + size, 0);
          grad.addColorStop(0, color);
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.fillRect(floorPx, wallPy, size, TILE_SIZE);
        }

        // Left (Shadow on floor at x-1)
        if (isVisibleFloor(x - 1, y)) {
          const floorPx = (x - 1 - camX) * TILE_SIZE;
          const grad = ctx.createLinearGradient(
            floorPx + TILE_SIZE,
            0,
            floorPx + TILE_SIZE - size,
            0
          );
          grad.addColorStop(0, color);
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.fillRect(floorPx + TILE_SIZE - size, wallPy, size, TILE_SIZE);
        }

        // --- Corner Shadows ---
        const checkSolid = (cx, cy) => {
          if (cx < 0 || cx >= map[0].length || cy < 0 || cy >= map.length)
            return true;
          const t = map[cy]?.[cx];
          if (!t || (typeof t === "object" && t.id === undefined)) return false;
          const tId = typeof t === "object" ? t.id : t;
          return (BLOCK_DEFS[tId] || DEFAULT_BLOCK).solid;
        };

        const cornerShadow = (cx, cy, fx, fy, w, h) => {
          const grad = ctx.createRadialGradient(
            cx,
            cy,
            0,
            cx,
            cy,
            size * cornerRadiusMult * 0.7
          );
          grad.addColorStop(0, color);
          grad.addColorStop(1, "transparent");
          ctx.fillStyle = grad;
          ctx.fillRect(fx, fy, w, h);
        };

        // Bottom-Right
        if (
          isVisibleFloor(x + 1, y + 1) &&
          !checkSolid(x + 1, y) &&
          !checkSolid(x, y + 1)
        ) {
          cornerShadow(
            (x + 1 - camX) * TILE_SIZE,
            (y + 1 - camY) * TILE_SIZE,
            (x + 1 - camX) * TILE_SIZE,
            (y + 1 - camY) * TILE_SIZE,
            size,
            size
          );
        }
        // Bottom-Left
        if (
          isVisibleFloor(x - 1, y + 1) &&
          !checkSolid(x - 1, y) &&
          !checkSolid(x, y + 1)
        ) {
          cornerShadow(
            (x - camX) * TILE_SIZE,
            (y + 1 - camY) * TILE_SIZE,
            (x - camX) * TILE_SIZE - size,
            (y + 1 - camY) * TILE_SIZE,
            size,
            size
          );
        }
        // Top-Right
        if (
          isVisibleFloor(x + 1, y - 1) &&
          !checkSolid(x + 1, y) &&
          !checkSolid(x, y - 1)
        ) {
          cornerShadow(
            (x + 1 - camX) * TILE_SIZE,
            (y - camY) * TILE_SIZE,
            (x + 1 - camX) * TILE_SIZE,
            (y - camY) * TILE_SIZE - size,
            size,
            size
          );
        }
        // Top-Left
        if (
          isVisibleFloor(x - 1, y - 1) &&
          !checkSolid(x - 1, y) &&
          !checkSolid(x, y - 1)
        ) {
          cornerShadow(
            (x - camX) * TILE_SIZE,
            (y - camY) * TILE_SIZE,
            (x - camX) * TILE_SIZE - size,
            (y - camY) * TILE_SIZE - size,
            size,
            size
          );
        }
      }
    }
  };

  // Pass 1: Wide, light shadow (Ambient occlusion)
  // Wider (0.75x tile) and lighter (0.25 opacity)
  drawAOPass(TILE_SIZE * 0.75, "rgba(0, 0, 0, 0.25)", 1.4);

  // Pass 2: Narrow, dark shadow (Contact shadow)
  // Narrower (0.35x tile) and darker (0.45 opacity)
  drawAOPass(TILE_SIZE * 0.35, "rgba(0, 0, 0, 0.45)", 1.2);
}

// --- RENDER ENGINE ---
function draw() {
  // 0. Calculate Stress Factors
  let stressFactor = 1.0;
  if (gameState.haze > MAX_HAZE / 2) {
    let excess = gameState.haze - MAX_HAZE / 2;
    let maxExcess = MAX_HAZE / 2;
    let ratio = Math.min(1, Math.max(0, excess / maxExcess)); // Cluster 0-1

    let minScale = STRESS_MULTI_AT_MAX_HAZE / 100; // 0.25
    stressFactor = 1.0 - ratio * (1.0 - minScale);
  }

  const currentFlashlightRadius = FLASHLIGHT_RADIUS * stressFactor;
  const currentDimViewRadius = DIM_VIEW_RADIUS * stressFactor;
  const currentMaxLookOffset = MAX_LOOK_OFFSET * stressFactor;

  // 1. Camera Logic
  const cam = getCamera(player, map);
  const camX = cam.x;
  const camY = cam.y;

  const focus = getFocusPoint(player, mouse, currentMaxLookOffset);

  // 2. Clear
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.scale(globalScale, globalScale);

  // 3. First pass: Determine which tiles are "lit" (in flashlight)
  let litTiles = new Set();

  for (let y = Math.floor(camY); y < camY + VIEW_H + 1; y++) {
    for (let x = Math.floor(camX); x < camX + VIEW_W + 1; x++) {
      if (y >= map.length || x >= map[0].length || y < 0 || x < 0) continue;

      let distToFocus = Math.sqrt((focus.x - x) ** 2 + (focus.y - y) ** 2);
      let isFlashlight =
        distToFocus <= currentFlashlightRadius &&
        checkLineOfSight(player.x, player.y, x, y);

      if (isFlashlight) {
        litTiles.add(`${x},${y}`);
      }
    }
  }

  // Helper: Check if a tile has an adjacent lit tile
  function hasAdjacentLitTile(x, y) {
    const neighbors = [
      `${x - 1},${y}`,
      `${x + 1},${y}`,
      `${x},${y - 1}`,
      `${x},${y + 1}`,
    ];
    for (let n of neighbors) {
      if (litTiles.has(n)) return true;
    }
    return false;
  }

  // 4. Draw Blocks (Layer 1)
  for (let y = Math.floor(camY); y < camY + VIEW_H + 1; y++) {
    for (let x = Math.floor(camX); x < camX + VIEW_W + 1; x++) {
      if (y >= map.length || x >= map[0].length || y < 0 || x < 0) continue;

      let distToPlayer = Math.sqrt((player.x - x) ** 2 + (player.y - y) ** 2);
      let isLit = litTiles.has(`${x},${y}`);
      let isDim = distToPlayer <= currentDimViewRadius;

      if (!isLit && !isDim) continue;

      // Set Brightness based on visibility
      if (isLit) {
        ctx.globalAlpha = 1.0;
      } else {
        // Shadow tile - check if adjacent to lit tile
        if (hasAdjacentLitTile(x, y)) {
          ctx.globalAlpha = SHADOW_EDGE_OPACITY; // Edge tile (60%)
        } else {
          ctx.globalAlpha = SHADOW_INNER_OPACITY; // Inner tile (30%)
        }
      }

      let drawX = (x - camX) * TILE_SIZE;
      let drawY = (y - camY) * TILE_SIZE;

      let tile = map[y][x];
      let id = typeof tile === "object" ? tile.id : tile;
      let z = typeof tile === "object" ? tile.z || 0 : 0;
      let variant = typeof tile === "object" ? tile.v || tile.variant || 1 : 1;

      let block = BLOCK_DEFS[id] || DEFAULT_BLOCK;
      let texture = getBlockTexture(id, variant);

      if (texture) {
        // Draw Texture from Sprite Sheet
        ctx.drawImage(
          texture.image,
          texture.sx,
          texture.sy,
          texture.sw,
          texture.sh,
          drawX,
          drawY - z * 10,
          TILE_SIZE,
          TILE_SIZE
        );
      } else {
        // Fallback Color
        ctx.fillStyle = block.color;
        ctx.fillRect(drawX, drawY - z * 10, TILE_SIZE, TILE_SIZE);
      }

      // Side face for elevation
      if (z > 0) {
        ctx.fillStyle = "#222"; // Shadow/Side
        ctx.fillRect(drawX, drawY - z * 10 + TILE_SIZE, TILE_SIZE, 10);
      }

      // Draw Exit Label
      if (typeof tile === "object" && tile.isExit) {
        ctx.fillStyle = "#00FF00";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(
          "EXIT",
          drawX + TILE_SIZE / 2,
          drawY - z * 10 + TILE_SIZE / 1.5
        );
      }
    }
  }

  ctx.globalAlpha = 1.0;

  // 4b. Draw Ambient Occlusion (edge shadows where floors meet walls)
  drawAmbientOcclusion(ctx, camX, camY, litTiles, currentDimViewRadius);

  // 5. Draw Player (Layer 2)
  player.draw(ctx, camX, camY, TILE_SIZE);

  // 6. Draw Enemies - Only if in line of sight AND within range
  enemies.forEach((enemy) => {
    const dist = Math.sqrt(
      (player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2
    );
    if (
      dist <= currentDimViewRadius &&
      checkLineOfSight(player.x, player.y, enemy.x, enemy.y)
    ) {
      enemy.draw(ctx, camX, camY);
    }
  });

  // 6b. Draw Projectiles - Only if in line of sight
  projectiles.forEach((p) => {
    if (checkLineOfSight(player.x, player.y, p.x, p.y)) {
      p.draw(ctx, camX, camY);
    }
  });

  // 6c. Draw Embers - Only if in line of sight
  embers.forEach((e) => {
    if (checkLineOfSight(player.x, player.y, e.x, e.y)) {
      e.draw(ctx, camX, camY, TILE_SIZE);
    }
  });

  // 6d. Draw Berries
  berries.forEach((b) => {
    if (checkLineOfSight(player.x, player.y, b.x, b.y)) {
      b.draw(ctx, camX, camY, TILE_SIZE);
    }
  });

  // 7. Damage Flash Overlay
  if (Date.now() - player.lastDamageTime < 200) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 8. Lighting Gradient (Layer 3) - Subtle atmosphere
  let lightX = (focus.x - camX) * TILE_SIZE;
  let lightY = (focus.y - camY) * TILE_SIZE;

  let gradient = ctx.createRadialGradient(
    lightX,
    lightY,
    TILE_SIZE * 1,
    lightX,
    lightY,
    TILE_SIZE * currentFlashlightRadius
  );

  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(0.8, "rgba(0, 0, 0, 0.2)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 9. DEBUG OVERLAY
  if (window.debugMode) {
    ctx.lineWidth = 2;

    // Enemies (Pink)
    ctx.strokeStyle = "hotpink";
    enemies.forEach((e) => {
      // Entities spawn at x.5, y.5 (center of tile)
      // Debug box should be centered around the entity
      // Using a default 0.8x0.8 box (radius 0.4 approx) visualizes the "body" better than full tile
      // But let's stick to the visual the user expected (full tile box)
      // x - 0.5 centers a 1-unit wide box on coordinate x
      let drawX = (e.x - 0.5 - camX) * TILE_SIZE;
      let drawY = (e.y - 0.5 - camY) * TILE_SIZE;
      ctx.strokeRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
    });

    // Artifact Target (Red)
    if (gameState.targetArtifactLoc) {
      ctx.strokeStyle = "red";
      let tx = (gameState.targetArtifactLoc.x - camX) * TILE_SIZE;
      let ty = (gameState.targetArtifactLoc.y - camY) * TILE_SIZE;
      ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
    }

    // Ember Spawn Locations (Yellow)
    ctx.strokeStyle = "yellow";
    treasureSpots.forEach((spot) => {
      let sx = (spot.x - 0.5 - camX) * TILE_SIZE;
      let sy = (spot.y - 0.5 - camY) * TILE_SIZE;
      ctx.strokeRect(sx, sy, TILE_SIZE, TILE_SIZE);
    });
  }

  ctx.restore();

  // Critical Haze Effects (Red Tint + Random Shake)
  // Drawn AFTER restore() to be on top of everything including shadows
  if (gameState.haze >= HAZE_CRITICAL_THRESHOLD) {
    // Red Tint
    ctx.fillStyle = `rgba(255, 0, 0, ${0.1 + Math.random() * 0.1})`; // 10-20% Alpha Pulsing
    ctx.fillRect(0, 0, canvas.width, canvas.height); // Overlay on entire screen

    // Random Micro-Shakes (Dizziness)
    if (Math.random() < 0.1) {
      // 10% chance per frame
      triggerShake(0.3);
    }
  }
}

// --- START / RESET GAME ---
export function initGame() {
  loadBlockTextures(() => {});

  initTouchControls(); // Initialize Touch

  // Start Overlay
  const overlay = document.getElementById("start-overlay");
  overlay.addEventListener("click", startGame);

  // Game Over Overlay
  const retryOverlay = document.getElementById("game-over-overlay");
  retryOverlay.addEventListener("click", resetGame);

  // Fullscreen Button
  const fsBtn = document.getElementById("fullscreen-btn");
  if (fsBtn) {
    fsBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent firing click on game container if needed
      toggleFullscreen();
    });
  }
}

function startGame() {
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  if (isMobile) {
    // Attempt to enter fullscreen on mobile start
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((e) => {
        // Fail silently, user can still play
      });
    }
  }

  const overlay = document.getElementById("start-overlay");
  overlay.classList.add("hidden"); // Hide Menu immediately

  // Hide Touch Toggle during gameplay
  const touchToggle = document.getElementById("touch-toggle-container");
  if (touchToggle) {
    touchToggle.style.display = "none";
  }

  // Hide Home Button during gameplay
  const homeBtn = document.getElementById("home-btn");
  if (homeBtn) {
    homeBtn.style.display = "none";
  }

  // Auto-collapse Article on Start
  const article = document.getElementById("game-info");
  const content = document.getElementById("article-content");
  const btn = document.getElementById("collapse-btn");
  if (article && content) {
    article.classList.add("minimized");
    content.classList.add("collapsed");
    if (btn) btn.textContent = "▼";
  }

  // Start Cinematic Sequence instead of immediate game loop
  playIntroSequence();
}

export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement
        .requestFullscreen()
        .catch((e) => console.log("Fullscreen failed:", e));
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

function launchGame() {
  resetGameLogic(); // Initialize Map/Player

  showToast("WASD to Move, Hold SHIFT to Sneak", 5000);
  gameState.startTime = Date.now(); // Start timer

  // Start Audio Systems
  startHeartbeatSystem(() => gameState.haze);
  startAmbientAudio();

  // Show HUD
  document.getElementById("ui-layer").classList.remove("hidden");

  isGameRunning = true;
  setGameActive(true); // Prevent keyboard scroll
  updateTouchVisibility(true); // Show Touch Controls if enabled
  requestAnimationFrame(gameLoop);
}

// === CINEMATIC INTRO ===
function playIntroSequence() {
  const cinematic = document.getElementById("cinematic-overlay");
  const doorContainer = document.getElementById("door-container");
  const canvas = document.getElementById("intro-particles");
  const ctx = canvas.getContext("2d");

  // 1. Show Cinematic Layer
  cinematic.classList.remove("hidden");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // 2. Play Audio
  // const readyVoice = new Audio(AUDIO_ASSETS.voiceReady);
  // readyVoice.volume = 0.8;
  // 2. Play Audio
  // const readyVoice = new Audio(AUDIO_ASSETS.voiceReady);
  // readyVoice.volume = 0.8;
  // readyVoice.play().catch(e => console.warn("Audio play failed:", e));
  playStartSequence();

  // 3. Particle System (Spiral)
  let particles = [];
  const centerX = canvas.width / 2;
  const centerY = (canvas.height / 5) * 3;
  let frame = 0;

  // Create/Update Particles
  function renderParticles() {
    if (!cinematic.classList.contains("hidden"))
      requestAnimationFrame(renderParticles);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Spawn new particles
    if (frame < 120) {
      // Spawn for 2 seconds
      for (let i = 0; i < 5; i++) {
        particles.push({
          angle: Math.random() * Math.PI * 2,
          radius: 10 + Math.random() * 50, // Start relative center
          speed: 2 + Math.random() * 2,
          size: 2 + Math.random() * 3,
          alpha: 1,
          hue: 40 + Math.random() * 20, // Gold/Yellow
        });
      }
    }

    // Update & Draw
    particles.forEach((p, index) => {
      p.radius += p.speed; // Expand outward spiral
      p.angle += 0.05; // Rotate
      p.alpha -= 0.01; // Fade

      // Draw
      let x = centerX + Math.cos(p.angle) * p.radius;
      let y = centerY + Math.sin(p.angle) * p.radius;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = `hsl(${p.hue}, 100%, 50%)`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      if (p.alpha <= 0) particles.splice(index, 1);
    });

    frame++;
  }
  renderParticles();

  // 4. Sequence Timing
  // A) Fade In Doors (over menu)
  setTimeout(() => {
    doorContainer.classList.add("visible");
    // Play rumble as doors appear and get ready to open
    playDoorRumble();
  }, 1000);

  // B) Open Doors & Reveal Game
  setTimeout(() => {
    // Play Gong right before door opens for impact
    playGong(() => {});

    // Reveal Game behind doors (make overlay transparent)
    cinematic.classList.add("transparent-bg");

    // Open
    doorContainer.classList.add("open");

    // Fade out particles
    canvas.style.transition = "opacity 1s";
    canvas.style.opacity = 0;

    // Start Game Rendering immediately so it's visible
    launchGame();
  }, 2700); // 2.5s + 200ms hold

  // 5. Finish & Start Game
  setTimeout(() => {
    cinematic.classList.add("hidden");
    // Reset styles for next time (reloads anyway, but good practice)
    doorContainer.classList.remove("open");
    doorContainer.classList.remove("visible");
    cinematic.classList.remove("transparent-bg");
    canvas.style.opacity = 1;
  }, 7000); // 2.7s + 4s anim + buffer
}

function handleGameOver() {
  isGameRunning = false;
  setGameActive(false); // Allow normal keyboard behavior
  updateTouchVisibility(false); // Hide Touch Controls
  const overlay = document.getElementById("game-over-overlay");
  overlay.classList.remove("hidden");
  playGameOverSequence();
  stopHeartbeatSystem();
  stopAmbientAudio();
}

function resetGame() {
  location.reload();
}

function resetGameLogic() {
  player.hp = PLAYER_MAX_HP;
  setupLevel(); // Reset map, enemies, player pos
  gameState.haze = 0;
  updateUI(gameState, player);
}

export function spawnEmber(x, y) {
  embers.push(new Ember(x, y));
}

export function spawnBerry(x, y) {
  // Find valid spot near x, y
  let spawnIdx = getValidSpawnPoint(x, y, 1.5);
  if (spawnIdx) {
    berries.push(new Berry(spawnIdx.x, spawnIdx.y));
  } else {
    // Fallback: just spawn at center even if blocked (user said push to nearest non solid, getValidSpawnPoint tries that)
    // If it failed, maybe just spawn at x,y?
    berries.push(new Berry(x, y));
  }
}

export function queueRegrowth(x, y) {
  // Add to queue without timer
  regrowingBushes.push({ x, y });
}

function updateSpawners() {
  treasureSpots.forEach((spot) => {
    // 1. Check Distance (10 blocks)
    const dist = Math.sqrt((player.x - spot.x) ** 2 + (player.y - spot.y) ** 2);
    if (dist > SPAWNER_ACTIVATION_RANGE) return;

    // 2. Random Chance (Lower chance per frame since it's active constantly, not just when moving)
    // Previous was 1% when moving. Let's try 0.5% per frame (approx 1 per 3 sec per spawner)
    // 2. Random Chance
    if (Math.random() < EMBER_SPAWN_CHANCE) {
      // 3. Calculate Spawn Point (0 - 1.5 radius)
      let spawnPos = getValidSpawnPoint(spot.x, spot.y, 1.5);

      if (spawnPos) {
        spawnEmber(spawnPos.x, spawnPos.y);
        // Optional: Play a distant sound? Or only if very close?
        if (dist < 5) playDing();
      }
    }
  });
}

function getValidSpawnPoint(cx, cy, maxRadius) {
  // Try 5 times to find a valid spot
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * maxRadius;
    const tx = cx + Math.cos(angle) * radius;
    const ty = cy + Math.sin(angle) * radius;

    // Check solidity
    if (!isSolid(Math.floor(tx), Math.floor(ty))) {
      return { x: tx, y: ty };
    }
  }

  // Fallback: If center is valid, return center, else closest non-solid?
  if (!isSolid(Math.floor(cx), Math.floor(cy))) {
    return { x: cx, y: cy };
  }
  return null; // Failed to find spot
}

function isSolid(x, y) {
  if (x < 0 || x >= map[0].length || y < 0 || y >= map.length) return true;
  let cell = map[y][x];
  let id = typeof cell === "object" ? cell.id || 0 : cell;
  let block = BLOCK_DEFS[id] || DEFAULT_BLOCK;
  return block.solid;
}
