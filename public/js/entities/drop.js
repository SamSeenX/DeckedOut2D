import { PLAYER_RADIUS } from '../data/config.js';

export class Drop {
    constructor(x, y, lifespan = 30000) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.creationTime = Date.now();
        this.lifespan = lifespan;
        this.collected = false;

        // Visuals
        this.bobOffset = 0;
        this.bobSpeed = 200; // Slower divisor = faster bob
        this.bobHeight = 0.1;
    }

    update(player) {
        if (this.collected) return false;

        // Bobbing animation
        this.bobOffset = Math.sin((Date.now() - this.creationTime) / this.bobSpeed) * this.bobHeight;

        // Check Lifespan
        if (Date.now() - this.creationTime > this.lifespan) {
            this.collected = true; // Despawn
            return false;
        }

        // Check collision with player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Standard pickup radius (Player Radius + Item Size approx)
        if (dist < PLAYER_RADIUS + 0.3) {
            this.collected = true;
            return true; // Picked up
        }

        return false;
    }

    draw(ctx, camX, camY, tileSize) {
        // Override in subclass
    }
}
