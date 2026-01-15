import {
  TILE_SIZE,
  PLAYER_RADIUS,
  HAZE_AGGRO_PENALTY,
  HAZE_AGGRO_COOLDOWN,
} from "../data/config.js";
import {
  checkWallCollision,
  checkAABBCollision,
  calculateAABBBounds,
  checkAABBWallSides,
} from "../utils/collision.js";
import { checkLineOfSight } from "../world/lighting.js";
import { gameState } from "../core/state.js";
import { updateUI } from "../core/ui.js";
import { triggerHaptic, HAPTIC_AGGRO } from "../core/haptics.js";

// Constants for AI
const STATES = {
  IDLE: "IDLE",
  CHASE: "CHASE",
  SEARCHING: "SEARCHING",
};

// Squeeze/Push constants
const SQUEEZE_DURATION = 200; // ms - how long to stay squeezed
const SQUEEZE_FACTOR = 0.5; // Reduce bounds by 50% when squeezing
const PUSH_STRENGTH = 0.04; // Gradual push force per frame (doubled)
const SQUEEZE_RESTORE_RATE = 0.1; // How fast to restore from squeeze (per frame)

const VIEW_RANGE = 7;
const LOSE_SIGHT_RANGE = 10;
const SEARCH_DURATION = 3000; // ms
const IDLE_MOVE_INTERVAL = 2000; // ms

export class Enemy {
  constructor(x, y) {
    this.type = "base";
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.spawnX = x;
    this.spawnY = y;

    this.radius = PLAYER_RADIUS;
    this.color = "white";

    // State
    this.state = STATES.IDLE;
    this.targetX = x;
    this.targetY = y;
    this.lastSeenPlayerPos = { x: 0, y: 0 };
    this.stateTimer = 0;
    this.lastMoveTime = 0;

    // AABB Collision insets (percentage to cut from each side)
    // Can be overridden by subclasses
    this.collisionInsets = {
      top: 0.4, // 40% from top (excludes horns/head)
      side: 0.25, // 25% from each side (excludes arms/wings)
      bottom: 0.1, // 10% from bottom (excludes shadow)
    };

    // Cached bounds (updated when animation changes)
    this._cachedBounds = null;
    this._cachedAnim = null;

    // Squeeze system for navigating tight spaces
    this.squeezeAmount = 0; // 0 = normal, 1 = fully squeezed
    this.squeezeTimer = 0; // When squeeze was triggered
    this.isSqueezing = false;
    this.lastWallContact = {
      left: false,
      right: false,
      top: false,
      bottom: false,
    };
  }

  /**
   * Get the current AABB collision bounds based on sprite size
   * Applies squeeze factor if currently squeezing through tight space
   */
  getCollisionBounds() {
    // Get base bounds (cached when possible)
    let baseBounds;
    if (this._cachedBounds && this._cachedAnim === this.anim) {
      baseBounds = this._cachedBounds;
    } else {
      // Get current animation scale
      let scaleW = 1.0;
      let scaleH = 1.0;

      if (this.animations && this.anim) {
        const animData = this.animations[this.anim];
        if (animData) {
          scaleW = animData.scaleW !== undefined ? animData.scaleW : 1.0;
          scaleH = animData.scaleH !== undefined ? animData.scaleH : 1.0;
        }
      }

      // Calculate and cache bounds
      this._cachedBounds = calculateAABBBounds(
        scaleW,
        scaleH,
        this.collisionInsets
      );
      this._cachedAnim = this.anim;
      baseBounds = this._cachedBounds;
    }

    // Apply squeeze factor if squeezing
    if (this.squeezeAmount > 0) {
      const squeezeMult = 1 - this.squeezeAmount * (1 - SQUEEZE_FACTOR);
      return {
        left: baseBounds.left * squeezeMult,
        right: baseBounds.right * squeezeMult,
        top: baseBounds.top * squeezeMult,
        bottom: baseBounds.bottom * squeezeMult,
        _scaleW: baseBounds._scaleW,
        _scaleH: baseBounds._scaleH,
        _squeezed: this.squeezeAmount > 0,
      };
    }

    return baseBounds;
  }

  /**
   * Check wall collision using AABB bounds
   */
  checkCollision(targetX, targetY) {
    const bounds = this.getCollisionBounds();
    return checkAABBCollision(targetX, targetY, bounds);
  }

