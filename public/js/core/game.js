
import { TILE_SIZE, VIEW_W, VIEW_H, SIGHT_RADIUS } from '../utils/constants.js';
import { map } from '../world/map.js';
import { BLOCK_DEFS, DEFAULT_BLOCK } from '../world/tiles.js';
import { player, updatePlayer } from '../entities/player.js';
import { Ravager } from '../entities/ravager.js';
import { Ghast } from '../entities/ghast.js';
import { Vex } from '../entities/vex.js';
import { gameState } from './state.js';
import { initInput, mouse } from './input.js';
import { playGong, speak } from './audio.js';
import { getCamera } from './camera.js'; // Restored import
import { checkLineOfSight, getFocusPoint } from '../world/lighting.js'; // Restored import

import { updateUI, showToast } from './ui.js';

// Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let enemies = [];
let projectiles = [];
let lastVexSpawnClank = 0;
const VEX_START_CLANK = 60; // Start spawning Vexes after 60 Clank
const VEX_SPAWN_INTERVAL = 10; // Then spawn a Vex every 10 Clank
let isGameRunning = false;

// Initialize Input
initInput(canvas);

// --- MAP PARSER ---
function setupLevel() {
    enemies = [];
    projectiles = [];
    gameState.clank = 0;
    lastVexSpawnClank = VEX_START_CLANK - VEX_SPAWN_INTERVAL; // Ensure correct first spawn timing

    // Scan map for Spawn Objects
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[0].length; x++) {
            let cell = map[y][x];

            // Check if cell is an object (contains metadata)
            if (typeof cell === 'object' && cell !== null) {
                console.log("Found Spawn Object:", cell); // DEBUG LOG
                // 1. Handle Spawns
                if (cell.spawn === 'player') {
                    player.x = x + 0.5; // Center in tile
                    player.y = y + 0.5;
                } else if (cell.spawn === 'enemy' || cell.spawn === 'ravager') {
                    // Default to Ravager for generic 'enemy' spawn
                    enemies.push(new Ravager(x + 0.5, y + 0.5));
                } else if (cell.spawn === 'ghast') {
                    enemies.push(new Ghast(x + 0.5, y + 0.5));
                }

                // 2. Normalize Map
                if (cell.z !== undefined) {
                    // Preserve object for elevation
                    map[y][x] = { id: (cell.id !== undefined) ? cell.id : 0, z: cell.z };
                } else {
                    map[y][x] = (cell.id !== undefined) ? cell.id : 0;
                }
            }
        }
    }
}

// --- MAIN LOOP ---
// --- MAIN LOOP ---
function gameLoop(timestamp) {
    if (!isGameRunning) return;

    // Check Death
    if (player.hp <= 0) {
        handleGameOver();
        return;
    }

    updatePlayer();

    // Vex Spawning Logic
    if (gameState.clank >= VEX_START_CLANK) {
        if (gameState.clank >= lastVexSpawnClank + VEX_SPAWN_INTERVAL) {
            enemies.push(new Vex(player.x, player.y));
            // Ensure we don't double-spawn if Clank jumps by multiple, but align to grid
            lastVexSpawnClank = Math.floor(gameState.clank / VEX_SPAWN_INTERVAL) * VEX_SPAWN_INTERVAL;
            speak("A Vex has been summoned!");
        }
    } else {
        // Keeps 'lastVexSpawn' updated so the first spawn happens immediately at 60
        lastVexSpawnClank = VEX_START_CLANK - VEX_SPAWN_INTERVAL;
    }

    // Update Enemies
    enemies.forEach((enemy, index) => {
        enemy.update(player, map, timestamp, projectiles);
        // Simple death check (if vex)
        if (enemy.type === 'vex' && enemy.hp <= 0) {
            enemies.splice(index, 1);
        }
    });

    // Update Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        const status = p.update();
        if (status === "wall" || !p.active) {
            projectiles.splice(i, 1);
        } else if (Math.sqrt((p.x - player.x) ** 2 + (p.y - player.y) ** 2) < player.radius + p.radius) {
            // Player Hit!
            player.takeDamage(1);
            projectiles.splice(i, 1);
        }
    }

    draw();
    requestAnimationFrame(gameLoop);
}

// --- RENDER ENGINE ---
function draw() {
    // 1. Camera Logic
    const cam = getCamera(player, map);
    const camX = cam.x;
    const camY = cam.y;

    const focus = getFocusPoint(player, mouse);

    // 2. Clear
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Draw Blocks (Layer 1)
    for (let y = Math.floor(camY); y < camY + VIEW_H + 1; y++) {
        for (let x = Math.floor(camX); x < camX + VIEW_W + 1; x++) {

            if (y >= map.length || x >= map[0].length) continue;

            let distToFocus = Math.sqrt((focus.x - x) ** 2 + (focus.y - y) ** 2);
            if (distToFocus > SIGHT_RADIUS + 2) continue;
            if (!checkLineOfSight(player.x, player.y, x, y)) continue;

            let drawX = (x - camX) * TILE_SIZE;
            let drawY = (y - camY) * TILE_SIZE;

            let tile = map[y][x];
            let id = (typeof tile === 'object') ? tile.id : tile;
            let z = (typeof tile === 'object') ? (tile.z || 0) : 0;

            let block = BLOCK_DEFS[id] || DEFAULT_BLOCK;

            ctx.fillStyle = block.color;
            ctx.fillRect(drawX, drawY - (z * 10), TILE_SIZE, TILE_SIZE); // Render visual height offset

            // Side face for elevation
            if (z > 0) {
                ctx.fillStyle = "#222"; // Shadow/Side
                ctx.fillRect(drawX, drawY - (z * 10) + TILE_SIZE, TILE_SIZE, 10);
            }
        }
    }

    // 4. Draw Player (Layer 2)
    player.draw(ctx, camX, camY, TILE_SIZE);

    // 5. Draw Enemies
    enemies.forEach(enemy => enemy.draw(ctx, camX, camY));

    // 5b. Draw Projectiles
    projectiles.forEach(p => p.draw(ctx, camX, camY));

    // 6. Lighting Gradient (Layer 3)
    let lightX = (focus.x - camX) * TILE_SIZE;
    let lightY = (focus.y - camY) * TILE_SIZE;

    let gradient = ctx.createRadialGradient(
        lightX, lightY, TILE_SIZE * 1,
        lightX, lightY, TILE_SIZE * SIGHT_RADIUS
    );

    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.6, "rgba(0, 0, 0, 0.1)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 1)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// --- START / RESET GAME ---
export function initGame() {
    // Start Overlay
    const overlay = document.getElementById('start-overlay');
    overlay.addEventListener('click', startGame);

    // Game Over Overlay
    const retryOverlay = document.getElementById('game-over-overlay');
    retryOverlay.addEventListener('click', resetGame);
}

function startGame() {
    const overlay = document.getElementById('start-overlay');
    overlay.classList.add('hidden');

    console.log("Decked Out 2D is ready for its next victim!");
    resetGameLogic();
    showToast("WASD to Move, Mouse to Aim", 5000); // Tutorial
    playGong(() => {
        speak("Decked Out 2D is ready for its next victim!");
    });

    isGameRunning = true;
    requestAnimationFrame(gameLoop);
}

function handleGameOver() {
    isGameRunning = false;
    const overlay = document.getElementById('game-over-overlay');
    overlay.classList.remove('hidden');
    speak("Game Over");
}

function resetGame() {
    location.reload();
}

function resetGameLogic() {
    player.hp = 10;
    setupLevel(); // Reset map, enemies, player pos
    gameState.clank = 0;
    updateUI(gameState, player);
}
