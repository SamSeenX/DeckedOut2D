import { Enemy } from './enemy.js';
import { Projectile } from './projectile.js';
import { checkLineOfSight } from '../world/lighting.js';
import { checkWallCollision } from '../utils/collision.js';
import { GHAST_SPEED, GHAST_DETECTION_RANGE, GHAST_ATTACK_COOLDOWN } from '../data/config.js';

const STATES = {
    IDLE: 'IDLE',
    ATTACK: 'ATTACK'
};

const DETECTION_RANGE = GHAST_DETECTION_RANGE;
const ATTACK_COOLDOWN = GHAST_ATTACK_COOLDOWN;
const FLOAT_SPEED = GHAST_SPEED;

const GHAST_SPRITE_SRC = 'assets/sprits/gast.webp';
const SPRITE_IMAGE = new Image();
SPRITE_IMAGE.src = GHAST_SPRITE_SRC;

const ANIMAGES_FPS = 4;
const ANIM_FRAME_TIME = 1000 / ANIMAGES_FPS;

const ANIMATIONS = {
    walk_down: {
        rows: [0],
        frames: 4,
        width: 128,
        height: 128,
        scaleW: 1.5,
        scaleH: 1.5
    },
    walk_up: {
        rows: [1],
        frames: 4,
        width: 128,
        height: 128,
        scaleW: 1.5,
        scaleH: 1.5
    },
    walk_right: {
        rows: [2],
        frames: 4,
        width: 128,
        height: 128,
        scaleW: 1.5,
        scaleH: 1.5
    }
};

export class Ghast extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.type = 'ghast';
        this.radius = 0.4;
        this.color = 'yellow'; // Fallback

        // Sprite System
        this.sprite = SPRITE_IMAGE;
        this.animations = ANIMATIONS;
        this.anim = 'walk_down'; // Default idle
        this.frame = 0;
        this.animTimer = 0;
        this.facing = 1;

        this.lastAttackTime = 0;
        this.hoverOffset = 0;

        // Roaming
        this.lastRoamChange = 0;
        this.targetX = x;
        this.targetY = y;
    }

    update(player, map, timeNow, activeProjectiles) {
        this.hoverOffset += 0.05;
        // Floating effect
        const bob = Math.sin(this.hoverOffset) * 0.002;
        this.y += bob;

        let distToPlayer = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
        let canSee = (distToPlayer < DETECTION_RANGE) && checkLineOfSight(this.x, this.y, player.x, player.y);

        if (canSee) {
            // Maintain optimal distance (Range 4-6)
            let idealDist = 5;
            let moveSpeed = FLOAT_SPEED;

            let dx = player.x - this.x;
            let dy = player.y - this.y;

            // Determine Animation & Facing
            if (Math.abs(dx) > Math.abs(dy)) {
                // Moving Horizontally (relative to player)
                this.anim = 'walk_right';
                this.facing = (dx > 0) ? 1 : -1;
            } else {
                // Moving Vertically
                this.anim = (dy > 0) ? 'walk_down' : 'walk_up';
                this.facing = 1; // Reset facing for non-side anims
            }

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
            }

        } else {
            // Free Roaming Logic
            if (timeNow - this.lastRoamChange > 2000 + Math.random() * 2000) {
                // Pick new random target nearby (1-3 blocks)
                let angle = Math.random() * Math.PI * 2;
                let dist = 1 + Math.random() * 2;
                this.targetX = this.x + Math.cos(angle) * dist;
                this.targetY = this.y + Math.sin(angle) * dist;
                this.lastRoamChange = timeNow;
            }

            // Move towards target
            let dx = this.targetX - this.x;
            let dy = this.targetY - this.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 0.1) {
                let roamSpeed = FLOAT_SPEED * 0.5; // Move slower when roaming
                let dirX = dx / dist;
                let dirY = dy / dist;

                let nextX = this.x + dirX * roamSpeed;
                let nextY = this.y + dirY * roamSpeed;

                // Update Animation
                if (Math.abs(dx) > Math.abs(dy)) {
                    this.anim = 'walk_right';
                    this.facing = (dx > 0) ? 1 : -1;
                } else {
                    this.anim = (dy > 0) ? 'walk_down' : 'walk_up';
                    this.facing = 1;
                }

                if (!checkWallCollision(nextX, this.y)) this.x = nextX;
                if (!checkWallCollision(this.x, nextY)) this.y = nextY;
            }
        }

        this.updateAnimation(timeNow);
    }

    updateAnimation(timeNow) {
        // Cycle Frames
        if (timeNow - this.animTimer > ANIM_FRAME_TIME) {
            this.frame++;
            const currentAnimData = this.animations[this.anim];
            if (currentAnimData && this.frame >= currentAnimData.frames) {
                this.frame = 0;
            }
            this.animTimer = timeNow;
        }
    }
}
