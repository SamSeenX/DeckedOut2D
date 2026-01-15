import { Enemy } from "./enemy.js";
import {
  TILE_SIZE,
  FROST_BEAST_SPEED,
  FROST_BEAST_ACCEL,
  FROST_BEAST_CHASE_SPEED_MULT,
  FROST_BEAST_DETECTION_RANGE,
  FROST_BEAST_IDLE_FPS,
  FROST_BEAST_CHASE_FPS,
  FROST_BEAST_PATROL_RADIUS,
} from "../data/config.js";
// Collision is handled via inherited this.checkCollision() from Enemy class
import { checkLineOfSight } from "../world/lighting.js";
import { BLOCK_DEFS, DEFAULT_BLOCK } from "../world/tiles.js";
import { SPRITES } from "../data/assets.js";
import { playJson } from "../core/audio.js";

const SPRITE_IMAGE = new Image();
SPRITE_IMAGE.src = SPRITES.frostbeast;

const ANIMATIONS = {
  walk_down: {
    rows: [0], // Row 1
    frames: 6,
    fps: 6, // Idle animation speed
    width: 128,
    height: 212,
    scaleW: 1.0 * 1.2,
    scaleH: 1.5 * 1.2,
  },
  walk_up: {
    rows: [1], // Row 2
    frames: 6,
    fps: 6,
    width: 128,
    height: 212,
    scaleW: 1.0 * 1.4,
    scaleH: 1.5 * 1.4,
  },
  walk_right: {
    rows: [2, 3], // Multi-row
    frames: 6,
    fps: 6, // Will be overridden to 12 during chase
    width: 256,
    height: 212,
    framesPerRow: 3,
    scaleW: 2.0 * 1,
    scaleH: 1.65 * 1,
  },
};

const STATES = {
  IDLE: "IDLE",
  CHASE: "CHASE",
  SEARCHING: "SEARCHING",
};

const DETECTION_RANGE = FROST_BEAST_DETECTION_RANGE;
const SEARCH_DURATION = 3000;
const IDLE_MOVE_INTERVAL = 2000;

export class FrostBeast extends Enemy {
  constructor(x, y) {
    super(x, y);
    this.type = "frostbeast";
    this.accel = FROST_BEAST_ACCEL;
    this.maxSpeed = FROST_BEAST_SPEED;

    // Ensure color is set, though we will use sprite
    this.color = "red";
    this.lastAttackTime = 0;

    // Animation State
    this.sprite = SPRITE_IMAGE;
    this.animations = ANIMATIONS;
    this.anim = "walk_down";
    this.frame = 0;
    this.animTimer = 0;
    this.facing = 1; // 1 = Right, -1 = Left

    // Audio State
    this.lastVocalTime = 0;
    this.lastStepTime = 0;

    // Stuck Detection State
    this.lastPos = { x: x, y: y };
    this.stuckTimer = 0;
    this.isSidestepping = false;
    this.sidestepTimer = 0;
    this.sidestepDir = { x: 0, y: 0 };
  }

