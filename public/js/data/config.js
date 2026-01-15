// ============================================
// DUNGEON OUTCAST - GAME CONFIGURATION
// ============================================
// This file contains all tunable game parameters.
// Modify these values to adjust game balance, visuals, and behavior.

export const TILE_SIZE = 60; // Size of each tile in pixels (affects rendering scale)

// === Physics & Player ===
export const ACCELERATION = 0.02; // How quickly the player reaches max speed (tiles/frame²)
export const MAX_SPEED = 0.04; // Maximum walking speed (tiles/frame)
export const RUN_MULT = 1.8; // Multiplier applied to speed when running (1.8x = 80% faster)
export const BUNNY_HOP_BOOST = 2; // Speed bonus when jumping while running
export const SNEAK_MULT = 0.5; // Speed multiplier when sneaking (0.5 = half speed)
export const PLAYER_RADIUS = 0.3; // Player hitbox radius in tiles (used for collision)
export const PLAYER_MAX_HP = 10; // Maximum player health points
export const PLAYER_JUMP_VELOCITY = 4; // Initial upward velocity when jumping
export const PLAYER_EAT_COOLDOWN = 500; // Milliseconds between eating actions
export const PLAYER_EAT_HEAL_AMOUNT = 1; // HP restored when eating food
export const PLAYER_CHECK_COOLDOWN = 1000; // Milliseconds between "check" actions (artifact/exit search)
export const PLAYER_ANIMATION_SPEED = 10; // Game ticks between animation frame changes

// === Camera & Display ===
// Desktop canvas sizing modes:
// - 'fixed': Use DESKTOP_BASE_WIDTH x DESKTOP_BASE_HEIGHT (classic mode)
// - 'fit': Scale to fit window while maintaining aspect ratio
// - 'fill': Fill window, adjusting view tiles to match
export const DESKTOP_SCALE_MODE = "fit"; // Options: 'fixed', 'fit', 'fill'

// Base canvas dimensions (used as reference for scaling)
export const DESKTOP_BASE_WIDTH = 800; // Base canvas width for desktop
export const DESKTOP_BASE_HEIGHT = 600; // Base canvas height for desktop

// Maximum scale factor for 'fit' mode (prevents overly large canvas on huge monitors)
export const DESKTOP_MAX_SCALE = 2.5; // Max multiplier for canvas scaling

// Minimum scale factor (prevents canvas from being too small)
export const DESKTOP_MIN_SCALE = 0.5; // Min multiplier for canvas scaling

// Mobile settings
export const MOBILE_VIEW_W = 15; // Number of tiles visible horizontally on mobile
export const MOBILE_VIEW_H = 10; // Number of tiles visible vertically on mobile
export const MOBILE_INITIAL_HEIGHT_VH = 0.9; // Initial canvas height as viewport percentage (90%)

// Touch control button positions and sizes (in pixels, relative to screen corners)
export const TOUCH_LAYOUT = {
  dpad: { x: 20, y: 60, size: 150 }, // Directional pad position and diameter
  jump: { x: 20, y: 140, size: 70 }, // Jump button position and size
  sneak: { x: 100, y: 140, size: 60 }, // Sneak button position and size
  eat: { x: 40, y: 60, size: 60 }, // Eat button position and size
  check: { x: 120, y: 60, size: 60 }, // Check/interact button position and size
};

// === Minimap ===
export const MINIMAP_SIZE = 120; // Size of minimap in pixels (width and height)
export const MINIMAP_TILE_SIZE = 4; // Size of each tile on the minimap in pixels
export const MINIMAP_VIEW_RADIUS = 20; // Radius of tiles to show around player
export const MINIMAP_MARGIN = 10; // Margin from bottom-left corner in pixels

// Dynamic view dimensions (calculated at runtime based on canvas size and TILE_SIZE)
export let VIEW_W = 20; // Will be recalculated
export let VIEW_H = 15; // Will be recalculated

export function updateViewDimensions(w, h) {
  VIEW_W = w;
  VIEW_H = h;
}

// === Lighting & Visibility ===
export const FLASHLIGHT_RADIUS = 8; // Radius of fully lit area around player (in tiles)
export const DIM_VIEW_RADIUS = 10; // Radius of dimly visible area beyond flashlight (in tiles)
export const SHADOW_EDGE_OPACITY = 0.6; // Opacity of tiles at the edge of lit area (0-1)
export const SHADOW_INNER_OPACITY = 0.4; // Opacity of tiles in dim zone (0-1)
export const MAX_LOOK_OFFSET = 6; // Max tiles the camera can shift toward mouse cursor

// === Game Balance / Rules ===
export const EMBER_SPAWN_CHANCE = 0.0005; // Probability per frame to spawn ember at treasure spots (0.05%)
export const BERRY_REGROW_CHANCE = 0.005; // Probability per frame for empty bush to regrow berries (0.5%)
export const SPAWNER_ACTIVATION_RANGE = 10; // Distance in tiles for spawners/bushes to activate

export const COMPASS_UPDATE_INTERVAL = 100; // Milliseconds between compass needle updates
export const COMPASS_ROTATION_STEP = 30; // Max degrees the compass can rotate per update
export const HAZARD_DAMAGE_CHANCE = 0.05; // Probability per frame to take damage on hazard tiles (5%)

