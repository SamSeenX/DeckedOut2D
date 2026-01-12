import { Drop } from './drop.js';
import { EMBER_LIFESPAN } from '../data/config.js';

export class Ember extends Drop {
    constructor(x, y) {
        super(x, y, EMBER_LIFESPAN);
        this.bobSpeed = 200;
        this.bobHeight = 0.1;
    }

    // Update handled by Parent Class (Drop)

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