  update(player, map, timeNow) {
    // Update squeeze/push system for navigating tight spaces
    this.updateSqueezeSystem(timeNow);

    // Distance to Player
    let distToPlayer = Math.sqrt(
      (player.x - this.x) ** 2 + (player.y - this.y) ** 2
    );

    // Attack Logic: Melee Range (God mode prevents attacks)
    if (
      !window.godMode &&
      distToPlayer < 0.8 &&
      timeNow - this.lastAttackTime > 1000
    ) {
      player.takeDamage(2);
      this.lastAttackTime = timeNow;
    }

    // Debug Collision Registration (Continuous if close enough to bite)
    if (distToPlayer < 0.8 && player.activeCollisions) {
      player.activeCollisions.push({
        type: "entity",
        x: this.x,
        y: this.y,
        radius: 0.6,
        color: "rgba(255, 0, 0, 0.6)",
      });
    }

    // Visibility - God Mode makes player invisible to enemies
    let canSeePlayer =
      !window.godMode &&
      distToPlayer < DETECTION_RANGE &&
      checkLineOfSight(this.x, this.y, player.x, player.y);

    // --- STATE MACHINE ---
    switch (this.state) {
      case STATES.IDLE:
        if (canSeePlayer) {
          this.state = STATES.CHASE;
          this.color = "#ff0000";
          playJson("assets/sounds/frostbeast_detect.json");
          this.triggerAggro(player, timeNow);
        } else if (timeNow - this.lastMoveTime > IDLE_MOVE_INTERVAL) {
          // Try to find a valid non-wall spot to roam to
          let attempts = 0;
          while (attempts < 5) {
            let angle = Math.random() * Math.PI * 2;
            let dist = Math.random() * FROST_BEAST_PATROL_RADIUS;
            let tx = this.spawnX + Math.cos(angle) * dist;
            let ty = this.spawnY + Math.sin(angle) * dist;

            // Check if point is inside a wall
            if (!this.checkCollision(tx, ty)) {
              this.targetX = tx;
              this.targetY = ty;
              break;
            }
            attempts++;
          }
          // If we failed 5 times, we just stay put (targetX/Y remain as is or could reset to spawn)

          this.lastMoveTime = timeNow;
        }

        // Roam Vocal (Randomly)
        if (Math.random() < 0.005 && timeNow - this.lastVocalTime > 5000) {
          playJson("assets/sounds/frostbeast_roam.json");
          this.lastVocalTime = timeNow;
        }
        break;

      case STATES.CHASE:
        if (canSeePlayer) {
          this.targetX = player.x;
          this.targetY = player.y;
          this.lastSeenPlayerPos = { x: player.x, y: player.y };

          // --- Stuck Detection Logic ---
          if (!this.isSidestepping) {
            let distMoved = Math.sqrt(
              (this.x - this.lastPos.x) ** 2 + (this.y - this.lastPos.y) ** 2
            );

            // Calculate expected movement based on terrain
            let baseSpeed =
              this.maxSpeed *
              (this.state === STATES.CHASE
                ? FROST_BEAST_CHASE_SPEED_MULT
                : 1.0);
            let terrainFactor = this.currentTerrainFactor || 0.8;
            let expectedDist = baseSpeed * terrainFactor; // Approximate per-frame distance

            // If movement is less than 30% of what we expect for this terrain, we are likely stuck
            let stuckThreshold = expectedDist * 0.3;

            let timeDelta = timeNow - (this.lastCheckTime || timeNow);

            if (distMoved < stuckThreshold) {
              this.stuckTimer += timeDelta;
            } else {
              // Leaky bucket: decrement timer instead of hard reset
              // This makes it handle jittery collision movement better
              this.stuckTimer = Math.max(0, this.stuckTimer - timeDelta);
            }
            this.lastPos = { x: this.x, y: this.y };
            this.lastCheckTime = timeNow;

            // Trigger Sidestep if stuck > 500ms
            if (this.stuckTimer > 500) {
              this.isSidestepping = true;
              this.sidestepTimer = 300; // Sidestep duration (ms)
              this.stuckTimer = 0;

              // Calculate Sidestep Direction (Perpendicular to target)
              // Vector to player
              let dx = player.x - this.x;
              let dy = player.y - this.y;
              // Normalize
              let len = Math.sqrt(dx * dx + dy * dy);
              if (len > 0) {
                dx /= len;
                dy /= len;
              }
              // Rotate 90 degrees to find candidate directions
              let leftDir = { x: -dy, y: dx };
              let rightDir = { x: dy, y: -dx };

              // Check collision for both candidates
              // "Project" position slightly out to see if it's a wall
              let checkDist = 0.5; // Half a tile check
              let leftBlocked = this.checkCollision(
                this.x + leftDir.x * checkDist,
                this.y + leftDir.y * checkDist
              );
              let rightBlocked = this.checkCollision(
                this.x + rightDir.x * checkDist,
                this.y + rightDir.y * checkDist
              );

              if (!leftBlocked && rightBlocked) {
                this.sidestepDir = leftDir;
              } else if (!rightBlocked && leftBlocked) {
                this.sidestepDir = rightDir;
              } else {
                // If both blocked or both free, pick randomly
                if (Math.random() < 0.5) {
                  this.sidestepDir = leftDir;
                } else {
                  this.sidestepDir = rightDir;
                }
              }
            }
          }
        } else {
          this.state = STATES.SEARCHING;
          this.stateTimer = timeNow;
          this.color = "#aa0000";
          this.targetX = this.lastSeenPlayerPos.x;
          this.targetY = this.lastSeenPlayerPos.y;
          this.isSidestepping = false; // Reset if lost sight
        }

        // Chase Bark (Randomly)
        if (Math.random() < 0.02 && timeNow - this.lastVocalTime > 2000) {
          playJson("assets/sounds/frostbeast_chase.json");
          this.lastVocalTime = timeNow;
        }
        break;

      case STATES.SEARCHING:
        if (canSeePlayer) {
          this.state = STATES.CHASE;
          this.searchStartTime = 0; // Reset failsafe
          this.color = "#ff0000";
          playJson("assets/sounds/frostbeast_detect.json");
        } else {
          let distToTarget = Math.sqrt(
            (this.targetX - this.x) ** 2 + (this.targetY - this.y) ** 2
          );
          if (distToTarget < 0.5) {
            if (timeNow - this.lastMoveTime > 500) {
              let angle = Math.random() * Math.PI * 2;
              let dist = 2;
              this.targetX = this.x + Math.cos(angle) * dist;
              this.targetY = this.y + Math.sin(angle) * dist;
              this.lastMoveTime = timeNow;
            }
          } else {
            // If we haven't reached the target (last seen pos) yet,
            // keep the search timer fresh so we don't give up while traveling.
            // FAILSAFE: Only do this for 10 seconds max to prevent infinite loops if unreachable.
            if (!this.searchStartTime) this.searchStartTime = timeNow;

            if (timeNow - this.searchStartTime < 10000) {
              this.stateTimer = timeNow;
            }
          }

          if (timeNow - this.stateTimer > SEARCH_DURATION) {
            this.state = STATES.IDLE;
            this.searchStartTime = 0; // Reset failsafe
            this.color = "red";
            // Roam around CURRENT location instead of returning to spawn
            this.spawnX = this.x;
            this.spawnY = this.y;
            this.targetX = this.x;
            this.targetY = this.y;
          }
        }
        break;
    }

    this.applyPhysics(map, timeNow);
    this.updateAnimation(timeNow);
  }

