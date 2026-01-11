
import {
    TILE_SIZE,
    VIEW_W, VIEW_H, updateViewDimensions,
    DESKTOP_WIDTH, DESKTOP_HEIGHT, DESKTOP_VIEW_W, DESKTOP_VIEW_H,
    MOBILE_WIDTH, MOBILE_HEIGHT, MOBILE_VIEW_W, MOBILE_VIEW_H,
    FLASHLIGHT_RADIUS, DIM_VIEW_RADIUS, SHADOW_EDGE_OPACITY, SHADOW_INNER_OPACITY, EMBER_SPAWN_CHANCE, BERRY_REGROW_CHANCE, VEX_START_CLANK, VEX_SPAWN_INTERVAL, SPAWNER_ACTIVATION_RANGE, PLAYER_MAX_HP,
    CLANK_DECAY_AMOUNT, CLANK_DECAY_INTERVAL
} from '../data/config.js';

import { map } from '../data/map.js';
import { BLOCK_DEFS, DEFAULT_BLOCK, loadBlockTextures, getBlockTexture } from '../world/tiles.js';
import { player, updatePlayer } from '../entities/player.js';
import { Ravager } from '../entities/ravager.js';
import { Ghast } from '../entities/ghast.js';
import { Vex } from '../entities/vex.js';
import { Ember } from '../entities/ember.js';
import { getRandomArtifact } from '../data/artifacts.js';
import { gameState } from './state.js';

import { initInput, mouse } from './input.js';
import { initTouchControls, updateTouchVisibility } from './touch.js';
import { playGong, speak, playDing, playScaryDing, startHeartbeatSystem } from './audio.js';
import { getCamera } from './camera.js'; // Restored import
import { checkLineOfSight, getFocusPoint } from '../world/lighting.js'; // Restored import
import { updateUI, showToast } from './ui.js';

// Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false; // Pixel Art Rendering

// --- Device Detection & Config Application ---
function applyDeviceConfig() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 800;

    if (isMobile) {
        // Mobile Settings: Fullscreen Dynamic
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let viewW = Math.ceil(canvas.width / TILE_SIZE);
        let viewH = Math.ceil(canvas.height / TILE_SIZE);

        updateViewDimensions(viewW, viewH);
        console.log(`Applied Mobile Config: ${canvas.width}x${canvas.height} (View: ${viewW}x${viewH})`);
    } else {
        // Desktop Settings
        canvas.width = DESKTOP_WIDTH;
        canvas.height = DESKTOP_HEIGHT;
        updateViewDimensions(DESKTOP_VIEW_W, DESKTOP_VIEW_H);
        console.log("Applied Desktop Config: 800x600");
    }
}

function checkOrientation() {
    const warning = document.getElementById('rotate-warning');
    // Show warning only if on mobile AND in portrait mode
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 800;
    const isPortrait = window.innerHeight > window.innerWidth;

    if (isMobile && isPortrait) {
        warning.classList.remove('hidden');
        // Optional: Pause game?
    } else {
        warning.classList.add('hidden');
    }
}

applyDeviceConfig();
checkOrientation();
window.addEventListener('resize', () => {
    applyDeviceConfig(); // Update resolution if window changes
    checkOrientation();  // Check orientation
});
// ---------------------------------------------

let enemies = [];
let projectiles = [];
let embers = [];
let regrowingBushes = []; // {x, y, readyTime}
let treasureSpots = []; // [{x, y}]



let lastVexSpawnClank = 0;
let lastClankDecayTime = 0;

let isGameRunning = false;

// Initialize Input
initInput(canvas);

