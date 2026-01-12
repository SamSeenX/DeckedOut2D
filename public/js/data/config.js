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
export const EMBER_SPAWN_CHANCE = 0.0002; // 0.5% per frame
export const BERRY_REGROW_CHANCE = 0.0005; // 0.5% per frame
export const SPAWNER_ACTIVATION_RANGE = 10; // Blocks
export const CLANK_SPEED_THRESHOLD = 0.05;
// Walk/Move Clank now handled by timer, so these standard increments might be unused or retuned
export const CLANK_WALK_INC = 0; // Disabled in favor of time-based
export const CLANK_RUN_INC = 0;  // Disabled in favor of time-based
export const CLANK_MOVE_INC = 0.1; // New time-based increment
export const CLANK_MOVE_INTERVAL = 200; // ms

export const CLANK_JUMP_INC = 0.2; // Reduced from 2
export const CLANK_DECAY_AMOUNT = 0.5; // Reduce clank by this amount
export const CLANK_DECAY_INTERVAL = 10000; // 10 seconds
export const CLANK_CHANCE_MULTIPLIER = 0.5; // Keeping this for random chance logic if still used
export const HEARTBEAT_MIN_INTERVAL = 400; // ms (Fastest) - High Clank
export const HEARTBEAT_MAX_INTERVAL = 1200; // ms (Slowest) - Low Clank
export const MAX_CLANK = 100; // Assumed max for scaling heartbeat
export const HEARTBEAT_MIN_VOLUME = 0.05; // Low Clank - Very quiet
export const HEARTBEAT_MAX_VOLUME = 0.5; // High Clank - Loud
export const HAZARD_DAMAGE_CHANCE = 0.05;
export const ARTIFACT_CLANK_PENALTY = 20;

export const COMPASS_UPDATE_INTERVAL = 100; // ms
export const COMPASS_ROTATION_STEP = 30; // degrees

// === Entities ===
// Projectiles
export const PROJECTILE_SPEED = 0.15;
export const PROJECTILE_RADIUS = 0.2;

// Embers
export const EMBER_LIFESPAN = 45000;

// Ravager
export const RAVAGER_SPEED = 0.02;
export const RAVAGER_ACCEL = 0.01;
export const RAVAGER_CHASE_SPEED_MULT = 2.8;
export const RAVAGER_DETECTION_RANGE = 6;
export const RAVAGER_IDLE_FPS = 6;
export const RAVAGER_CHASE_FPS = 12;

// Vex
export const VEX_ORBIT_SPEED = 0.02;
export const VEX_SWOOP_SPEED = 0.12;
export const VEX_SWOOP_COOLDOWN = 3000;
export const VEX_START_CLANK = 60;
export const VEX_SPAWN_INTERVAL = 10;
export const VEX_SPAWN_CHANCE = 0.3; // 30% chance per interval

// Ghast
export const GHAST_SPEED = 0.03;
export const GHAST_DETECTION_RANGE = 10;
export const GHAST_ATTACK_COOLDOWN = 3000;