  updateAnimation(timeNow) {
    // Determine Direction
    if (Math.abs(this.vx) > Math.abs(this.vy)) {
      if (Math.abs(this.vx) > 0.001) {
        this.anim = "walk_right";
        this.facing = this.vx > 0 ? 1 : -1;
      }
    } else {
      if (Math.abs(this.vy) > 0.001) {
        this.anim = this.vy > 0 ? "walk_down" : "walk_up";
      }
    }

    // Get FPS from animation config, boost during chase
    const currentAnimData = ANIMATIONS[this.anim];
    let targetFPS = currentAnimData.fps || FROST_BEAST_IDLE_FPS;
    if (this.state === STATES.CHASE) {
      targetFPS = FROST_BEAST_CHASE_FPS;
    }
    const frameTime = 1000 / targetFPS;

    // Cycle Frames
    if (timeNow - this.animTimer > frameTime) {
      this.frame++;
      if (this.frame >= currentAnimData.frames) {
        this.frame = 0;
      }
      this.animTimer = timeNow;
    }
  }

  applyPhysics(map, timeNow) {
    let dx = this.targetX - this.x;
    let dy = this.targetY - this.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    // First, calculate terrain slowdown based on tiles we're standing on
    const radius = 0.4;
    const startX = Math.floor(this.x - radius);
    const endX = Math.floor(this.x + radius);
    const startY = Math.floor(this.y - radius);
    const endY = Math.floor(this.y + radius);

    let minSlideFactor = 1.0;
    let touchedTiles = false;

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) continue;

        let cell = map[y][x];
        let id = typeof cell === "object" ? cell.id || 0 : cell;
        let block = BLOCK_DEFS[id] || DEFAULT_BLOCK;

