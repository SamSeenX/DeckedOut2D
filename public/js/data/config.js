export const TILE_SIZE = 40;

// === Physics & Player ===
export const ACCELERATION = 0.02;
export const MAX_SPEED = 0.04;
export const RUN_MULT = 1.8;
export const BUNNY_HOP_BOOST = 2;
export const SNEAK_MULT = 0.5;
export const PLAYER_RADIUS = 0.3;
export const PLAYER_MAX_HP = 10;
export const PLAYER_JUMP_VELOCITY = 4;
export const PLAYER_EAT_COOLDOWN = 500; // ms
export const PLAYER_EAT_HEAL_AMOUNT = 1;
export const PLAYER_CHECK_COOLDOWN = 1000; // ms
export const PLAYER_ANIMATION_SPEED = 10; // Ticks per frame

// === Camera & Lighting ===
export const DESKTOP_WIDTH = 800;
export const DESKTOP_HEIGHT = 600;
export const DESKTOP_VIEW_W = 20;
export const DESKTOP_VIEW_H = 15;

export const MOBILE_WIDTH = 600;
export const MOBILE_HEIGHT = 400;
export const MOBILE_VIEW_W = 15;
export const MOBILE_VIEW_H = 10;
export const MOBILE_INITIAL_HEIGHT_VH = 0.9; // 90% view height initially
export const TOUCH_LAYOUT = {
    dpad: { x: 20, y: 60, size: 150 },
    jump: { x: 20, y: 140, size: 70 },
    sneak: { x: 100, y: 140, size: 60 },
    eat: { x: 40, y: 60, size: 60 },
    check: { x: 120, y: 60, size: 60 }
};

export let VIEW_W = DESKTOP_VIEW_W;
export let VIEW_H = DESKTOP_VIEW_H;

export function updateViewDimensions(w, h) {
    VIEW_W = w;
    VIEW_H = h;
}
export const FLASHLIGHT_RADIUS = 8;
export const DIM_VIEW_RADIUS = 10;
export const SHADOW_EDGE_OPACITY = 0.6;  // Shadow tiles adjacent to lit tiles
export const SHADOW_INNER_OPACITY = 0.4; // Shadow tiles not adjacent to lit tiles
export const MAX_LOOK_OFFSET = 6;

// === Game Balance / Rules ===
export const EMBER_SPAWN_CHANCE = 0.0005; // 0.5% per frame
export const BERRY_REGROW_CHANCE = 0.005; // 0.5% per frame
export const SPAWNER_ACTIVATION_RANGE = 10; // Blocks

export const COMPASS_UPDATE_INTERVAL = 100; // ms
export const COMPASS_ROTATION_STEP = 30; // degrees
export const HAZARD_DAMAGE_CHANCE = 0.05;

// === Haze & Stress System ===
export const MAX_HAZE = 100;
export const STRESS_MULTI_AT_MAX_HAZE = 25; // View reduced to 25% at max haze

// Haze Accumulation Sources
export const HAZE_MOVE_INC = 0.1;           // +0.1 per interval moving
export const HAZE_MOVE_INTERVAL = 200;      // 200ms interval
export const HAZE_JUMP_INC = 0.2;           // +0.2 per jump
export const HAZE_DAMAGE_PENALTY = 5;       // +5 on damage
export const HAZE_AGGRO_PENALTY = 5;        // +5 on enemy aggro
export const HAZE_AGGRO_COOLDOWN = 10000;   // 10s cooldown per enemy
export const ARTIFACT_HAZE_PENALTY = 20;    // +20 on finding artifact
export const HAZE_MISS_PENALTY = 2;         // +2 on checking empty spot
export const HAZE_PROXIMITY_INC = 0.05;     // +0.05 per frame near enemy
export const PROXIMITY_RANGE = 6;           // Range for "Sixth Sense" stress

// Haze Reduction
export const HAZE_DECAY_AMOUNT = 0.5;       // -0.5 per interval
export const HAZE_DECAY_INTERVAL = 10000;   // 10s interval
export const HAZE_EAT_REDUCTION = 5;        // -5 on eating
export const HAZE_EMBER_REDUCTION = 2;      // -2 on picking up ember

// Haze Effect Thresholds
export const HAZE_SPEED_THRESHOLD = 0.05;
export const HAZE_CRITICAL_THRESHOLD = 90; // Compass Malfunction / Red Tint / Shake
export const PHANTOM_START_HAZE = 60; // Moved here for context
export const PHANTOM_CRITICAL_SPAWN_MULT = 1.3; // Double spawns at critical haze

// Heartbeat Audio System (Scaled by Haze)
export const HEARTBEAT_MIN_INTERVAL = 400;  // ms (Fastest) - High Haze
export const HEARTBEAT_MAX_INTERVAL = 3000; // ms (Slowest) - Low Haze (Start)
export const HEARTBEAT_MIN_VOLUME = 0.005;   // Low Haze - Very quiet
export const HEARTBEAT_MAX_VOLUME = 0.6;    // High Haze - Loud

// Deprecated / Unused
export const HAZE_WALK_INC = 0;
export const HAZE_RUN_INC = 0;
export const HAZE_CHANCE_MULTIPLIER = 0.5;


// === Entities ===
// Projectiles
export const PROJECTILE_SPEED = 0.15;
export const PROJECTILE_RADIUS = 0.2;

// Embers
export const EMBER_LIFESPAN = 45000;

// Frost Beast
export const FROST_BEAST_SPEED = 0.02;
export const FROST_BEAST_ACCEL = 0.01;
export const FROST_BEAST_CHASE_SPEED_MULT = 2.8;
export const FROST_BEAST_DETECTION_RANGE = 6;
export const FROST_BEAST_IDLE_FPS = 6;
export const FROST_BEAST_CHASE_FPS = 12;

// Phantom
export const PHANTOM_ORBIT_SPEED = 0.02;
export const PHANTOM_SWOOP_SPEED = 0.12;
export const PHANTOM_SWOOP_COOLDOWN = 3000;

export const PHANTOM_SPAWN_INTERVAL = 5; // Every 5 Haze points (approx 10s of walking)
export const PHANTOM_SPAWN_CHANCE = 0.3; // 50% chance per interval

// Specter
export const SPECTER_SPEED = 0.03;
export const SPECTER_DETECTION_RANGE = 10;
export const SPECTER_ATTACK_COOLDOWN = 3000;
