import {
  ACCELERATION,
  MAX_SPEED,
  RUN_MULT,
  SNEAK_MULT,
  PLAYER_RADIUS,
  BUNNY_HOP_BOOST,
  PLAYER_MAX_HP,
  PLAYER_JUMP_VELOCITY,
  PLAYER_EAT_COOLDOWN,
  PLAYER_EAT_HEAL_AMOUNT,
  PLAYER_CHECK_COOLDOWN,
  PLAYER_ANIMATION_SPEED,
  HAZE_SPEED_THRESHOLD,
  HAZE_CHANCE_MULTIPLIER,
  HAZARD_DAMAGE_CHANCE,
  ARTIFACT_HAZE_PENALTY,
  HAZE_WALK_INC,
  HAZE_RUN_INC,
  HAZE_JUMP_INC,
  HAZE_MOVE_INC,
  HAZE_MOVE_INTERVAL,
  HAZE_DAMAGE_PENALTY,
  HAZE_EAT_REDUCTION,
  HAZE_MISS_PENALTY,
} from "../data/config.js";

import { keys, setGameActive } from "../core/input.js";
import { triggerShake, getCamera } from "../core/camera.js";
import { map } from "../data/map.js";
import { BLOCK_DEFS, DEFAULT_BLOCK } from "../world/tiles.js";
import { checkWallCollision } from "../utils/collision.js";
import { gameState } from "../core/state.js";
import {
  updateUI,
  showToast,
  showVictory,
  playArtifactCollectAnimation,
} from "../core/ui.js";
import { updateTouchVisibility } from "../core/touch.js";

import { spawnEmber, queueRegrowth, spawnBerry } from "../core/game.js";
import {
  playBingBing,
  playVictoryTone,
  playBerryCollect,
  playEatBerry,
  playJson,
  stopHeartbeatSystem,
  stopAmbientAudio,
} from "../core/audio.js";
import { triggerHaptic, HAPTIC_DAMAGE, HAPTIC_EMBER } from "../core/haptics.js";
import { SPRITES } from "../data/assets.js";

const sprite = new Image();
sprite.src = SPRITES.player;

// Standardized Animation Config
const ANIMATIONS = {
  idle: {
    row: 5,
    frames: 3,
    width: 64,
    height: 92,
    scaleW: 1,
    scaleH: 1 * (92 / 64),
  },
  walk_down: {
    row: 0,
    frames: 3,
    width: 64,
    height: 92,
    scaleW: 1,
    scaleH: 1 * (92 / 64),
  },
  walk_left: {
    row: 1,
    frames: 3,
    width: 64,
    height: 92,
    scaleW: 1,
    scaleH: 1 * (92 / 64),
  },
  walk_right: {
    row: 2,
    frames: 3,
    width: 64,
    height: 92,
    scaleW: 1,
    scaleH: 1 * (92 / 64),
  },
  walk_up: {
    row: 3,
    frames: 3,
    width: 64,
    height: 92,
    scaleW: 1,
    scaleH: 1 * (92 / 64),
  },
  eat: {
    row: 4,
    frames: 3,
    width: 64,
    height: 92,
    scaleW: 1,
    scaleH: 1 * (92 / 64),
  },
};

