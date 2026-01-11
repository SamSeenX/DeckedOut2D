import { map } from '../data/map.js';
import { BLOCK_DEFS, DEFAULT_BLOCK } from '../world/tiles.js';
import { PLAYER_RADIUS } from '../data/config.js';

export function checkWallCollision(targetX, targetY) {
    const corners = [
        { x: targetX - PLAYER_RADIUS, y: targetY - PLAYER_RADIUS },
        { x: targetX + PLAYER_RADIUS, y: targetY - PLAYER_RADIUS },
        { x: targetX - PLAYER_RADIUS, y: targetY + PLAYER_RADIUS },
        { x: targetX + PLAYER_RADIUS, y: targetY + PLAYER_RADIUS }
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