// --- MAP PARSER ---
function setupLevel() {
    enemies = [];
    projectiles = [];
    embers = [];
    regrowingBushes = [];
    treasureSpots = [];
    gameState.clank = 0;
    lastClankDecayTime = 0;


    gameState.hasArtifact = false;
    gameState.gameWon = false;

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
                // We must preserve 'variant' and 'z' if they exist.
                // If it has important metadata (z, variant), keep it as an object.
                // Otherwise, we can simplify it to a number IF we want to optimization, 
                // BUT current logic suggests we should just keep the object structure if it was already an object to be safe.

                // Construct the normalized cell
                let newCell = { id: (cell.id !== undefined) ? cell.id : 0 };
                if (cell.z !== undefined) newCell.z = cell.z;
                if (cell.variant !== undefined) newCell.variant = cell.variant;

                // If the only thing is ID, revert to number (optional optimization, matches previous logic style)
                if (newCell.z === undefined && newCell.variant === undefined) {
                    map[y][x] = newCell.id;
                } else {
                    map[y][x] = newCell;
                }
            }
            // Preserve Attributes if switching to object
            if (cell.isArtifactSpot || cell.isTreasure || cell.isExit) {
                if (typeof map[y][x] !== 'object') {
                    map[y][x] = { id: map[y][x] };
                }
                if (cell.isArtifactSpot) map[y][x].isArtifactSpot = true;
                if (cell.isTreasure) {
                    map[y][x].isTreasure = true;
                    treasureSpots.push({ x: x + 0.5, y: y + 0.5 });
                }
                if (cell.isExit) map[y][x].isExit = true;
            }

            // 3. Register Pre-Place Bushes
            // If the map starts with ID 7 (Empty Bush), add it to regrowth queue
            let blockId = (typeof map[y][x] === 'object') ? (map[y][x].id || 0) : map[y][x];
            if (blockId === 7) {
                regrowingBushes.push({ x, y });
            }
        }
    }

    // 2. Select Random Artifact Location
    let artifactSpots = [];
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[0].length; x++) {
            let cell = map[y][x];
            if ((typeof cell === 'object') && cell.isArtifactSpot) {
                artifactSpots.push({ x, y });
            }
        }
    }

    if (artifactSpots.length > 0) {
        let spot = artifactSpots[Math.floor(Math.random() * artifactSpots.length)];
        gameState.targetArtifactLoc = spot;
        gameState.targetArtifactItem = getRandomArtifact();
        console.log("Target Artifact at:", spot); // Debug
    } else {
        console.warn("No Artifact Spots found on map!");
    }
}