  /**
   * Check which sides of the bounding box are touching walls
   * Returns object with left, right, top, bottom booleans
   */
  checkWallSides(targetX, targetY) {
    const bounds = this.getCollisionBounds();
    return checkAABBWallSides(targetX, targetY, bounds);
  }

  /**
   * Update squeeze/push system - call this in subclass update()
   * Handles:
   * - Detecting wall contact on each side
   * - Triggering squeeze mode when trapped between opposite walls
   * - Applying push force when touching single wall
   * - Gradually restoring from squeeze
   */
  updateSqueezeSystem(timeNow) {
    // Check wall contact on all sides
    const wc = this.checkWallSides(this.x, this.y);
    this.lastWallContact = wc;

    // Check for ANY wall contact to trigger squeeze (making entity "soft")
    const trappedHorizontally = wc.left && wc.right;
    const trappedVertically = wc.top && wc.bottom;
    const anyContact = wc.left || wc.right || wc.top || wc.bottom;

    if (anyContact) {
      // Trigger squeeze mode
      if (!this.isSqueezing) {
        this.isSqueezing = true;
        this.squeezeTimer = timeNow;
      }

      // Increase squeeze amount
      this.squeezeAmount = Math.min(1, this.squeezeAmount + 0.3);

      // 1. Trapped Logic:
      // We do NOT push forward/backward here anymore, to allow terrain friction to work.
      // The "Squeeze" (shrinking bounds) is enough to let standard movement logic function.
      // We rely on the lateral pushes (singe wall logic below) to center the entity.

      // (Forward boost removed to fix "too fast" issue)

      // 2. Single Wall Logic: Gentle Push away from wall
      if (wc.left && !wc.right) this.vx += PUSH_STRENGTH;
      if (wc.right && !wc.left) this.vx -= PUSH_STRENGTH;
      if (wc.top && !wc.bottom) this.vy += PUSH_STRENGTH;
      if (wc.bottom && !wc.top) this.vy -= PUSH_STRENGTH;
    } else {
      // No contact - restore normal state
      this.isSqueezing = false;

      // Gradually restore from squeeze
      if (this.squeezeAmount > 0) {
        if (timeNow - this.squeezeTimer > SQUEEZE_DURATION) {
          this.squeezeAmount = Math.max(
            0,
            this.squeezeAmount - SQUEEZE_RESTORE_RATE
          );
        }
      }
    }
  }

  update(player, map, timeNow) {
    // Override in subclasses
  }

