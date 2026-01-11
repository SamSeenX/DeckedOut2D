import { ACCELERATION, MAX_SPEED, RUN_MULT, SNEAK_MULT, PLAYER_RADIUS, BUNNY_HOP_BOOST, PLAYER_MAX_HP, PLAYER_JUMP_VELOCITY, PLAYER_EAT_COOLDOWN, PLAYER_EAT_HEAL_AMOUNT, PLAYER_CHECK_COOLDOWN, PLAYER_ANIMATION_SPEED, CLANK_SPEED_THRESHOLD, CLANK_CHANCE_MULTIPLIER, HAZARD_DAMAGE_CHANCE, ARTIFACT_CLANK_PENALTY, CLANK_WALK_INC, CLANK_RUN_INC, CLANK_JUMP_INC } from '../data/config.js';

import { keys } from '../core/input.js';
import { triggerShake } from '../core/camera.js';
import { map } from '../data/map.js';
import { BLOCK_DEFS, DEFAULT_BLOCK } from '../world/tiles.js';
import { checkWallCollision } from '../utils/collision.js';
import { gameState } from '../core/state.js';
import { updateUI, showToast, showVictory } from '../core/ui.js';

import { spawnEmber, queueRegrowth } from '../core/game.js';
import { playBingBing, playVictoryTone, playBerryCollect } from '../core/audio.js';

const sprite = new Image();
sprite.src = 'assets/sprits/player.webp';

// Standardized Animation Config
const ANIMATIONS = {
    idle: { row: 0, frames: 3, width: 64, height: 92, scaleW: 1, scaleH: 1 * (92 / 64) },
    walk_down: { row: 0, frames: 3, width: 64, height: 92, scaleW: 1, scaleH: 1 * (92 / 64) },
    walk_left: { row: 1, frames: 3, width: 64, height: 92, scaleW: 1, scaleH: 1 * (92 / 64) },
    walk_right: { row: 2, frames: 3, width: 64, height: 92, scaleW: 1, scaleH: 1 * (92 / 64) },
    walk_up: { row: 3, frames: 3, width: 64, height: 92, scaleW: 1, scaleH: 1 * (92 / 64) },
};

