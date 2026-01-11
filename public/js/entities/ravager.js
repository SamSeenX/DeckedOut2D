import { Enemy } from './enemy.js';
import { TILE_SIZE, RAVAGER_SPEED, RAVAGER_ACCEL, RAVAGER_CHASE_SPEED_MULT, RAVAGER_DETECTION_RANGE, RAVAGER_IDLE_FPS, RAVAGER_CHASE_FPS } from '../data/config.js';
import { checkWallCollision } from '../utils/collision.js';
import { checkLineOfSight } from '../world/lighting.js';
import { BLOCK_DEFS, DEFAULT_BLOCK } from '../world/tiles.js';

const RAVAGER_SPRITE_SRC = 'assets/sprits/ravager.webp';
const SPRITE_IMAGE = new Image();
SPRITE_IMAGE.src = RAVAGER_SPRITE_SRC;

const ANIMATIONS = {
    walk_down: {
        rows: [0], // "Row 1"
        frames: 6,
        width: 128,
        height: 212,
        scaleW: 1.0 * 1.2, // Width Multiplier of TILE_SIZE
        scaleH: 1.5 * 1.2, // Height Multiplier of TILE_SIZE
    },
    walk_up: {
        rows: [1], // "Row 2"
        frames: 6,
        width: 128,
        height: 212,
        scaleW: 1.0 * 1.4,
        scaleH: 1.5 * 1.4,
    },
    walk_right: {
        rows: [2, 3], // "Next two rows"
        frames: 6,
        width: 256,
        height: 212,
        framesPerRow: 3,
        scaleW: 2.0 * 1,
        scaleH: 1.65 * 1, // 2.0 * (212/256) ≈ 1.65
    }
};

const STATES = {
    IDLE: 'IDLE',
    CHASE: 'CHASE',
    SEARCHING: 'SEARCHING'
};

const DETECTION_RANGE = RAVAGER_DETECTION_RANGE;
const SEARCH_DURATION = 3000;
const IDLE_MOVE_INTERVAL = 2000;