// --- MAIN LOOP ---
// --- MAIN LOOP ---
function gameLoop(timestamp) {
    if (!isGameRunning) return;

    // Check Death
    // Check Death
    if (player.hp <= 0) {
        handleGameOver();
        return;
    }

    // Check Victory (Pause Game)
    if (gameState.gameWon) {
        return;
    }

    // Clank Decay Logic
    if (timestamp - lastClankDecayTime > CLANK_DECAY_INTERVAL) {
        if (gameState.clank > 0) {
            gameState.clank = Math.max(0, gameState.clank - CLANK_DECAY_AMOUNT);
            updateUI(gameState, player);
            // Optional: Toast "Clank reduced..."? No, keep it subtle.
        }
        lastClankDecayTime = timestamp;
    }

    updatePlayer();

    // Vex Spawning Logic
    if (gameState.clank >= VEX_START_CLANK) {
        if (gameState.clank >= lastVexSpawnClank + VEX_SPAWN_INTERVAL) {
            enemies.push(new Vex(player.x, player.y));
            // Ensure we don't double-spawn if Clank jumps by multiple, but align to grid
            lastVexSpawnClank = Math.floor(gameState.clank / VEX_SPAWN_INTERVAL) * VEX_SPAWN_INTERVAL;
            playScaryDing();
            showToast("A Vex has been summoned!", 2000); // Visual feedback since voice is gone
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

    // Update Embers
    for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        const wasCollected = e.update(player, 0);

        if (e.collected) {
            if (wasCollected) {
                gameState.embers++;
                gameState.embersCollected++;
                updateUI(gameState, player);
                // Sound effect here?
            }
            embers.splice(i, 1);
        }
    }

    // Regrow Bushes (Proximity Based)
    for (let i = regrowingBushes.length - 1; i >= 0; i--) {
        const b = regrowingBushes[i];

        // Check Distance (10 blocks)
        const dist = Math.sqrt((player.x - b.x) ** 2 + (player.y - b.y) ** 2);

        if (dist <= SPAWNER_ACTIVATION_RANGE) {
            // Random Chance (from constants)
            if (Math.random() < BERRY_REGROW_CHANCE) {
                // Restore to Berry Bush (ID 8)
                if (typeof map[b.y][b.x] === 'object') {
                    map[b.y][b.x].id = 8;
                } else {
                    map[b.y][b.x] = 8;
                }
                regrowingBushes.splice(i, 1);
                // Optional: Particle effect or sound?
            }
        }
    }

    updateSpawners();

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

    // 3. First pass: Determine which tiles are "lit" (in flashlight)
    let litTiles = new Set();

    for (let y = Math.floor(camY); y < camY + VIEW_H + 1; y++) {
        for (let x = Math.floor(camX); x < camX + VIEW_W + 1; x++) {
            if (y >= map.length || x >= map[0].length || y < 0 || x < 0) continue;

            let distToFocus = Math.sqrt((focus.x - x) ** 2 + (focus.y - y) ** 2);
            let isFlashlight = (distToFocus <= FLASHLIGHT_RADIUS) && checkLineOfSight(player.x, player.y, x, y);

            if (isFlashlight) {
                litTiles.add(`${x},${y}`);
            }
        }
    }

    // Helper: Check if a tile has an adjacent lit tile
    function hasAdjacentLitTile(x, y) {
        const neighbors = [
            `${x - 1},${y}`, `${x + 1},${y}`,
            `${x},${y - 1}`, `${x},${y + 1}`
        ];
        for (let n of neighbors) {
            if (litTiles.has(n)) return true;
        }
        return false;
    }

    // 4. Draw Blocks (Layer 1)
    for (let y = Math.floor(camY); y < camY + VIEW_H + 1; y++) {
        for (let x = Math.floor(camX); x < camX + VIEW_W + 1; x++) {

            if (y >= map.length || x >= map[0].length || y < 0 || x < 0) continue;

            let distToPlayer = Math.sqrt((player.x - x) ** 2 + (player.y - y) ** 2);
            let isLit = litTiles.has(`${x},${y}`);
            let isDim = distToPlayer <= DIM_VIEW_RADIUS;

            if (!isLit && !isDim) continue;

            // Set Brightness based on visibility
            if (isLit) {
                ctx.globalAlpha = 1.0;
            } else {
                // Shadow tile - check if adjacent to lit tile
                if (hasAdjacentLitTile(x, y)) {
                    ctx.globalAlpha = SHADOW_EDGE_OPACITY;  // Edge tile (60%)
                } else {
                    ctx.globalAlpha = SHADOW_INNER_OPACITY; // Inner tile (30%)
                }
            }

            let drawX = (x - camX) * TILE_SIZE;
            let drawY = (y - camY) * TILE_SIZE;

            let tile = map[y][x];
            let id = (typeof tile === 'object') ? tile.id : tile;
            let z = (typeof tile === 'object') ? (tile.z || 0) : 0;
            let variant = (typeof tile === 'object') ? (tile.variant || 1) : 1;

            let block = BLOCK_DEFS[id] || DEFAULT_BLOCK;
            let texture = getBlockTexture(id, variant);

            if (texture) {
                // Draw Texture from Sprite Sheet
                ctx.drawImage(
                    texture.image,
                    texture.sx, texture.sy, texture.sw, texture.sh,
                    drawX, drawY - (z * 10), TILE_SIZE, TILE_SIZE
                );
            } else {
                // Fallback Color
                ctx.fillStyle = block.color;
                ctx.fillRect(drawX, drawY - (z * 10), TILE_SIZE, TILE_SIZE);
            }

            // Side face for elevation
            if (z > 0) {
                ctx.fillStyle = "#222"; // Shadow/Side
                ctx.fillRect(drawX, drawY - (z * 10) + TILE_SIZE, TILE_SIZE, 10);
            }

            // Draw Exit Label
            if (typeof tile === 'object' && tile.isExit) {
                ctx.fillStyle = "#00FF00";
                ctx.font = "10px monospace";
                ctx.textAlign = "center";
                ctx.fillText("EXIT", drawX + TILE_SIZE / 2, drawY - (z * 10) + TILE_SIZE / 1.5);
            }
        }
    }

    ctx.globalAlpha = 1.0;

    // 5. Draw Player (Layer 2)
    player.draw(ctx, camX, camY, TILE_SIZE);

    // 6. Draw Enemies - Only if in line of sight AND within range
    enemies.forEach(enemy => {
        const dist = Math.sqrt((player.x - enemy.x) ** 2 + (player.y - enemy.y) ** 2);
        if (dist <= DIM_VIEW_RADIUS && checkLineOfSight(player.x, player.y, enemy.x, enemy.y)) {
            enemy.draw(ctx, camX, camY);
        }
    });

    // 6b. Draw Projectiles - Only if in line of sight
    projectiles.forEach(p => {
        if (checkLineOfSight(player.x, player.y, p.x, p.y)) {
            p.draw(ctx, camX, camY);
        }
    });

    // 6c. Draw Embers - Only if in line of sight
    embers.forEach(e => {
        if (checkLineOfSight(player.x, player.y, e.x, e.y)) {
            e.draw(ctx, camX, camY, TILE_SIZE);
        }
    });

    // 7. Damage Flash Overlay
    if (Date.now() - player.lastDamageTime < 200) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 8. Lighting Gradient (Layer 3) - Subtle atmosphere
    let lightX = (focus.x - camX) * TILE_SIZE;
    let lightY = (focus.y - camY) * TILE_SIZE;

    let gradient = ctx.createRadialGradient(
        lightX, lightY, TILE_SIZE * 1,
        lightX, lightY, TILE_SIZE * FLASHLIGHT_RADIUS
    );

    gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
    gradient.addColorStop(0.8, "rgba(0, 0, 0, 0.2)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 9. DEBUG OVERLAY
    if (window.debugMode) {
        ctx.lineWidth = 2;

        // Enemies (Pink)
        ctx.strokeStyle = "hotpink";
        enemies.forEach(e => {
            let drawX = (e.x - camX) * TILE_SIZE;
            let drawY = (e.y - camY) * TILE_SIZE;
            ctx.strokeRect(drawX, drawY, TILE_SIZE, TILE_SIZE);
        });

        // Artifact Target (Red)
        if (gameState.targetArtifactLoc) {
            ctx.strokeStyle = "red";
            let tx = (gameState.targetArtifactLoc.x - camX) * TILE_SIZE;
            let ty = (gameState.targetArtifactLoc.y - camY) * TILE_SIZE;
            ctx.strokeRect(tx, ty, TILE_SIZE, TILE_SIZE);
        }

        // Ember Spawn Locations (Yellow)
        ctx.strokeStyle = "yellow";
        treasureSpots.forEach(spot => {
            let sx = (spot.x - 0.5 - camX) * TILE_SIZE;
            let sy = (spot.y - 0.5 - camY) * TILE_SIZE;
            ctx.strokeRect(sx, sy, TILE_SIZE, TILE_SIZE);
        });
    }
}

// --- START / RESET GAME ---
export function initGame() {
    loadBlockTextures(() => {
        console.log('Textures Loaded');
    });

    initTouchControls(); // Initialize Touch

    // Start Overlay
    const overlay = document.getElementById('start-overlay');
    overlay.addEventListener('click', startGame);

    // Game Over Overlay
    const retryOverlay = document.getElementById('game-over-overlay');
    retryOverlay.addEventListener('click', resetGame);
}

function startGame() {
    const overlay = document.getElementById('start-overlay');
    overlay.classList.add('hidden'); // Hide Menu immediately

    // Start Cinematic Sequence instead of immediate game loop
    playIntroSequence();

    // Trigger Fullscreen
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => console.log('Fullscreen failed:', e));
    } else if (document.documentElement.webkitRequestFullscreen) { /* Safari */
        document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) { /* IE11 */
        document.documentElement.msRequestFullscreen();
    }
}

