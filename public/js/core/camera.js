import { VIEW_W, VIEW_H } from '../data/config.js';

let shakeIntensity = 0;

export function triggerShake(amount) {
    shakeIntensity = amount;
}

export function getCamera(player, map) {
    let camX = player.x - VIEW_W / 2;
    let camY = player.y - VIEW_H / 2;

    camX = Math.max(0, Math.min(camX, map[0].length - VIEW_W));
    camY = Math.max(0, Math.min(camY, map.length - VIEW_H));

    // Apply Shake (After clamping so it works at edges)
    if (shakeIntensity > 0) {
        camX += (Math.random() - 0.5) * shakeIntensity;
        camY += (Math.random() - 0.5) * shakeIntensity;
        shakeIntensity *= 0.9; // Decay
        if (shakeIntensity < 0.01) shakeIntensity = 0;
    }

    return { x: camX, y: camY };
}
