import { map } from '../data/map.js';
import { BLOCK_DEFS, DEFAULT_BLOCK } from '../world/tiles.js';
import { PLAYER_RADIUS } from '../data/config.js';

export function checkWallCollision(targetX, targetY, radius = PLAYER_RADIUS) {
    const corners = [
        { x: targetX - radius, y: targetY - radius },
        { x: targetX + radius, y: targetY - radius },
        { x: targetX - radius, y: targetY + radius },
        { x: targetX + radius, y: targetY + radius }
    ];

    for (let point of corners) {
        let tileX = Math.floor(point.x);
        let tileY = Math.floor(point.y);

        if (tileY < 0 || tileY >= map.length || tileX < 0 || tileX >= map[0].length) return true;

        let cell = map[tileY][tileX];
        let tileId = (typeof cell === 'object') ? (cell.id || 0) : cell;

        let block = BLOCK_DEFS[tileId] || DEFAULT_BLOCK;
        if (block.solid) return true;
    }
    return false;
}
