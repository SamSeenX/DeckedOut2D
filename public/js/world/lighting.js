import { map } from './map.js';
import { BLOCK_DEFS } from './tiles.js';
import { MAX_LOOK_OFFSET } from '../utils/constants.js';

// Internal Helper: Raycast using DDA Algorithm (Perfect Grid Traversal)
export function castRay(x0, y0, x1, y1) {
    let dx = x1 - x0;
    let dy = y1 - y0;

    // Safety: If start and end are basically the same, it's visible
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return true;

    // Current Map Position
    let mapX = Math.floor(x0);
    let mapY = Math.floor(y0);

    // Target Map Position
    let targetX = Math.floor(x1);
    let targetY = Math.floor(y1);

    // Direction Steps
    let stepX = (dx < 0) ? -1 : 1;
    let stepY = (dy < 0) ? -1 : 1;

    // Calculate distance to next gridline
    let deltaDistX = (dx === 0) ? 1e30 : Math.abs(1 / dx);
    let deltaDistY = (dy === 0) ? 1e30 : Math.abs(1 / dy);

    // Calculate initial sideDist
    let sideDistX, sideDistY;

    // Note: We normalize the sideDist relative to the ray length math
    let rayDirX = dx;
    let rayDirY = dy;

    // Calculate scaling factor to normalize ray length to 1.0 for precise delta
    let rayLen = Math.sqrt(dx * dx + dy * dy);
    deltaDistX = (rayDirX === 0) ? 1e30 : Math.abs(rayLen / rayDirX);
    deltaDistY = (rayDirY === 0) ? 1e30 : Math.abs(rayLen / rayDirY);

    if (rayDirX < 0) {
        sideDistX = (x0 - mapX) * deltaDistX;
    } else {
        sideDistX = (mapX + 1.0 - x0) * deltaDistX;
    }
    if (rayDirY < 0) {
        sideDistY = (y0 - mapY) * deltaDistY;
    } else {
        sideDistY = (mapY + 1.0 - y0) * deltaDistY;
    }

    // --- THE DDA LOOP ---
    // Walk through the grid 1 square at a time until we hit the target or a wall
    // Max iterations to prevent freezing (just in case)
    let loops = 0;
    while ((mapX !== targetX || mapY !== targetY) && loops < 100) {
        // Jump to next map square, OR in x-direction, OR in y-direction
        if (sideDistX < sideDistY) {
            sideDistX += deltaDistX;
            mapX += stepX;
        } else {
            sideDistY += deltaDistY;
            mapY += stepY;
        }

        // Bounds Check
        if (mapY < 0 || mapY >= map.length || mapX < 0 || mapX >= map[0].length) return false;

        // Wall Check
        if (mapX !== targetX || mapY !== targetY) {
            let id = map[mapY][mapX];
            let block = BLOCK_DEFS[id];
            if (block && block.solid) return false; // Blocked!
        }
        loops++;
    }

    return true; // Reached target without hitting a wall
}

// Helper: Line of Sight (Robust)
export function checkLineOfSight(x0, y0, x1, y1) {
    // 1. Check Center first (Fastest check)
    if (castRay(x0, y0, x1 + 0.5, y1 + 0.5)) return true;

    // 2. If center blocked, check the 4 corners of the TARGET tile.
    if (castRay(x0, y0, x1 + 0.05, y1 + 0.05)) return true;
    if (castRay(x0, y0, x1 + 0.95, y1 + 0.05)) return true;
    if (castRay(x0, y0, x1 + 0.05, y1 + 0.95)) return true;
    if (castRay(x0, y0, x1 + 0.95, y1 + 0.95)) return true;

    return false;
}

// Helper: Clamped Flashlight
export function getFocusPoint(player, mouse) {
    let targetDX = mouse.x * 10;
    let targetDY = mouse.y * 10;
    let dist = Math.sqrt(targetDX * targetDX + targetDY * targetDY);
    let currentShift = Math.min(dist, MAX_LOOK_OFFSET);
    let angle = Math.atan2(targetDY, targetDX);

    return {
        x: player.x + Math.cos(angle) * currentShift,
        y: player.y + Math.sin(angle) * currentShift
    };
}