function launchGame() {
    console.log("Decked Out 2D is ready for its next victim!");
    resetGameLogic(); // Initialize Map/Player

    showToast("WASD to Move, Hold SHIFT to Sneak", 5000);

    // Start Audio Systems
    startHeartbeatSystem(() => gameState.clank);

    // Show HUD
    document.getElementById('ui-layer').classList.remove('hidden');

    isGameRunning = true;
    updateTouchVisibility(true); // Show Touch Controls if enabled
    requestAnimationFrame(gameLoop);
}

// === CINEMATIC INTRO ===
function playIntroSequence() {
    const cinematic = document.getElementById('cinematic-overlay');
    const doorContainer = document.getElementById('door-container');
    const canvas = document.getElementById('intro-particles');
    const ctx = canvas.getContext('2d');

    // 1. Show Cinematic Layer
    cinematic.classList.remove('hidden');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 2. Play Audio
    // 2. Play Audio
    const readyVoice = new Audio('assets/voice/ready.opus');
    readyVoice.volume = 0.8;
    readyVoice.play().catch(e => console.warn("Audio play failed:", e));

    // 3. Particle System (Spiral)
    let particles = [];
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 5 * 3;
    let frame = 0;

    // Create/Update Particles
    function renderParticles() {
        if (!cinematic.classList.contains('hidden')) requestAnimationFrame(renderParticles);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Spawn new particles
        if (frame < 120) { // Spawn for 2 seconds
            for (let i = 0; i < 5; i++) {
                particles.push({
                    angle: Math.random() * Math.PI * 2,
                    radius: 10 + Math.random() * 50, // Start relative center
                    speed: 2 + Math.random() * 2,
                    size: 2 + Math.random() * 3,
                    alpha: 1,
                    hue: 40 + Math.random() * 20 // Gold/Yellow
                });
            }
        }

        // Update & Draw
        particles.forEach((p, index) => {
            p.radius += p.speed; // Expand outward spiral
            p.angle += 0.05; // Rotate
            p.alpha -= 0.01; // Fade

            // Draw
            let x = centerX + Math.cos(p.angle) * p.radius;
            let y = centerY + Math.sin(p.angle) * p.radius;

            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = `hsl(${p.hue}, 100%, 50%)`;
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;

            if (p.alpha <= 0) particles.splice(index, 1);
        });

        frame++;
    }
    renderParticles();


    // 4. Sequence Timing
    // A) Fade In Doors (over menu)
    setTimeout(() => {
        doorContainer.classList.add('visible');
    }, 1000);

    // B) Open Doors & Reveal Game
    setTimeout(() => {
        // Play Gong right before door opens for impact
        playGong(() => { });

        // Reveal Game behind doors (make overlay transparent)
        cinematic.classList.add('transparent-bg');

        // Open
        doorContainer.classList.add('open');

        // Fade out particles
        canvas.style.transition = "opacity 1s";
        canvas.style.opacity = 0;

        // Start Game Rendering immediately so it's visible
        launchGame();

    }, 2700); // 2.5s + 200ms hold

    // 5. Finish & Start Game
    setTimeout(() => {
        cinematic.classList.add('hidden');
        // Reset styles for next time (reloads anyway, but good practice)
        doorContainer.classList.remove('open');
        doorContainer.classList.remove('visible');
        cinematic.classList.remove('transparent-bg');
        canvas.style.opacity = 1;

    }, 7000); // 2.7s + 4s anim + buffer
}