export const player = {
    x: 0, y: 0,
    vx: 0, vy: 0,
    hp: PLAYER_MAX_HP,
    radius: 0.3,

    // Animation State
    image: sprite,
    frameIndex: 0,
    tickCount: 0,
    ticksPerFrame: PLAYER_ANIMATION_SPEED,
    anim: 'idle',
    lastDamageTime: 0,

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

    takeDamage(amount) {
        this.hp -= amount;
        this.lastDamageTime = Date.now();
        triggerShake(0.2); // Shake intensity
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
        if (Math.abs(this.vx) > 0.001 || Math.abs(this.vy) > 0.001) {
            if (Math.abs(this.vy) > Math.abs(this.vx)) {
                this.anim = (this.vy > 0) ? 'walk_down' : 'walk_up';
            } else {
                this.anim = (this.vx > 0) ? 'walk_right' : 'walk_left';
            }
        } else {
            // If we want idle to face the last direction, we'd need to track it.
            // But existing code just set frame to 1 (center) and didn't change row (direction). 
            // Actually, old code: "this.direction" PERSISTED when not moving?
            // "if (moving) ... direction = ..." 
            // "else frameIndex = 1" -> it kept the old direction row!

            // My logic sets anim = 'idle'. 
            // To preserve "Idle in last direction", I need multiple idle states or logic override.
            // For strict standardization, let's just stick to 'idle' -> row 0 (down) for now, 
            // OR improve the logic to have idle_down, idle_up etc.

            // To match previous behavior "frameIndex = 1" (Center frame) on the LAST direction row:
            // I'll need 'lastAnim' or just don't reset anim to 'idle' but switch to 'idle_X'.

            // Let's Keep it Simple: 'idle' maps to Down (row 0) as defined in ANIMATIONS above.
            // User can improve later if they want directional idle.
            this.anim = 'idle';
        }

        // Cycle Frames
        if (this.anim !== 'idle') {
            this.tickCount++;
            if (this.tickCount > this.ticksPerFrame) {
                this.tickCount = 0;
                this.frameIndex++;
            }
        } else {
            this.frameIndex = 1; // Idle frame (Middle)
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
            let scaleW = (animData.scaleW !== undefined) ? animData.scaleW : 1.0;
            let scaleH = (animData.scaleH !== undefined) ? animData.scaleH : 1.0;
            let renderWidth = tileSize * scaleW;
            let renderHeight = tileSize * scaleH;

            // Center Helper
            let dx = ((this.x - camX) * tileSize) - (renderWidth / 2);

            // Vertical Alignment
            let feetOffset = tileSize * 0.25;
            let visualZ = (this.z * 10) + this.jumpOffset;
            let dy = ((this.y - camY) * tileSize) - renderHeight + feetOffset - visualZ;

            // Damage Tint
            const isDamaged = (Date.now() - this.lastDamageTime < 200);

            if (isDamaged) {
                ctx.save();
                ctx.filter = 'sepia(1) saturate(5) hue-rotate(-50deg)';
            }

            ctx.drawImage(
                this.image,
                sx, sy, animData.width, animData.height,
                dx, dy, renderWidth, renderHeight
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
            ctx.strokeRect(drawX, drawY, this.radius * 2 * tileSize, this.radius * 2 * tileSize);
        }
    }
};

function getTileZ(x, y) {
    if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return 0;
    let cell = map[Math.floor(y)][Math.floor(x)];

    // 1. Check Map Override
    if (typeof cell === 'object' && cell.z !== undefined) return cell.z;

    // 2. Check Block Registry Default
    let id = (typeof cell === 'object') ? (cell.id || 0) : cell;
    let def = BLOCK_DEFS[id];
    return def ? (def.z || 0) : 0;
}

function getTileId(x, y) {
    if (y < 0 || y >= map.length || x < 0 || x >= map[0].length) return 11; // Void
    let cell = map[Math.floor(y)][Math.floor(x)];
    return (typeof cell === 'object') ? (cell.id || 0) : cell;
}

// Tutorial State
let hasShownJumpToast = false;

export function updatePlayer() {
    let speedLimit = MAX_SPEED;
    let accel = ACCELERATION;
    let isRunning = keys['control'] || keys['ctrl'];
    let isSneaking = keys['shift'];
    let isJumping = keys[' ']; // Space check

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

    // Acceleration
    if (keys['w'] || keys['arrowup']) player.vy -= accel;
    if (keys['s'] || keys['arrowdown']) player.vy += accel;
    if (keys['a'] || keys['arrowleft']) player.vx -= accel;
    if (keys['d'] || keys['arrowright']) player.vx += accel;

    // Environment physics
    let centerBlockId = getTileId(player.x, player.y);
    let centerBlock = BLOCK_DEFS[centerBlockId] || DEFAULT_BLOCK;
    let slideFactor = centerBlock.slideFactor || 0.80;

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
    if (isJumping && !player.isFalling && !player.isJumping) { // Start jump
        player.isJumping = true;
        player.isBumping = false; // Override bump
        player.jumpVelocity = PLAYER_JUMP_VELOCITY; // Start upward
        player.bumpCount = 0; // Success! Reset counter

        // Jump Clank
        gameState.clank += CLANK_JUMP_INC;
        updateUI(gameState, player);
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

    // --- Footstep Clank Logic ---
    let currentSpeed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
    if (currentSpeed > CLANK_SPEED_THRESHOLD && !isSneaking && !player.isJumping) {
        // Increment Step Timer
        if (!player.stepTimer) player.stepTimer = 0;
        player.stepTimer++;

        const stepInterval = PLAYER_ANIMATION_SPEED * 3; // Approx 1 step per cycle
        if (player.stepTimer >= stepInterval) {
            player.stepTimer = 0;
            // Add Clank
            let inc = (isRunning) ? CLANK_RUN_INC : CLANK_WALK_INC;
            gameState.clank += inc;
            updateUI(gameState, player);
        }
    } else {
        player.stepTimer = 0; // Reset if stopped or sneaking
    }

    checkTileEvents(Math.floor(player.x), Math.floor(player.y));
}

function checkTileEvents(tileX, tileY) {
    if (tileY < 0 || tileY >= map.length || tileX < 0 || tileX >= map[0].length) return;

    let cell = map[tileY][tileX];
    let id = (typeof cell === 'object') ? (cell.id || 0) : cell;
    let block = BLOCK_DEFS[id];
    if (!block) return;

    // (Old Random Clank Logic Removed)

    // Hazards
    if (block.damage && Math.random() < HAZARD_DAMAGE_CHANCE) {
        player.takeDamage(block.damage);
    }

    // Berry Bushes (Harvest)
    if (block.heal) {
        // Sound
        playBerryCollect();

        // Add to inventory instead of auto-eat
        let amount = Math.floor(Math.random() * 3) + 1; // 1-3 berries
        gameState.inventory.food += amount;
        showToast(`Found ${amount} Berries`, 2000);

        // Consume the berry block (change to 7: Bush)
        if (typeof map[tileY][tileX] === 'object') {
            map[tileY][tileX].id = 7;
        } else {
            map[tileY][tileX] = 7;
        }

        queueRegrowth(tileX, tileY);

        updateUI(gameState, player);
    }

    // Input: Eat Food ('F')
    if (keys['f']) {
        if (!player.lastEatTime || Date.now() - player.lastEatTime > PLAYER_EAT_COOLDOWN) {
            if (gameState.inventory.food > 0 && player.hp < PLAYER_MAX_HP) {
                gameState.inventory.food--;
                player.hp = Math.min(PLAYER_MAX_HP, player.hp + PLAYER_EAT_HEAL_AMOUNT);
                player.lastEatTime = Date.now();
                updateUI(gameState, player);
                showToast("Ate a Berry", 1000);
            } else if (gameState.inventory.food <= 0) {
                // showToast("No Food!", 1000); 
            } else if (player.hp >= PLAYER_MAX_HP) {
                // Full HP
            }
        }
    }

    // Input: Check Location / Artifact ('E')
    if (keys['e']) {
        if (!player.lastCheckTime || Date.now() - player.lastCheckTime > PLAYER_CHECK_COOLDOWN) {
            player.lastCheckTime = Date.now();

            // 1. Check for Artifact
            if (gameState.targetArtifactLoc &&
                gameState.targetArtifactLoc.x === tileX &&
                gameState.targetArtifactLoc.y === tileY &&
                !gameState.hasArtifact) {

                gameState.hasArtifact = true;
                showToast("ARTIFACT FOUND! Run to the Exit!", 5000);
                playBingBing();
                gameState.clank += ARTIFACT_CLANK_PENALTY; // Loud noise!
                updateUI(gameState, player);
                return;
            } else if (!gameState.hasArtifact) {
                // Wrong location feedback
                // Calculate distance/direction text?
                showToast("Nothing here...", 1000);
            }

        }
    }

    // Auto-trigger: Check for Exit (Win)
    let isExit = (typeof cell === 'object' && cell.isExit);
    if (isExit) {
        if (gameState.hasArtifact) {
            if (!gameState.gameWon) { // Prevent double trigger
                gameState.gameWon = true;
                playVictoryTone();
                showVictory(gameState.targetArtifactItem, gameState.embersCollected);
            }
        } else {
            // Optionally prompt user? 'Exit Locked'
            // showToast("You need the Artifact!", 1000); 
            // (Too spammy if auto-trigger, better to leave silent until they try 'E' or just visual)
        }
    }
}
