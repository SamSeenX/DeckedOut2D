import { Enemy } from "./enemy.js";
import { checkLineOfSight } from "../world/lighting.js";
import {
  PHANTOM_ORBIT_SPEED,
  PHANTOM_SWOOP_SPEED,
  PHANTOM_SWOOP_COOLDOWN,
} from "../data/config.js";
import { SPRITES } from "../data/assets.js";

const SPRITE_IMAGE = new Image();
SPRITE_IMAGE.src = SPRITES.phantom;

// Standardized Animation Config (matches FrostBeast format)
const ANIMATIONS = {
  fly_right: {
    rows: [0], // Row 1 - Flying right (flip for left)
    frames: 4, // 4 frames per row
    fps: 8, // Animation speed for this action
    width: 128, // Frame width in pixels
    height: 128, // Frame height in pixels
    scaleW: 1.2, // Width multiplier of TILE_SIZE
    scaleH: 1.2, // Height multiplier of TILE_SIZE
  },
  fly_away: {
    rows: [1], // Row 2 - Flying away/up
    frames: 4,
    fps: 8,
    width: 128,
    height: 128,
    scaleW: 1.5,
    scaleH: 1.5,
  },
  attack_right: {
    rows: [2], // Row 3 - Attack (flip for left)
    frames: 4,
    fps: 12, // Faster during attack
    width: 128,
    height: 128,
    scaleW: 1.4, // Slightly larger during attack
    scaleH: 1.4,
  },
};

const STATES = {
  ORBIT: "ORBIT",
  SWOOP: "SWOOP",
  RECOVER: "RECOVER",
};

const ORBIT_DIST = 2.5;
const ORBIT_SPEED = PHANTOM_ORBIT_SPEED;
const SWOOP_SPEED = PHANTOM_SWOOP_SPEED;
const SWOOP_COOLDOWN = PHANTOM_SWOOP_COOLDOWN;

export class Phantom extends Enemy {
  constructor(playerX, playerY) {
    // Spawn near player
    let angle = Math.random() * Math.PI * 2;
    let dist = 4;
    super(playerX + Math.cos(angle) * dist, playerY + Math.sin(angle) * dist);

    this.type = "phantom";
    this.radius = 0.3;
    this.color = "#aaddff"; // Fallback color

    this.hp = 5;
    this.state = STATES.ORBIT;
    this.orbitAngle = angle;
    this.lastSwoopTime = 0;

    this.swoopTarget = { x: 0, y: 0 };

    // Standardized Animation State (matches FrostBeast)
    this.sprite = SPRITE_IMAGE;
    this.animations = ANIMATIONS;
    this.anim = "fly_right";
    this.frame = 0;
    this.animTimer = 0;
    this.facing = 1; // 1 = Right, -1 = Left
  }

  update(player, map, timeNow) {
    // Determine facing based on relative position to player
    if (player.x > this.x) {
      this.facing = 1; // Face right
    } else {
      this.facing = -1; // Face left
    }

    switch (this.state) {
      case STATES.ORBIT:
        this.anim = "fly_right";
        this.orbitAngle += ORBIT_SPEED;

        // Calculate desired orbit position
        let targetX = player.x + Math.cos(this.orbitAngle) * ORBIT_DIST;
        let targetY = player.y + Math.sin(this.orbitAngle) * ORBIT_DIST;

        // Smoothly move there (Fly)
        this.x += (targetX - this.x) * 0.05;
        this.y += (targetY - this.y) * 0.05;

        // Check for swoop (God mode prevents detection)
        if (!window.godMode && timeNow - this.lastSwoopTime > SWOOP_COOLDOWN) {
          if (checkLineOfSight(this.x, this.y, player.x, player.y)) {
            this.state = STATES.SWOOP;
            this.swoopTarget = { x: player.x, y: player.y };
            this.lastSwoopTime = timeNow;
            this.triggerAggro(player, timeNow);
          }
        }
        break;

      case STATES.SWOOP:
        this.anim = "attack_right";

        // Fly fast towards target
        let dx = this.swoopTarget.x - this.x;
        let dy = this.swoopTarget.y - this.y;
        let distToTarget = Math.sqrt(dx * dx + dy * dy);

        // Move
        if (distToTarget > 0.2) {
          this.x += (dx / distToTarget) * SWOOP_SPEED;
          this.y += (dy / distToTarget) * SWOOP_SPEED;
        }

        // Check Player Collision
        let distToPlayer = Math.sqrt(
          (player.x - this.x) ** 2 + (player.y - this.y) ** 2
        );

        // Debug Collision Registration
        if (distToPlayer < this.radius + 0.3 && player.activeCollisions) {
          player.activeCollisions.push({
            type: "entity",
            x: this.x,
            y: this.y,
            radius: this.radius,
            color: "rgba(255, 0, 255, 0.6)",
          });
        }

        // God mode prevents damage
        if (!window.godMode && distToPlayer < this.radius + 0.3) {
          player.takeDamage(1);
          this.hp -= 1;
          this.state = STATES.RECOVER;
          this.lastSwoopTime = timeNow;
          return;
        }

        // Missed player
        if (distToTarget <= 0.2) {
          this.hp -= 1;
          this.state = STATES.RECOVER;
          this.lastSwoopTime = timeNow;
        }
        break;

      case STATES.RECOVER:
        this.anim = "fly_away";

        if (timeNow - this.lastSwoopTime > 1000) {
          this.state = STATES.ORBIT;
        }
        break;
    }

    this.updateAnimation(timeNow);
  }

  updateAnimation(timeNow) {
    const currentAnimData = ANIMATIONS[this.anim];
    const targetFPS = currentAnimData.fps || 8;
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

  // Uses base Enemy.draw() which supports standardized animation system
}
