
import { TILE_SIZE, PROJECTILE_SPEED, PROJECTILE_RADIUS } from '../data/config.js';
import { checkWallCollision } from '../utils/collision.js';

export class Projectile {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.speed = PROJECTILE_SPEED;
        this.active = true;
        this.radius = PROJECTILE_RADIUS;

        // Calculate direction
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
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

        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(drawX, drawY, TILE_SIZE * this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
