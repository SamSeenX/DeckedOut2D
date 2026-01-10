
import { Enemy } from './enemy.js';
import { Projectile } from './projectile.js';
import { checkLineOfSight } from '../world/lighting.js';
import { checkWallCollision } from '../utils/collision.js';
import { GHAST_SPEED, GHAST_VIEW_RANGE, GHAST_ATTACK_COOLDOWN } from '../data/constants.js';

const STATES = {
    IDLE: 'IDLE',
    ATTACK: 'ATTACK'
};

const VIEW_RANGE = GHAST_VIEW_RANGE;
const ATTACK_COOLDOWN = GHAST_ATTACK_COOLDOWN;
const FLOAT_SPEED = GHAST_SPEED;

export class Ghast extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.type = 'ghast';
        this.radius = 0.4;
        this.color = 'yellow'; // DEBUG: Yellow for visibility
        this.lastAttackTime = 0;
        this.hoverOffset = 0;
    }

    update(player, map, timeNow, activeProjectiles) {
        this.hoverOffset += 0.05;
        // Floating effect
        const bob = Math.sin(this.hoverOffset) * 0.002;
        this.y += bob;

        let distToPlayer = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
        let canSee = (distToPlayer < VIEW_RANGE) && checkLineOfSight(this.x, this.y, player.x, player.y);

        if (canSee) {
            this.color = '#fff';

            // Maintain optimal distance (Range 4-6)
            let idealDist = 5;
            let moveSpeed = FLOAT_SPEED;

            let dx = player.x - this.x;
            let dy = player.y - this.y;

            // Normalize direction
            let dirX = dx / distToPlayer;
            let dirY = dy / distToPlayer;

            // Only back away if player gets too close
            if (distToPlayer < idealDist - 1) {
                // Back Away safely
                let nextX = this.x - dirX * moveSpeed;
                let nextY = this.y - dirY * moveSpeed;

                if (!checkWallCollision(nextX, this.y)) this.x = nextX;
                if (!checkWallCollision(this.x, nextY)) this.y = nextY;
            }

            // Attack Logic
            if (timeNow - this.lastAttackTime > ATTACK_COOLDOWN) {
                activeProjectiles.push(new Projectile(this.x, this.y, player.x, player.y));
                this.lastAttackTime = timeNow;
                // Optional: Play shoot sound
            }

        } else {
            this.color = '#ddd';
            // Idle float?
        }
    }
}