// === Haze & Stress System ===
// Haze is the core stress mechanic - it builds up from actions and reduces visibility/control
export const MAX_HAZE = 100; // Maximum haze level (death is near at max)
export const STRESS_MULTI_AT_MAX_HAZE = 10; // Divider for view radius at max haze (10 = 10% vision)

// --- Haze Accumulation Sources ---
export const HAZE_MOVE_INC = 0.1; // Haze gained per movement interval while moving
export const HAZE_MOVE_INTERVAL = 200; // Milliseconds between movement haze ticks
export const HAZE_JUMP_INC = 0.2; // Haze gained per jump
export const HAZE_DAMAGE_PENALTY = 2; // Haze gained when taking damage
export const HAZE_AGGRO_PENALTY = 2; // Haze gained when an enemy starts chasing you
export const HAZE_AGGRO_COOLDOWN = 10000; // Milliseconds before same enemy can trigger aggro haze again
export const ARTIFACT_HAZE_PENALTY = 10; // Haze gained when picking up the artifact
export const HAZE_MISS_PENALTY = 2; // Haze gained when checking an empty spot (no artifact/exit)
export const HAZE_PROXIMITY_INC = 0.05; // Haze gained per frame while near an enemy
export const PROXIMITY_RANGE = 6; // Distance in tiles for "Sixth Sense" proximity stress

// --- Haze Reduction ---
export const HAZE_DECAY_AMOUNT = 0.5; // Haze reduced per decay interval (natural recovery)
export const HAZE_DECAY_INTERVAL = 10000; // Milliseconds between natural haze decay (10 seconds)
export const HAZE_EAT_REDUCTION = 5; // Haze reduced when eating food
export const HAZE_EMBER_REDUCTION = 2; // Haze reduced when collecting an ember

// --- Haze Effect Thresholds ---
export const HAZE_SPEED_THRESHOLD = 0.05; // Haze level above which player speed is affected
export const HAZE_CRITICAL_THRESHOLD = 90; // Haze level triggering compass malfunction, red tint, screen shake
export const PHANTOM_START_HAZE = 60; // Haze level at which Phantoms can start spawning
export const PHANTOM_CRITICAL_SPAWN_MULT = 1.3; // Spawn chance multiplier when above critical threshold

// --- Heartbeat Audio System (Intensity scales with Haze) ---
export const HEARTBEAT_MIN_INTERVAL = 400; // Fastest heartbeat interval in ms (at high haze)
export const HEARTBEAT_MAX_INTERVAL = 3000; // Slowest heartbeat interval in ms (at low haze)
export const HEARTBEAT_MIN_VOLUME = 0.005; // Heartbeat volume at low haze (nearly silent)
export const HEARTBEAT_MAX_VOLUME = 0.6; // Heartbeat volume at high haze (loud/intense)

// --- Deprecated / Unused (kept for reference) ---
export const HAZE_WALK_INC = 0; // [UNUSED] Previously: haze per walk step
export const HAZE_RUN_INC = 0; // [UNUSED] Previously: haze per run step
export const HAZE_CHANCE_MULTIPLIER = 0.5; // [UNUSED] Previously: probability modifier

// === Entities ===

// --- Projectiles (enemy attacks) ---
export const PROJECTILE_SPEED = 0.15; // Speed of projectiles in tiles/frame
export const PROJECTILE_RADIUS = 0.2; // Hitbox radius of projectiles in tiles

// --- Embers (collectibles) ---
export const EMBER_LIFESPAN = 45000; // Milliseconds before an ember despawns (45 seconds)

// --- Frost Beast (melee enemy) ---
export const FROST_BEAST_SPEED = 0.02; // Base movement speed when idle/roaming (tiles/frame)
export const FROST_BEAST_ACCEL = 0.01; // Acceleration rate (tiles/frame²)
export const FROST_BEAST_CHASE_SPEED_MULT = 2.8; // Speed multiplier when chasing player (2.8x faster)
export const FROST_BEAST_DETECTION_RANGE = 6; // Distance in tiles to detect and chase player
export const FROST_BEAST_IDLE_FPS = 6; // Animation frames per second when idle
export const FROST_BEAST_CHASE_FPS = 12; // Animation frames per second when chasing
export const FROST_BEAST_PATROL_RADIUS = 6; // Radius in tiles for idle roaming

// --- Phantom (spawned by haze, orbits then swoops) ---
export const PHANTOM_ORBIT_SPEED = 0.02; // Rotation speed when orbiting player (radians/frame)
export const PHANTOM_SWOOP_SPEED = 0.12; // Movement speed during attack swoop (tiles/frame)
export const PHANTOM_SWOOP_COOLDOWN = 3000; // Milliseconds between swoop attacks
export const PHANTOM_SPAWN_INTERVAL = 5; // Haze points between spawn checks (spawns at 60, 65, 70...)
export const PHANTOM_SPAWN_CHANCE = 0.3; // Probability of spawning when interval is reached (30%)

// --- Specter (ranged enemy) ---
export const SPECTER_SPEED = 0.03; // Movement speed (tiles/frame)
export const SPECTER_DETECTION_RANGE = 10; // Distance in tiles to detect player
export const SPECTER_ATTACK_COOLDOWN = 3000; // Milliseconds between ranged attacks
