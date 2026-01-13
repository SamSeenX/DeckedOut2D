
import { TILE_SIZE, PROJECTILE_SPEED, PROJECTILE_RADIUS } from '../data/config.js';
import { checkWallCollision } from '../utils/collision.js';

export class Projectile {
    constructor(x, y, targetX, targetY, type = 'frost_shard') {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.type = type;
        this.speed = PROJECTILE_SPEED;
        this.active = true;
        this.radius = PROJECTILE_RADIUS;

        // Calculate direction
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;

        // Calculate Rotation Angle
        this.angle = Math.atan2(dy, dx);
    }

    update() {
        if (!this.active) return;

        // Move
        this.x += this.vx;
        this.y += this.vy;

        // Check Wall Collision
        if (checkWallCollision(this.x, this.y)) {
            this.active = false;
            // TODO: Leave burn mark (callback or event?)
            return "wall";
        }

        return "flying";
    }

    draw(ctx, camX, camY) {
        if (!this.active) return;

        const drawX = (this.x - camX) * TILE_SIZE;
        const drawY = (this.y - camY) * TILE_SIZE;

        if (this.type === 'frost_shard') {
            ctx.save();
            ctx.translate(drawX, drawY);
            ctx.rotate(this.angle); // Rotate to face direction

            // Draw elongated shard
            // Main body (White/Blue Gradient)
            const mw = TILE_SIZE * 0.6; // Length
            const mh = TILE_SIZE * 0.2; // Width

            ctx.fillStyle = "#aaddff"; // Light Blue
            ctx.beginPath();
            ctx.moveTo(mw / 2, 0); // Tip
            ctx.lineTo(-mw / 2, -mh / 2); // Back Left
            ctx.lineTo(-mw / 3, 0); // Indent
            ctx.lineTo(-mw / 2, mh / 2); // Back Right
            ctx.closePath();
            ctx.fill();

            // Core (White)
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo(mw / 2, 0);
            ctx.lineTo(-mw / 2, 0);
            ctx.lineTo(-mw / 2, 0); // Back Left
            ctx.stroke(); // Thin line for sharpness
            ctx.fill();

            // Glow
            ctx.shadowColor = "#00ccff";
            ctx.shadowBlur = 10;
            ctx.fill();

            ctx.restore();
        } else {
            // Default Fireball
            ctx.fillStyle = '#ff4400';
            ctx.beginPath();
            ctx.arc(drawX, drawY, TILE_SIZE * this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