  draw(ctx, camX, camY) {
    let drawX = (this.x - camX) * TILE_SIZE;
    let drawY = (this.y - camY) * TILE_SIZE;

    // Check for Standard Sprite System
    if (this.sprite && this.sprite.complete && this.animations && this.anim) {
      const animData = this.animations[this.anim];
      if (animData) {
        // Determine Frame
        let frame = this.frame || 0;

        // Calculate Source
        let sx, sy;
        if (animData.rows.length === 1) {
          sx = frame * animData.width;
          sy = animData.rows[0] * animData.height;
        } else {
          // Multi-row support
          let framesPerRow = animData.framesPerRow || animData.frames;
          let rowIdx = Math.floor(frame / framesPerRow);
          let frameInRow = frame % framesPerRow;
          if (rowIdx >= animData.rows.length) rowIdx = animData.rows.length - 1;

          let actualRow = animData.rows[rowIdx];
          sx = frameInRow * animData.width;
          sy = actualRow * animData.height;
        }

        // Render Size Multipliers (Standard)
        let scaleW = animData.scaleW !== undefined ? animData.scaleW : 1.0;
        let scaleH = animData.scaleH !== undefined ? animData.scaleH : 1.0;

        let w = TILE_SIZE * scaleW;
        let h = TILE_SIZE * scaleH;

        let destX = drawX - w / 2;
        let destY = drawY - h / 2;

        // Optional Facing Flip
        ctx.save();
        if (this.facing === -1) {
          ctx.translate(drawX, drawY);
          ctx.scale(-1, 1);
          ctx.translate(-drawX, -drawY);
        }

        ctx.drawImage(
          this.sprite,
          sx,
          sy,
          animData.width,
          animData.height,
          destX,
          destY,
          w,
          h
        );
        ctx.restore();

        // DEBUG: Draw bounding boxes
        if (window.debugMode) {
          this.drawDebugBounds(ctx, camX, camY);
        }
        return;
      }
    }

    // Fallback: Circle
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(drawX, drawY, TILE_SIZE * this.radius, 0, Math.PI * 2);
    ctx.fill();

    // DEBUG: Draw collision circle for fallback
    if (window.debugMode) {
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  /**
   * Draw debug visualization of collision bounds
   */
  drawDebugBounds(ctx, camX, camY) {
    const bounds = this.getCollisionBounds();
    const drawX = (this.x - camX) * TILE_SIZE;
    const drawY = (this.y - camY) * TILE_SIZE;

    // Calculate box corners in screen space
    const boxLeft = drawX - bounds.left * TILE_SIZE;
    const boxRight = drawX + bounds.right * TILE_SIZE;
    const boxTop = drawY - bounds.top * TILE_SIZE;
    const boxBottom = drawY + bounds.bottom * TILE_SIZE;

    const boxWidth = boxRight - boxLeft;
    const boxHeight = boxBottom - boxTop;

    // Draw collision box (filled semi-transparent)
    // Color changes based on squeeze state
    if (this.squeezeAmount > 0) {
      ctx.fillStyle = `rgba(255, 128, 0, ${0.2 + this.squeezeAmount * 0.3})`; // Orange when squeezing
    } else {
      ctx.fillStyle = "rgba(255, 255, 0, 0.2)"; // Yellow normally
    }
    ctx.fillRect(boxLeft, boxTop, boxWidth, boxHeight);

    // Draw collision box outline
    ctx.strokeStyle = this.squeezeAmount > 0 ? "orange" : "yellow";
    ctx.lineWidth = 2;
    ctx.strokeRect(boxLeft, boxTop, boxWidth, boxHeight);

    // Draw wall contact indicators (Red squares per side)
    const wc = this.lastWallContact;
    ctx.fillStyle = "red";
    const indicatorSize = 6;
    if (wc.left)
      ctx.fillRect(
        boxLeft - indicatorSize,
        drawY - indicatorSize / 2,
        indicatorSize,
        indicatorSize
      );
    if (wc.right)
      ctx.fillRect(
        boxRight,
        drawY - indicatorSize / 2,
        indicatorSize,
        indicatorSize
      );
    if (wc.top)
      ctx.fillRect(
        drawX - indicatorSize / 2,
        boxTop - indicatorSize,
        indicatorSize,
        indicatorSize
      );
    if (wc.bottom)
      ctx.fillRect(
        drawX - indicatorSize / 2,
        boxBottom,
        indicatorSize,
        indicatorSize
      );

    // Draw detailed sample points (Cyan = free, Magenta = solid)
    if (wc.debugPoints) {
      wc.debugPoints.forEach((point) => {
        const px = (point.x - camX) * TILE_SIZE;
        const py = (point.y - camY) * TILE_SIZE;

        ctx.fillStyle = point.solid ? "#ff00ff" : "#00ffff"; // Magenta if solid, Cyan if free
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw center point
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(drawX, drawY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw squeeze indicator text
    if (this.squeezeAmount > 0) {
      ctx.fillStyle = "orange";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        `SQUEEZE: ${(this.squeezeAmount * 100).toFixed(0)}%`,
        drawX,
        boxTop - 8
      );
    }

    // Draw visual sprite bounds (dashed outline)
    if (this.animations && this.anim) {
      const animData = this.animations[this.anim];
      if (animData) {
        const scaleW = animData.scaleW || 1;
        const scaleH = animData.scaleH || 1;
        const visualW = TILE_SIZE * scaleW;
        const visualH = TILE_SIZE * scaleH;

        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(
          drawX - visualW / 2,
          drawY - visualH / 2,
          visualW,
          visualH
        );
        ctx.setLineDash([]);
      }
    }
  }

  triggerAggro(player, timeNow) {
    if (timeNow - player.lastAggroHazeTime > HAZE_AGGRO_COOLDOWN) {
      gameState.haze += HAZE_AGGRO_PENALTY;
      player.lastAggroHazeTime = timeNow;
      updateUI(gameState, player);
      // Haptic Feedback for Aggro
      triggerHaptic(HAPTIC_AGGRO);
    }
  }
}