export const player = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  hp: PLAYER_MAX_HP,
  radius: 0.3,

  // Animation State
  image: sprite,
  frameIndex: 0,
  tickCount: 0,
  ticksPerFrame: PLAYER_ANIMATION_SPEED,
  anim: "idle",
  lastDamageTime: 0,
  activeCollisions: [], // Debug: Track what we are touching

  // Jump/Elevation State
  z: 0,
  jumpOffset: 0,
  isJumping: false,
  isBumping: false, // Visual cue
  bumpVelocity: 0,
  bumpCount: 0, // Track failed attempts

  // Timers
  lastEatTime: 0,
  lastCheckTime: 0,
  lastMoveHazeTime: 0,
  lastMoveHazeTime: 0,
  lastAggroHazeTime: 0,
  lastActionType: "none", // 'eat' or 'harvest'
  lastHarvestDir: "down",

  takeDamage(amount) {
    this.hp -= amount;
    this.lastDamageTime = Date.now();
    triggerShake(0.2); // Shake intensity
    triggerHaptic(HAPTIC_DAMAGE);
    gameState.haze += HAZE_DAMAGE_PENALTY;
    updateUI(gameState, player);
  },

  triggerBump() {
    if (this.isJumping || this.isBumping) return;
    this.isBumping = true;
    this.bumpVelocity = 2; // Small hop

    this.bumpCount++;
    if (this.bumpCount >= 10) {
      showToast("Press SPACE to Jump!", 3000);
      this.bumpCount = 0; // Reset after reminding
    }
  },

  draw(ctx, camX, camY, tileSize) {
    // --- 1. Update Animation Logic ---
    // Determine Anim State
    const isEating = Date.now() - this.lastEatTime < PLAYER_EAT_COOLDOWN; // Use cooldown as animation duration

    if (isEating) {
      if (this.lastActionType === "harvest") {
        // Play Walk Animation facing the bush
        this.anim = "walk_" + this.lastHarvestDir;
      } else {
        this.anim = "eat";
      }
    } else if (Math.abs(this.vx) > 0.001 || Math.abs(this.vy) > 0.001) {
      if (Math.abs(this.vy) > Math.abs(this.vx)) {
        this.anim = this.vy > 0 ? "walk_down" : "walk_up";
      } else {
        this.anim = this.vx > 0 ? "walk_right" : "walk_left";
      }
    } else {
      this.anim = "idle";
    }

    // Cycle Frames
    if (this.anim !== "idle") {
      this.tickCount++;
      if (this.tickCount > this.ticksPerFrame) {
        this.tickCount = 0;
        this.frameIndex++;
      }
    } else {
      // If idle, cycle checking as well (since we have idle anim now)
      this.tickCount++;
      if (this.tickCount > this.ticksPerFrame) {
        this.tickCount = 0;
        this.frameIndex++;
      }
    }

    const animData = ANIMATIONS[this.anim];
    if (!animData) return; // Scale safety

    // Frame Wrap
    if (this.frameIndex >= animData.frames) this.frameIndex = 0;

    // --- 2. Render ---
    if (this.image.complete) {
      // Calculate Source
      let sx = this.frameIndex * animData.width;
      let sy = animData.row * animData.height;

      // Calculate Dest Size (Standard Multipliers)
      let scaleW = animData.scaleW !== undefined ? animData.scaleW : 1.0;
      let scaleH = animData.scaleH !== undefined ? animData.scaleH : 1.0;
      let renderWidth = tileSize * scaleW;
      let renderHeight = tileSize * scaleH;

      // Center Helper
      let dx = (this.x - camX) * tileSize - renderWidth / 2;

      // Vertical Alignment
      let feetOffset = tileSize * 0.25;
      let visualZ = this.z * 10 + this.jumpOffset;
      let dy = (this.y - camY) * tileSize - renderHeight + feetOffset - visualZ;

      // Damage Tint
      const isDamaged = Date.now() - this.lastDamageTime < 200;

      if (isDamaged) {
        ctx.save();
        ctx.filter = "sepia(1) saturate(5) hue-rotate(-50deg)";
      }

      ctx.drawImage(
        this.image,
        sx,
        sy,
        animData.width,
        animData.height,
        dx,
        dy,
        renderWidth,
        renderHeight
      );

      if (isDamaged) {
        ctx.restore();
      }
    } else {
      // Fallback
      let drawX = (this.x - camX) * tileSize;
      let drawY = (this.y - camY) * tileSize;
      ctx.fillStyle = "cyan";
      ctx.beginPath();
      ctx.arc(drawX, drawY, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // DEBUG: Draw Player Hitbox
    if (window.debugMode) {
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      let drawX = (this.x - this.radius - camX) * tileSize;
      let drawY = (this.y - this.radius - camY) * tileSize;
      ctx.strokeRect(
        drawX,
        drawY,
        this.radius * 2 * tileSize,
        this.radius * 2 * tileSize
      );

      // Draw Active Collisions (Tiles/Entities that hurt us this frame)
      if (this.activeCollisions && this.activeCollisions.length > 0) {
        this.activeCollisions.forEach((col) => {
          ctx.fillStyle = col.color || "rgba(255, 0, 0, 0.5)";

          if (col.type === "tile") {
            let tx = (col.x - camX) * tileSize;
            let ty = (col.y - camY) * tileSize;
            ctx.fillRect(tx, ty, tileSize, tileSize);
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.strokeRect(tx, ty, tileSize, tileSize);
          } else if (col.type === "entity") {
            // Entity collision (radius based)
            // Assume col has x, y (center) and radius (or default 0.4)
            let r = col.radius || 0.5;
            let ex = (col.x - r - camX) * tileSize;
            let ey = (col.y - r - camY) * tileSize;
            ctx.fillRect(ex, ey, r * 2 * tileSize, r * 2 * tileSize);
            ctx.strokeStyle = "yellow";
            ctx.strokeRect(ex, ey, r * 2 * tileSize, r * 2 * tileSize);
          }
        });
      }
    }
  },
};

function getTileZ(x, y) {
  if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return 0;
  let cell = map[Math.floor(y)][Math.floor(x)];

  // 1. Check Map Override
  if (typeof cell === "object" && cell.z !== undefined) return cell.z;

  // 2. Check Block Registry Default
  let id = typeof cell === "object" ? cell.id || 0 : cell;
  let def = BLOCK_DEFS[id];
  return def ? def.z || 0 : 0;
}

function getTileId(x, y) {
  if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return 11; // Void
  let cell = map[Math.floor(y)][Math.floor(x)];
  return typeof cell === "object" ? cell.id || 0 : cell;
}

// Tutorial State
let hasShownJumpToast = false;

export function updatePlayer() {
  let speedLimit = MAX_SPEED;
  let accel = ACCELERATION;
  let isRunning = keys["control"] || keys["ctrl"];
  let isSneaking = keys["shift"];
  let isJumping = keys[" "]; // Space check

  // Bunny Hop (Run)
  if (isJumping) {
    speedLimit *= BUNNY_HOP_BOOST;
  } else if (isRunning && !isSneaking) {
    speedLimit *= RUN_MULT;
  }

  // Sneak (Priority over run if both held? usually sneak overrides)
  if (isSneaking) {
    speedLimit *= SNEAK_MULT;
    accel *= 0.5;
  }

  // Check for Eating Lock (Animation/Action Duration)
  const isEating = Date.now() - player.lastEatTime < PLAYER_EAT_COOLDOWN;

  if (isEating) {
    // Stop movement immediately to perform eat action
    player.vx = 0;
    player.vy = 0;
  } else {
    // Acceleration (Normal Movement)
    if (keys["w"] || keys["arrowup"]) player.vy -= accel;
    if (keys["s"] || keys["arrowdown"]) player.vy += accel;
    if (keys["a"] || keys["arrowleft"]) player.vx -= accel;
    if (keys["d"] || keys["arrowright"]) player.vx += accel;
  }

  // Environment physics
  let centerBlockId = getTileId(player.x, player.y);
  let centerBlock = BLOCK_DEFS[centerBlockId] || DEFAULT_BLOCK;
  let slideFactor = centerBlock.slideFactor || 0.8;

  player.vx *= slideFactor;
  player.vy *= slideFactor;

  // Velocity Clamping
  let speed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
  if (speed > speedLimit) {
    let ratio = speedLimit / speed;
    player.vx *= ratio;
    player.vy *= ratio;
  }
  if (Math.abs(player.vx) < 0.001) player.vx = 0;
  if (Math.abs(player.vy) < 0.001) player.vy = 0;

  // Move & Collide (with Elevation Logic)
  let nextX = player.x + player.vx;
  let nextY = player.y + player.vy;

  let currentZ = getTileZ(player.x, player.y);
  let targetZ_X = getTileZ(nextX, player.y);
  let targetZ_Y = getTileZ(player.x, nextY);

  // X-Axis Movement
  let canMoveX = true;
  if (checkWallCollision(nextX, player.y)) canMoveX = false;
  else {
    // Elevation Check X
    if (targetZ_X > currentZ) {
      // Trying to go UP
      if (targetZ_X - currentZ > 1) canMoveX = false; // Too high
      else if (!player.isJumping && !isJumping) {
        canMoveX = false; // Needs jump
        player.triggerBump();
      }
    }
  }

  if (canMoveX) player.x += player.vx;
  else player.vx = 0;

  // Y-Axis Movement
  let canMoveY = true;
  if (checkWallCollision(player.x, nextY)) canMoveY = false;
  else {
    // Elevation Check Y
    if (targetZ_Y > currentZ) {
      // Trying to go UP
      if (targetZ_Y - currentZ > 1) canMoveY = false;
      else if (!player.isJumping && !isJumping) {
        canMoveY = false;
        player.triggerBump();
      }
    }
  }

  if (canMoveY) player.y += player.vy;
  else player.vy = 0;

  // Update Player Z (Visual & Logic)
  player.z = getTileZ(player.x, player.y);

  // Jump Toast Tutorial
  if (player.z < 0 && !hasShownJumpToast) {
    showToast("Press SPACE to Jump Out", 5000);
    hasShownJumpToast = true;
  }

  // Jump Animation Logic
  if (isJumping && !player.isFalling && !player.isJumping) {
    // Start jump
    player.isJumping = true;
    player.isBumping = false; // Override bump
    player.jumpVelocity = PLAYER_JUMP_VELOCITY; // Start upward
    player.bumpCount = 0; // Success! Reset counter

    // Jump Haze
    gameState.haze += HAZE_JUMP_INC;
    updateUI(gameState, player);
    playJson("assets/sounds/player_jump.json");
  }

  if (player.isJumping) {
    player.jumpOffset += player.jumpVelocity;
    player.jumpVelocity -= 1; // Gravity

    if (player.jumpOffset <= 0) {
      player.jumpOffset = 0;
      player.isJumping = false;
    }
  } else if (player.isBumping) {
    // Tiny Hop Logic
    player.jumpOffset += player.bumpVelocity;
    player.bumpVelocity -= 0.5; // Faster gravity for small hop
    if (player.jumpOffset <= 0) {
      player.jumpOffset = 0;
      player.isBumping = false;
    }
  }

  // --- Footstep Haze Logic (Visual/Audio) ---
  // Note: The actual haze integer accumulation is now time-based (below),
  // but we keep this for syncing the specific footstep SOUND.
  let currentSpeed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
  if (currentSpeed > HAZE_SPEED_THRESHOLD && !isSneaking && !player.isJumping) {
    // Increment Step Timer
    if (!player.stepTimer) player.stepTimer = 0;
    player.stepTimer++;

    const stepInterval = PLAYER_ANIMATION_SPEED * 3; // Approx 1 step per cycle
    if (player.stepTimer >= stepInterval) {
      player.stepTimer = 0;
      // Play Sound
      if (isRunning) {
        playJson("assets/sounds/player_step_run.json");
      } else {
        playJson("assets/sounds/player_step_walk.json");
      }
      // Haze addition from steps is now 0 in config (HAZE_WALK_INC), handled below
    }
  } else {
    player.stepTimer = 0; // Reset if stopped or sneaking
  }

  // --- Time-Based Movement Haze ---
  // "add 0.1 haze every 200ms play hold walk"
  // We check if keys are held AND we have velocity (actually moving)
  const isMoving = currentSpeed > HAZE_SPEED_THRESHOLD;
  if (isMoving && !isSneaking && !player.isJumping) {
    if (!player.lastMoveHazeTime) player.lastMoveHazeTime = Date.now();

    if (Date.now() - player.lastMoveHazeTime >= HAZE_MOVE_INTERVAL) {
      gameState.haze += HAZE_MOVE_INC;
      updateUI(gameState, player);
      player.lastMoveHazeTime = Date.now();
    }
  } else {
    player.lastMoveHazeTime = Date.now(); // Reset timer so it starts counting fresh from next move
  }

  checkTileEvents();
}

function checkTileEvents() {
  player.activeCollisions = []; // Reset debug list

  // 1. Passive Checks (Hazards / Bush Damage) - Check all tiles touching player hitbox
  // Use slightly smaller radius for "standing on" feel to avoid damaging just by grazing pixels?
  // User requested "hit box colide with the tile ... start to get damage".
  // So we use full radius.

  // Bounds
  const startX = Math.floor(player.x - player.radius);
  const endX = Math.floor(player.x + player.radius);
  const startY = Math.floor(player.y - player.radius);
  const endY = Math.floor(player.y + player.radius);

  let standingOnHazard = false;
  let hazardDamage = 0;
  let touchingBush = false;

  // Scan bounding box for hazards
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) continue;

      let cell = map[y][x];
      let id = typeof cell === "object" ? cell.id || 0 : cell;
      let block = BLOCK_DEFS[id];

      if (block && block.damage) {
        standingOnHazard = true;
        hazardDamage = Math.max(hazardDamage, block.damage);
        player.activeCollisions.push({
          type: "tile",
          x,
          y,
          color: "rgba(255, 69, 0, 0.6)",
        }); // Orange-Red for Hazard
      }

      // ID 7 = Empty Bush, ID 8 = Full Berry Bush
      if (id === 7 || id === 8) {
        touchingBush = true;
        player.activeCollisions.push({
          type: "tile",
          x,
          y,
          color: "rgba(50, 205, 50, 0.6)",
        }); // Green for Bush
      }
    }
  }

  // Apply Hazard Damage
  if (standingOnHazard && Math.random() < HAZARD_DAMAGE_CHANCE) {
    player.takeDamage(hazardDamage);
  }

  // Apply Bush Damage
  if (touchingBush) {
    if (player.hp > 0 && Math.random() < 0.1) {
      if (Date.now() - player.lastDamageTime > 1000) {
        player.takeDamage(1);
      }
    }
  }

  // 2. Active Interactions (E Key / Exit) - Require strictly being "at" the location (Center Tile)
  const centerTileX = Math.floor(player.x);
  const centerTileY = Math.floor(player.y);

  if (
    centerTileY < 0 ||
    centerTileY >= map.length ||
    centerTileX < 0 ||
    centerTileX >= map[0].length
  )
    return;

  let centerCell = map[centerTileY][centerTileX];
  let centerId =
    typeof centerCell === "object" ? centerCell.id || 0 : centerCell;

  // Auto-trigger: Check for Exit (Win) - Must be fully ON the exit
  let isExit = typeof centerCell === "object" && centerCell.isExit;
  if (isExit) {
    if (gameState.hasArtifact) {
      if (!gameState.gameWon) {
        // Mark game as won FIRST to stop the game loop
        gameState.gameWon = true;
        setGameActive(false); // Allow normal keyboard behavior
        updateTouchVisibility(false); // Hide Touch Controls

        // Stop all audio systems
        stopHeartbeatSystem();
        stopAmbientAudio();

        // 4. Update Victory Overlay
        const overlay = document.getElementById("victory-overlay");
        const artifactName = document.getElementById("victory-artifact-name");
        const artifactDesc = document.getElementById("victory-artifact-desc");
        const artifactIcon = document.getElementById("victory-artifact-icon");
        const emberCount = document.getElementById("victory-embers");
        const durationDisplay = document.getElementById("victory-duration");
        const valueDisplay = document.getElementById("victory-value");
        const shareBtn = document.getElementById("victory-share-btn");
        const continueBtn = document.getElementById("victory-continue");

        if (artifactName)
          artifactName.textContent = gameState.targetArtifactItem.name;
        if (artifactDesc)
          artifactDesc.textContent = gameState.targetArtifactItem.description;

        if (artifactIcon) {
          const iconFile = gameState.targetArtifactItem.icon;
          if (iconFile) {
            artifactIcon.innerHTML = `<img src="/assets/artifacts/${iconFile}" alt="${gameState.targetArtifactItem.name}">`;
          } else {
            artifactIcon.textContent = "🏆";
          }
        }

        if (emberCount) emberCount.textContent = gameState.embersCollected;
        if (valueDisplay)
          valueDisplay.textContent =
            gameState.targetArtifactItem.value || "???";

        // Calculate Duration
        const endTime = Date.now();
        const durationMs = endTime - gameState.startTime;
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);

        if (durationDisplay)
          durationDisplay.textContent = `${minutes}m ${seconds}s`;

        // Share Button Logic (Canvas Draw)
        if (shareBtn) {
          shareBtn.onclick = () => {
            const width = 600;
            const height = 800;
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");

            // Enable pixelated rendering for images
            ctx.imageSmoothingEnabled = false;

            // Background
            const grad = ctx.createLinearGradient(0, 0, width, height);
            grad.addColorStop(0, "#1a1a1a");
            grad.addColorStop(1, "#000000");
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, width, height);

            // Border
            ctx.strokeStyle = "#ffcc00";
            ctx.lineWidth = 12;
            ctx.strokeRect(0, 0, width, height);

            // Title (drawn first, not overlapped)
            ctx.fillStyle = "#ffcc00";
            ctx.font = "bold 52px Impact";
            ctx.textAlign = "center";
            ctx.fillText("Victory Card", width / 2, 60);

            // --- SCORE BADGE (Top Right Corner - Rounded Square) ---
            const artValue = parseInt(gameState.targetArtifactItem.value) || 0;
            const embersVal = parseInt(gameState.embersCollected) || 0;
            const totalScore = artValue + embersVal;

            const badgeSize = 70;
            const badgeX = width - badgeSize - 20; // 20px from right edge
            const badgeY = 20; // 20px from top edge
            const badgeRadius = 8; // Rounded corner radius

            // Badge Rounded Square
            ctx.fillStyle = "#ffcc00";
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeSize, badgeSize, badgeRadius);
            ctx.fill();
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 3;
            ctx.stroke();

            // Badge Number Only (big bold)
            ctx.fillStyle = "#000";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = "bold 36px Arial";
            ctx.fillText(
              totalScore,
              badgeX + badgeSize / 2,
              badgeY + badgeSize / 2
            );
            ctx.textBaseline = "alphabetic"; // Reset
            // -------------------------------------

            // Helper to draw the rest after icon is ready
            const drawCardContent = () => {
              // No circle border - just glow on icon

              // Artifact Name
              ctx.fillStyle = "#ffcc00";
              ctx.font = "bold 40px Georgia";
              ctx.textAlign = "center";
              ctx.fillText(gameState.targetArtifactItem.name, width / 2, 340);

              // Stats Box Frame
              ctx.fillStyle = "#111";
              ctx.fillRect(50, 400, 500, 100);
              ctx.strokeStyle = "#333";
              ctx.lineWidth = 2;
              ctx.strokeRect(50, 400, 500, 100);

              const drawStat = (label, val, x) => {
                ctx.fillStyle = "#888";
                ctx.font = "16px monospace";
                ctx.fillText(label, x, 430);
                ctx.fillStyle = "#fff";
                ctx.font = "bold 28px monospace";
                ctx.fillText(val, x, 470);
              };

              drawStat(
                "VALUE",
                gameState.targetArtifactItem.value || "???",
                130
              );
              drawStat("EMBERS", gameState.embersCollected, 300);
              drawStat("TIME", `${minutes}m ${seconds}s`, 470);

              // Description Wrap
              ctx.fillStyle = "#ccc";
              ctx.font = "italic 20px Georgia";
              ctx.textAlign = "center";
              const text =
                gameState.targetArtifactItem.description ||
                "No lore available.";
              const maxWidth = 500;
              const lineHeight = 30;
              let x = width / 2;
              let y = 560;

              const words = text.split(" ");
              let line = "";
              for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + " ";
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && n > 0) {
                  ctx.fillText(line, x, y);
                  line = words[n] + " ";
                  y += lineHeight;
                } else {
                  line = testLine;
                }
              }
              ctx.fillText(line, x, y);

              // Footer
              ctx.fillStyle = "#444";
              ctx.font = "16px monospace";
              ctx.fillText(
                "DUNGEON OUTCAST | do.samseen.dev",
                width / 2,
                height - 30
              );

              // Download
              const link = document.createElement("a");
              link.download = `Victory_${
                gameState.targetArtifactItem.id
              }_${Date.now()}.png`;
              link.href = canvas.toDataURL();
              link.click();
            };

            // Icon Logic
            const iconFile = gameState.targetArtifactItem.icon;
            const glowColor = gameState.targetArtifactItem.glow || "#ffcc00";
            const iconSize = 120; // Bigger icon

            if (iconFile) {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                ctx.save();
                ctx.translate(width / 2, 200);
                // Add glow effect
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = 25;
                // Draw centered icon (bigger)
                ctx.drawImage(
                  img,
                  -iconSize / 2,
                  -iconSize / 2,
                  iconSize,
                  iconSize
                );
                ctx.restore();
                drawCardContent();
              };
              img.onerror = () => {
                // Fallback if image fails to load
                ctx.save();
                ctx.translate(width / 2, 200);
                ctx.fillStyle = "#ffffff";
                ctx.font = "100px Arial";
                ctx.textBaseline = "middle";
                ctx.textAlign = "center";
                ctx.fillText("🏆", 0, 0);
                ctx.restore();
                drawCardContent();
              };
              img.src = `/assets/artifacts/${iconFile}`;
            } else {
              // Emoji Fallback
              ctx.save();
              ctx.translate(width / 2, 200);
              ctx.fillStyle = "#ffffff";
              ctx.font = "100px Arial";
              ctx.textBaseline = "middle";
              ctx.textAlign = "center";
              ctx.fillText("🏆", 0, 0);
              ctx.restore();
              drawCardContent();
            }
          };
        }

        if (continueBtn) {
          continueBtn.onclick = () => {
            window.location.reload();
          };
        }

        if (overlay) overlay.classList.remove("hidden");

        // Play Victory Tone (audio already stopped above)
        playVictoryTone();
      }
    }
  }

  // Input: Harvest / Eat ('F')
  if (keys["f"]) {
    if (
      !player.lastEatTime ||
      Date.now() - player.lastEatTime > PLAYER_EAT_COOLDOWN
    ) {
      let tileX = Math.floor(player.x);
      let tileY = Math.floor(player.y);
      // 1. Check for nearby Berry Bushes (Harvest)
      let bushFound = false;
      // Scan radius
      const searchRadius = 2;
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        for (let dx = -searchRadius; dx <= searchRadius; dx++) {
          let tx = tileX + dx;
          let ty = tileY + dy;

          if (ty < 0 || ty >= map.length || tx < 0 || tx >= map[0].length)
            continue;

          let dist = Math.sqrt(
            (player.x - (tx + 0.5)) ** 2 + (player.y - (ty + 0.5)) ** 2
          );

          if (dist <= 2.0) {
            let cell = map[ty][tx];
            let tid = typeof cell === "object" ? cell.id || 0 : cell;

            if (tid === 8) {
              // Pull Berry Bush
              bushFound = true;
              playBerryCollect();

              // Spawn Berries
              let count = Math.floor(Math.random() * 3) + 1;
              for (let i = 0; i < count; i++) {
                spawnBerry(tx + 0.5, ty + 0.5);
              }

              // Change to Empty Bush
              if (typeof map[ty][tx] === "object") {
                map[ty][tx].id = 7;
              } else {
                map[ty][tx] = 7;
              }
              queueRegrowth(tx, ty);
              player.lastEatTime = Date.now();
              player.lastActionType = "harvest";

              // Determine Direction
              if (Math.abs(dx) > Math.abs(dy)) {
                player.lastHarvestDir = dx > 0 ? "right" : "left";
              } else {
                player.lastHarvestDir = dy > 0 ? "down" : "up";
              }
              break;
            }
          }
        }
        if (bushFound) break;
      }

      // 2. If no bush harvested, Try to Eat
      if (!bushFound) {
        if (gameState.inventory.food > 0 && player.hp < PLAYER_MAX_HP) {
          gameState.inventory.food--;
          player.hp = Math.min(
            PLAYER_MAX_HP,
            player.hp + PLAYER_EAT_HEAL_AMOUNT
          );
          player.lastEatTime = Date.now();
          player.lastActionType = "eat";
          gameState.haze = Math.max(0, gameState.haze - HAZE_EAT_REDUCTION);
          updateUI(gameState, player);
          playEatBerry();
          triggerHaptic(HAPTIC_EMBER); // Small satisfying tick
        }
      }
    }
  }

  // Proximity Hint for Bushes & Artifacts
  if (!player.lastHintTime || Date.now() - player.lastHintTime > 2000) {
    let hintShown = false;
    // 1. Artifact Hint
    if (gameState.targetArtifactLoc && !gameState.hasArtifact) {
      let dist = Math.sqrt(
        (player.x - gameState.targetArtifactLoc.x) ** 2 +
          (player.y - gameState.targetArtifactLoc.y) ** 2
      );
      if (dist <= 2.5) {
        showToast("Artifact Nearby! Press 'E' to Search", 2000);
        player.lastHintTime = Date.now();
        hintShown = true;
      }
    }
    // 2. Berry Bush Hint
    if (!hintShown) {
      const centerTileX = Math.floor(player.x);
      const centerTileY = Math.floor(player.y);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          let tx = centerTileX + dx;
          let ty = centerTileY + dy;
          if (ty >= 0 && ty < map.length && tx >= 0 && tx < map[0].length) {
            let cell = map[ty][tx];
            let tid = typeof cell === "object" ? cell.id || 0 : cell;
            if (tid === 8) {
              let dist = Math.sqrt(
                (player.x - (tx + 0.5)) ** 2 + (player.y - (ty + 0.5)) ** 2
              );
              if (dist <= 2.0) {
                showToast("Press 'F' to Harvest", 1000);
                player.lastHintTime = Date.now();
                break;
              }
            }
          }
        }
        if (player.lastHintTime > Date.now() - 100) break;
      }
    }
  }

  // Input: Check Location / Artifact ('E')
  if (keys["e"]) {
    if (
      !player.lastCheckTime ||
      Date.now() - player.lastCheckTime > PLAYER_CHECK_COOLDOWN
    ) {
      player.lastCheckTime = Date.now();
      const centerTileX = Math.floor(player.x);
      const centerTileY = Math.floor(player.y);

      if (
        gameState.targetArtifactLoc &&
        gameState.targetArtifactLoc.x === centerTileX &&
        gameState.targetArtifactLoc.y === centerTileY &&
        !gameState.hasArtifact
      ) {
        // Play collection animation before updating state
        const iconPath = gameState.targetArtifactItem?.icon
          ? `/assets/artifacts/${gameState.targetArtifactItem.icon}`
          : "/assets/artifacts/default.webp";
        const cam = getCamera(player, map);
        const tileSize = 40; // TILE_SIZE
        playArtifactCollectAnimation(
          centerTileX + 0.5,
          centerTileY + 0.5,
          cam.x,
          cam.y,
          tileSize,
          iconPath
        );

        gameState.hasArtifact = true;
        showToast("ARTIFACT FOUND! Run to the Exit!", 5000);
        playBingBing();
        gameState.haze += ARTIFACT_HAZE_PENALTY; // Loud noise!
        updateUI(gameState, player);
        return;
      } else if (!gameState.hasArtifact) {
        // Wrong location feedback
        gameState.haze += HAZE_MISS_PENALTY;
        updateUI(gameState, player);
        showToast("Nothing here...", 1000);
      }
    }
  }
}
