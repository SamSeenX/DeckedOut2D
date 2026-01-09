import { VIEW_W, VIEW_H } from '../utils/constants.js';

export function getCamera(player, map) {
    let camX = player.x - VIEW_W / 2;
    let camY = player.y - VIEW_H / 2;
    camX = Math.max(0, Math.min(camX, map[0].length - VIEW_W));
    camY = Math.max(0, Math.min(camY, map.length - VIEW_H));
    return { x: camX, y: camY };
}
