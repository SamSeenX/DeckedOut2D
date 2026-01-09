
import { TILE_SIZE, PLAYER_RADIUS } from '../utils/constants.js';
import { checkWallCollision } from '../utils/collision.js';
import { checkLineOfSight } from '../world/lighting.js';

// Constants for AI
const STATES = {
    IDLE: 'IDLE',
    CHASE: 'CHASE',
    SEARCHING: 'SEARCHING'
};

const VIEW_RANGE = 7;
const LOSE_SIGHT_RANGE = 10;
const SEARCH_DURATION = 3000; // ms
const IDLE_MOVE_INTERVAL = 2000; // ms

export class Enemy {
    constructor(x, y) {
        this.type = 'base';
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.spawnX = x;
        this.spawnY = y;

        this.radius = PLAYER_RADIUS;
        this.color = 'white';

        // State
        this.state = STATES.IDLE;
        this.targetX = x;
        this.targetY = y;
        this.lastSeenPlayerPos = { x: 0, y: 0 };
        this.stateTimer = 0;
        this.lastMoveTime = 0;
    }

    update(player, map, timeNow) {
        // Override in subclasses
    }

    draw(ctx, camX, camY) {
        let drawX = (this.x - camX) * TILE_SIZE;
        let drawY = (this.y - camY) * TILE_SIZE;

        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(drawX, drawY, TILE_SIZE * this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}