export class Ravager extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.type = 'ravager';
        this.accel = RAVAGER_ACCEL;
        this.maxSpeed = RAVAGER_SPEED;

        // Ensure color is set, though we will use sprite
        this.color = 'red';
        this.lastAttackTime = 0;

        // Animation State
        this.sprite = SPRITE_IMAGE;
        this.animations = ANIMATIONS;
        this.anim = 'walk_down';
        this.frame = 0;
        this.animTimer = 0;
        this.facing = 1; // 1 = Right, -1 = Left
    }

    update(player, map, timeNow) {
        // Distance to Player
        let distToPlayer = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);

        // Attack Logic: Melee Range
        if (distToPlayer < 0.8 && timeNow - this.lastAttackTime > 1000) {
            player.takeDamage(2);
            this.lastAttackTime = timeNow;
            // console.log("Ravager Chomp! HP:", player.hp);
        }

        // Visibility
        let canSeePlayer = (distToPlayer < DETECTION_RANGE) && checkLineOfSight(this.x, this.y, player.x, player.y);

        // --- STATE MACHINE ---
        switch (this.state) {
            case STATES.IDLE:
                if (canSeePlayer) {
                    this.state = STATES.CHASE;
                    this.color = '#ff0000';
                } else if (timeNow - this.lastMoveTime > IDLE_MOVE_INTERVAL) {
                    let angle = Math.random() * Math.PI * 2;
                    let dist = Math.random() * 3;
                    this.targetX = this.spawnX + Math.cos(angle) * dist;
                    this.targetY = this.spawnY + Math.sin(angle) * dist;
                    this.lastMoveTime = timeNow;
                }
                break;

            case STATES.CHASE:
                if (canSeePlayer) {
                    this.targetX = player.x;
                    this.targetY = player.y;
                    this.lastSeenPlayerPos = { x: player.x, y: player.y };
                } else {
                    this.state = STATES.SEARCHING;
                    this.stateTimer = timeNow;
                    this.color = '#aa0000';
                    this.targetX = this.lastSeenPlayerPos.x;
                    this.targetY = this.lastSeenPlayerPos.y;
                }
                break;

            case STATES.SEARCHING:
                if (canSeePlayer) {
                    this.state = STATES.CHASE;
                    this.color = '#ff0000';
                } else {
                    let distToTarget = Math.sqrt((this.targetX - this.x) ** 2 + (this.targetY - this.y) ** 2);
                    if (distToTarget < 0.5) {
                        if (timeNow - this.lastMoveTime > 500) {
                            let angle = Math.random() * Math.PI * 2;
                            let dist = 2;
                            this.targetX = this.x + Math.cos(angle) * dist;
                            this.targetY = this.y + Math.sin(angle) * dist;
                            this.lastMoveTime = timeNow;
                        }
                    }

                    if (timeNow - this.stateTimer > SEARCH_DURATION) {
                        this.state = STATES.IDLE;
                        this.color = 'red';
                        // Roam around CURRENT location instead of returning to spawn
                        this.spawnX = this.x;
                        this.spawnY = this.y;
                        this.targetX = this.x;
                        this.targetY = this.y;
                    }
                }
                break;
        }

        this.applyPhysics(map);
        this.updateAnimation(timeNow);
    }

    updateAnimation(timeNow) {
        // Determine Direction
        if (Math.abs(this.vx) > Math.abs(this.vy)) {
            if (Math.abs(this.vx) > 0.001) {
                this.anim = 'walk_right';
                // Facing Logic for standard draw
                this.facing = (this.vx > 0) ? 1 : -1;
            }
        } else {
            if (Math.abs(this.vy) > 0.001) {
                this.anim = (this.vy > 0) ? 'walk_down' : 'walk_up';
            }
        }

        // Determine FPS based on state
        const targetFPS = (this.state === STATES.CHASE) ? RAVAGER_CHASE_FPS : RAVAGER_IDLE_FPS;
        const frameTime = 1000 / targetFPS;

        // Cycle Frames
        if (timeNow - this.animTimer > frameTime) {
            this.frame++;
            const currentAnimData = ANIMATIONS[this.anim];
            if (this.frame >= currentAnimData.frames) {
                this.frame = 0;
            }
            this.animTimer = timeNow;
        }
    }

    // Removed draw() override to use base class standard


    applyPhysics(map) {
        let dx = this.targetX - this.x;
        let dy = this.targetY - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        // Acceleration
        if (dist > 0.1) {
            let dirX = dx / dist;
            let dirY = dy / dist;
            let speedMult = (this.state === STATES.CHASE) ? RAVAGER_CHASE_SPEED_MULT : 1.0;

            this.vx += dirX * this.accel * speedMult;
            this.vy += dirY * this.accel * speedMult;
        }

        // Friction
        let centerBlockId = map[Math.floor(this.y)][Math.floor(this.x)];
        let centerBlock = BLOCK_DEFS[centerBlockId] || DEFAULT_BLOCK;
        // Use slideFactor for consistent physics, consistent with player
        let slideFactor = centerBlock.slideFactor || 0.80;

        this.vx *= slideFactor;
        this.vy *= slideFactor;

        // Velocity Clamping
        let speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
        let actualMaxSpeed = (this.state === STATES.CHASE) ? this.maxSpeed * RAVAGER_CHASE_SPEED_MULT : this.maxSpeed;

        if (speed > actualMaxSpeed) {
            let ratio = actualMaxSpeed / speed;
            this.vx *= ratio;
            this.vy *= ratio;
        }

        // Collision & Movement
        if (!checkWallCollision(this.x + this.vx, this.y)) {
            this.x += this.vx;
        } else {
            this.vx = 0;
        }
        if (!checkWallCollision(this.x, this.y + this.vy)) {
            this.y += this.vy;
        } else {
            this.vy = 0;
        }
    }
}