        let sf = block.slideFactor !== undefined ? block.slideFactor : 0.8;

        if (!touchedTiles) {
          minSlideFactor = sf;
          touchedTiles = true;
        } else {
          minSlideFactor = Math.min(minSlideFactor, sf);
        }
      }
    }

    if (!touchedTiles) minSlideFactor = 0.8;

    if (!touchedTiles) minSlideFactor = 0.8;

    // Track current terrain factor for dynamic stuck detection
    this.currentTerrainFactor = minSlideFactor;

    // Acceleration - ALSO affected by terrain (enemies struggle on mud/water)
    if (dist > 0.1 || this.isSidestepping) {
      let dirX, dirY;

      // Sidestep Override
      if (this.isSidestepping) {
        dirX = this.sidestepDir.x;
        dirY = this.sidestepDir.y;

        // Decrease Timer
        // We need 'timeNow' diff or just approximate per frame?
        // We have timeNow passed in. But we need delta.
        // Let's assume ~16ms or just use a fixed decrement if delta isn't available easily here.
        // Wait, applyPhysics has 'timeNow'. We used 'lastStepTime' before.
        // Let's just use a fixed 16ms decrement for simplicity or track lastFrameTime globally?
        // Actually, this.sidestepTimer was set to 300ms.
        // We don't have delta time passed clearly.
        // Let's rely on valid dist check or just assume 60fps (16ms)
        this.sidestepTimer -= 16;
        if (this.sidestepTimer <= 0) {
          this.isSidestepping = false;
        }
      } else {
        dirX = dx / dist;
        dirY = dy / dist;
      }

      let speedMult =
        this.state === STATES.CHASE ? FROST_BEAST_CHASE_SPEED_MULT : 1.0;

      // Apply terrain factor to acceleration (mud slows down acceleration too)
      let terrainAccelMult = Math.max(0.3, minSlideFactor); // At least 30% accel on worst terrain

      this.vx += dirX * this.accel * speedMult * terrainAccelMult;
      this.vy += dirY * this.accel * speedMult * terrainAccelMult;
    }

    // Friction/Slowdown from terrain (uses same minSlideFactor calculated above)
    this.vx *= minSlideFactor;
    this.vy *= minSlideFactor;

    // Velocity Clamping
    let speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
    let actualMaxSpeed =
      this.state === STATES.CHASE
        ? this.maxSpeed * FROST_BEAST_CHASE_SPEED_MULT
        : this.maxSpeed;

    if (speed > actualMaxSpeed) {
      let ratio = actualMaxSpeed / speed;
      this.vx *= ratio;
      this.vy *= ratio;
    }

    // Footstep Sounds
    if (speed > 0.02) {
      let stepInterval = this.state === STATES.CHASE ? 250 : 500; // Run vs Walk
      if (timeNow - this.lastStepTime > stepInterval) {
        if (this.state === STATES.CHASE) {
          playJson("assets/sounds/frostbeast_step_run.json");
        } else {
          playJson("assets/sounds/frostbeast_step_walk.json");
        }
        this.lastStepTime = timeNow;
      }
    }

    // Collision & Movement
    const contact = this.lastWallContact || {};

    // X Movement
    let nextX = this.x + this.vx;
    let blockedX = this.checkCollision(nextX, this.y);

    // "Force Escape": If blocked, but moving AWAY from a contact into free space, allow it.
    if (blockedX) {
      if (this.vx > 0 && contact.left && !contact.right) blockedX = false;
      if (this.vx < 0 && contact.right && !contact.left) blockedX = false;
    }

    if (!blockedX) {
      this.x += this.vx;
    } else {
      this.vx = 0;
    }

    // Y Movement
    let nextY = this.y + this.vy;
    let blockedY = this.checkCollision(this.x, nextY);

    if (blockedY) {
      if (this.vy > 0 && contact.top && !contact.bottom) blockedY = false;
      if (this.vy < 0 && contact.bottom && !contact.top) blockedY = false;
    }

    if (!blockedY) {
      this.y += this.vy;
    } else {
      this.vy = 0;
    }
  }
}
