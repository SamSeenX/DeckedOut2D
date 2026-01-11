import { PLAYER_RADIUS, EMBER_LIFESPAN } from '../data/config.js';

export class Ember {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.z = 0; // Ground level by default, but could check map
        this.creationTime = Date.now();
        this.lifespan = EMBER_LIFESPAN; // 45 seconds
        this.collected = false;

        // Animation
        this.bobOffset = 0;
    }

    update(player, mapZ) {
        if (this.collected) return;

        // Bobbing animation
        this.bobOffset = Math.sin((Date.now() - this.creationTime) / 200) * 0.1;

        // Check collision with player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < PLAYER_RADIUS + 0.3) {
            this.collected = true;
            return true; // Return true to signal collection
        }

        // Check lifespan
        if (Date.now() - this.creationTime > this.lifespan) {
            this.collected = true; // Despawn
            return false; // Despawn without collection
        }

        return false;
    }

    draw(ctx, camX, camY, tileSize) {
        if (this.collected) return;

        const drawX = (this.x - camX) * tileSize;
        const drawY = (this.y - camY) * tileSize + (this.bobOffset * tileSize);

        // Simple Ember Visual (Glowing Orb)
        ctx.fillStyle = "#ffaa00";
        ctx.beginPath();
        ctx.arc(drawX, drawY, tileSize * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = "#ff4400";
        ctx.shadowBlur = 10;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset
    }
}
