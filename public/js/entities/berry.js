import { Drop } from './drop.js';

// Default Berry Lifespan: 60s (longer than ember)
const BERRY_LIFESPAN = 60000;

export class Berry extends Drop {
    constructor(x, y) {
        super(x, y, BERRY_LIFESPAN);
        this.bobSpeed = 300; // Slower bob
        this.bobHeight = 0.05; // Smaller bob
    }

    // Update handled by Parent Class (Drop)

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