function handleGameOver() {
    isGameRunning = false;
    updateTouchVisibility(false); // Hide Touch Controls
    const overlay = document.getElementById('game-over-overlay');
    overlay.classList.remove('hidden');
    speak("Game Over");
}

function resetGame() {
    location.reload();
}

function resetGameLogic() {
    player.hp = PLAYER_MAX_HP;
    setupLevel(); // Reset map, enemies, player pos
    gameState.clank = 0;
    updateUI(gameState, player);
}

export function spawnEmber(x, y) {
    embers.push(new Ember(x, y));
}

export function queueRegrowth(x, y) {
    // Add to queue without timer
    regrowingBushes.push({ x, y });
}

function updateSpawners() {
    treasureSpots.forEach(spot => {
        // 1. Check Distance (10 blocks)
        const dist = Math.sqrt((player.x - spot.x) ** 2 + (player.y - spot.y) ** 2);
        if (dist > SPAWNER_ACTIVATION_RANGE) return;

        // 2. Random Chance (Lower chance per frame since it's active constantly, not just when moving)
        // Previous was 1% when moving. Let's try 0.5% per frame (approx 1 per 3 sec per spawner)
        // 2. Random Chance
        if (Math.random() < EMBER_SPAWN_CHANCE) {

            // 3. Calculate Spawn Point (0 - 1.5 radius)
            let spawnPos = getValidSpawnPoint(spot.x, spot.y, 1.5);

            if (spawnPos) {
                spawnEmber(spawnPos.x, spawnPos.y);
                // Optional: Play a distant sound? Or only if very close?
                if (dist < 5) playDing();
            }
        }
    });
}

function getValidSpawnPoint(cx, cy, maxRadius) {
    // Try 5 times to find a valid spot
    for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * maxRadius;
        const tx = cx + Math.cos(angle) * radius;
        const ty = cy + Math.sin(angle) * radius;

        // Check solidity
        if (!isSolid(Math.floor(tx), Math.floor(ty))) {
            return { x: tx, y: ty };
        }
    }

    // Fallback: If center is valid, return center, else closest non-solid?
    if (!isSolid(Math.floor(cx), Math.floor(cy))) {
        return { x: cx, y: cy };
    }
    return null; // Failed to find spot
}

function isSolid(x, y) {
    if (x < 0 || x >= map[0].length || y < 0 || y >= map.length) return true;
    let cell = map[y][x];
    let id = (typeof cell === 'object') ? (cell.id || 0) : cell;
    let block = BLOCK_DEFS[id] || DEFAULT_BLOCK;
    return block.solid;
}
