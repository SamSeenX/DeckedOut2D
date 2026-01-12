import { PLAYER_RADIUS } from '../data/config.js';

export class Berry {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.z = 0;
        this.creationTime = Date.now();
        this.collected = false;

        // Animation
        this.bobOffset = 0;
    }

    update(player) {
        if (this.collected) return false;

        // Bobbing animation
        this.bobOffset = Math.sin((Date.now() - this.creationTime) / 300) * 0.05;

        // Check collision with player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < PLAYER_RADIUS + 0.2) {
            this.collected = true;
            return true; // Return true to signal collection
        }

        return false;
    }

    draw(ctx, camX, camY, tileSize) {
        if (this.collected) return;

        const drawX = (this.x - camX) * tileSize;
        const drawY = (this.y - camY) * tileSize + (this.bobOffset * tileSize);

        // Berry Visual
        ctx.fillStyle = "#e91e63"; // Pink/Berry color
        ctx.beginPath();
        ctx.arc(drawX, drawY, tileSize * 0.15, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = "#e91e63";
        ctx.shadowBlur = 5;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
}
