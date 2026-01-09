
import { Enemy } from './enemy.js';
import { checkLineOfSight } from '../world/lighting.js';

const STATES = {
    ORBIT: 'ORBIT',
    SWOOP: 'SWOOP',
    RECOVER: 'RECOVER'
};

const ORBIT_DIST = 2.5;
const ORBIT_SPEED = 0.02; // Angular speed
const SWOOP_SPEED = 0.12;
const SWOOP_COOLDOWN = 3000;

export class Vex extends Enemy {
    constructor(playerX, playerY) {
        // Spawn near player
        let angle = Math.random() * Math.PI * 2;
        let dist = 4;
        super(playerX + Math.cos(angle) * dist, playerY + Math.sin(angle) * dist);

        this.type = 'vex';
        this.radius = 0.2; // Small
        this.color = '#aaddff'; // Light blue

        this.hp = 5;
        this.state = STATES.ORBIT;
        this.orbitAngle = angle;
        this.lastSwoopTime = 0;

        this.swoopTarget = { x: 0, y: 0 };
    }

    update(player, map, timeNow) {
        switch (this.state) {
            case STATES.ORBIT:
                this.orbitAngle += ORBIT_SPEED;

                // Calculate desired orbit position
                let targetX = player.x + Math.cos(this.orbitAngle) * ORBIT_DIST;
                let targetY = player.y + Math.sin(this.orbitAngle) * ORBIT_DIST;

                // Smoothly move there (Fly)
                this.x += (targetX - this.x) * 0.05;
                this.y += (targetY - this.y) * 0.05;

                // Check for swoop
                if (timeNow - this.lastSwoopTime > SWOOP_COOLDOWN) {
                    this.state = STATES.SWOOP;
                    this.swoopTarget = { x: player.x, y: player.y };
                    this.lastSwoopTime = timeNow;
                    this.color = '#fff'; // Bright flash
                }
                break;

            case STATES.SWOOP:
                // Fly fast towards target
                let dx = this.swoopTarget.x - this.x;
                let dy = this.swoopTarget.y - this.y;
                let distToTarget = Math.sqrt(dx * dx + dy * dy);

                // Move
                if (distToTarget > 0.2) {
                    this.x += (dx / distToTarget) * SWOOP_SPEED;
                    this.y += (dy / distToTarget) * SWOOP_SPEED;
                }

                // Check Player Collision (Continuous)
                let distToPlayer = Math.sqrt((player.x - this.x) ** 2 + (player.y - this.y) ** 2);
                if (distToPlayer < this.radius + 0.3) { // 0.2 + 0.3 = 0.5 contact
                    // Hit!
                    player.takeDamage(1);
                    this.hp -= 1;
                    this.state = STATES.RECOVER;
                    this.lastSwoopTime = timeNow;
                    return; // Done
                }

                // Check if we reached target (Missed player)
                if (distToTarget <= 0.2) {
                    this.hp -= 1; // Vex takes damage from effort
                    this.state = STATES.RECOVER;
                    this.lastSwoopTime = timeNow;
                }
                break;

            case STATES.RECOVER:
                // Pause briefly before orbiting again
                if (timeNow - this.lastSwoopTime > 1000) {
                    this.state = STATES.ORBIT;
                    this.color = '#aaddff';
                }
                break;
        }
    }
}
