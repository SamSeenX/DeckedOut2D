
import { TILE_SIZE, PLAYER_RADIUS, HAZE_AGGRO_PENALTY, HAZE_AGGRO_COOLDOWN } from '../data/config.js';
import { checkWallCollision } from '../utils/collision.js';
import { checkLineOfSight } from '../world/lighting.js';
import { gameState } from '../core/state.js';
import { updateUI } from '../core/ui.js';
import { triggerHaptic, HAPTIC_AGGRO } from '../core/haptics.js';

// Constants for AI
const STATES = {
    IDLE: 'IDLE',
    CHASE: 'CHASE',
    SEARCHING: 'SEARCHING'
};

const VIEW_RANGE = 7;
const LOSE_SIGHT_RANGE = 10;
const SEARCH_DURATION = 3000; // ms
const IDLE_MOVE_INTERVAL = 2000; // ms

export class Enemy {
    constructor(x, y) {
        this.type = 'base';
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.spawnX = x;
        this.spawnY = y;

        this.radius = PLAYER_RADIUS;
        this.color = 'white';

        // State
        this.state = STATES.IDLE;
        this.targetX = x;
        this.targetY = y;
        this.lastSeenPlayerPos = { x: 0, y: 0 };
        this.stateTimer = 0;
        this.lastMoveTime = 0;
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
                let scaleW = (animData.scaleW !== undefined) ? animData.scaleW : 1.0;
                let scaleH = (animData.scaleH !== undefined) ? animData.scaleH : 1.0;

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
                    sx, sy, animData.width, animData.height,
                    destX, destY, w, h
                );
                ctx.restore();
                return;
            }
        }

        // Fallback: Circle
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(drawX, drawY, TILE_SIZE * this.radius, 0, Math.PI * 2);
        ctx.fill();
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
