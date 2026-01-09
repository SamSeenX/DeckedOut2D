import { ACCELERATION, MAX_SPEED, RUN_MULT, SNEAK_MULT, PLAYER_RADIUS } from '../utils/constants.js';
import { keys } from '../core/input.js';
import { map } from '../world/map.js';
import { BLOCK_DEFS, DEFAULT_BLOCK } from '../world/tiles.js';
import { checkWallCollision } from '../utils/collision.js';
import { gameState } from '../core/state.js';
import { updateUI } from '../core/ui.js';

const sprite = new Image();
sprite.src = 'assets/sprits/player.webp';

export const player = {
    x: 0, y: 0,
    vx: 0, vy: 0,
    hp: 10,
    radius: 0.3,

    // Animation State
    image: sprite,
    frameIndex: 0,
    tickCount: 0,
    ticksPerFrame: 10,
    direction: 0, // 0: Down, 1: Left, 2: Right, 3: Up
    lastDamageTime: 0,

    // Jump/Elevation State
    z: 0,
    jumpOffset: 0,
    isJumping: false,

    takeDamage(amount) {
        this.hp -= amount;
        this.lastDamageTime = Date.now();
        // Trigger UI update if needed, currently done in game loop or events
        updateUI(gameState, player);
    },

    draw(ctx, camX, camY, tileSize) {
        // Update Animation
        if (Math.abs(this.vx) > 0.001 || Math.abs(this.vy) > 0.001) {
            this.tickCount++;
            if (this.tickCount > this.ticksPerFrame) {
                this.tickCount = 0;
                this.frameIndex = (this.frameIndex + 1) % 3; // Fixed: 3 frames per row
            }

            // Determine Direction
            if (Math.abs(this.vy) > Math.abs(this.vx)) {
                this.direction = (this.vy > 0) ? 0 : 3; // Down or Up
            } else {
                this.direction = (this.vx > 0) ? 2 : 1; // Right or Left
            }
        } else {
            this.frameIndex = 1; // Idle frame (Using middle frame 1 often looks better than 0 for 3-frame walkers)
        }

        if (this.image.complete) {
            const frameW = this.image.width / 3; // Fixed: 3 columns
            const frameH = this.image.height / 4;

            // Source X/Y
            let sx = this.frameIndex * frameW;
            let sy = this.direction * frameH;

            // Destination X/Y
            // Player.x/y is the CENTER of the tile (e.g. 1.5, 1.5)
            // We want the Sprite's FEET to be at this center point.

            // 1. Calculate the Size on Screen
            // Let's make the sprite 1.5x larger than a tile to have that nice overflow
            // 1. Calculate the Size on Screen
            // Maintain aspect ratio (e.g., 64x92)
            // Use existing size logic for Width, then scale Height
            let renderWidth = tileSize * 1.5;
            let ratio = frameH / frameW;
            let renderHeight = renderWidth * ratio;

            // 2. Center Horizontally
            // dx is the top-left corner. (x-camX)*tileSize is the center of the tile.
            let dx = ((this.x - camX) * tileSize) - (renderWidth / 2);

            // 3. Align Vertically (Feet at Pivot)
            // We want the bottom of the image (feet) to be at (tileY + feetOffset)
            let feetOffset = tileSize * 0.25;

            // Elevation Visual (Each Z level is 10px up) + Jump Offset
            let visualZ = (this.z * 10) + this.jumpOffset;

            let dy = ((this.y - camY) * tileSize) - renderHeight + feetOffset - visualZ;

            // Damage Tint
            if (Date.now() - this.lastDamageTime < 200) {
                ctx.save();
                // Red tint filter
                ctx.filter = 'sepia(1) saturate(5) hue-rotate(-50deg)';
            }

            ctx.drawImage(
                this.image,
                sx, sy, frameW, frameH,
                dx, dy, renderWidth, renderHeight
            );

            if (Date.now() - this.lastDamageTime < 200) {
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

    if (isRunning) {
        speedLimit *= RUN_MULT;
        accel *= 1.5; // Immediate burst of speed when running
    } else if (isSneaking) {
        speedLimit *= SNEAK_MULT;
        accel *= 0.5; // Slower, more controlled movement when sneaking
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
            else if (!player.isJumping && !isJumping) canMoveX = false; // Needs jump
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
            else if (!player.isJumping && !isJumping) canMoveY = false;
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
        player.jumpVelocity = 4; // Start upward
    }

    if (player.isJumping) {
        player.jumpOffset += player.jumpVelocity;
        player.jumpVelocity -= 1; // Gravity

        if (player.jumpOffset <= 0) {
            player.jumpOffset = 0;
            player.isJumping = false;
        }
    }

    checkTileEvents(Math.floor(player.x), Math.floor(player.y));
}

function checkTileEvents(tileX, tileY) {
    let id = map[tileY][tileX];
    let block = BLOCK_DEFS[id];
    if (!block) return;

    // Clank Generation
    let currentSpeed = Math.sqrt(player.vx ** 2 + player.vy ** 2);
    if (currentSpeed > 0.05) {
        let chance = currentSpeed * 0.5;
        if (keys['shift']) chance = 0;

        if (Math.random() < chance) {
            gameState.clank++;
            updateUI(gameState, player);
        }
    }

    // Hazards/Heals
    if (block.damage && Math.random() < 0.05) {
        player.takeDamage(block.damage);
    }
    if (block.heal && player.hp < 10) {
        player.hp += block.heal;
        // Consume the berry block (change to 7: Bush)
        map[tileY][tileX] = 7;
        updateUI(gameState, player);
    }
}
