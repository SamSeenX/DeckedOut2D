
import { Enemy } from './enemy.js';
import { TILE_SIZE } from '../utils/constants.js';
import { checkWallCollision } from '../utils/collision.js';
import { checkLineOfSight } from '../world/lighting.js';
import { BLOCK_DEFS, DEFAULT_BLOCK } from '../world/tiles.js';

const STATES = {
    IDLE: 'IDLE',
    CHASE: 'CHASE',
    SEARCHING: 'SEARCHING'
};

const VIEW_RANGE = 7;
const SEARCH_DURATION = 3000;
const IDLE_MOVE_INTERVAL = 2000;

export class Ravager extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.type = 'ravager';
        this.accel = 0.002;
        this.maxSpeed = 0.05;
        this.color = 'red';
        this.lastAttackTime = 0;
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
        let canSeePlayer = (distToPlayer < VIEW_RANGE) && checkLineOfSight(this.x, this.y, player.x, player.y);

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
                        this.targetX = this.spawnX;
                        this.targetY = this.spawnY;
                    }
                }
                break;
        }

        this.applyPhysics(map);
    }

    applyPhysics(map) {
        let dx = this.targetX - this.x;
        let dy = this.targetY - this.y;
        let dist = Math.sqrt(dx * dx + dy * dy);

        // Acceleration
        if (dist > 0.1) {
            let dirX = dx / dist;
            let dirY = dy / dist;
            let speedMult = (this.state === STATES.CHASE) ? 2.0 : 1.0;

            this.vx += dirX * this.accel * speedMult;
            this.vy += dirY * this.accel * speedMult;
        }

        // Friction
        let centerBlockId = map[Math.floor(this.y)][Math.floor(this.x)];
        let centerBlock = BLOCK_DEFS[centerBlockId] || DEFAULT_BLOCK;
        let friction = centerBlock.friction || 0.80;

        this.vx *= friction;
        this.vy *= friction;

        // Velocity Clamping
        let speed = Math.sqrt(this.vx ** 2 + this.vy ** 2);
        let actualMaxSpeed = (this.state === STATES.CHASE) ? this.maxSpeed * 1.5 : this.maxSpeed;

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
