export const TILE_SIZE = 40;

// === Physics & Player ===
export const ACCELERATION = 0.02;
export const MAX_SPEED = 0.1;
export const RUN_MULT = 2;
export const BUNNY_HOP_BOOST = 1.3;
export const SNEAK_MULT = 0.5;
export const PLAYER_RADIUS = 0.3;
export const PLAYER_MAX_HP = 10;
export const PLAYER_JUMP_VELOCITY = 4;
export const PLAYER_EAT_COOLDOWN = 500; // ms
export const PLAYER_EAT_HEAL_AMOUNT = 2;
export const PLAYER_CHECK_COOLDOWN = 1000; // ms
export const PLAYER_ANIMATION_SPEED = 10; // Ticks per frame

// === Camera & Lighting ===
export const VIEW_W = 20;
export const VIEW_H = 15;
export const SIGHT_RADIUS = 8;
export const MAX_LOOK_OFFSET = 6;

// === Game Balance / Rules ===
export const EMBER_SPAWN_CHANCE = 0.0002; // 0.5% per frame
export const BERRY_REGROW_CHANCE = 0.0005; // 0.5% per frame
export const SPAWNER_ACTIVATION_RANGE = 10; // Blocks
export const CLANK_SPEED_THRESHOLD = 0.05;
export const CLANK_CHANCE_MULTIPLIER = 0.5;
export const HAZARD_DAMAGE_CHANCE = 0.05;
export const ARTIFACT_CLANK_PENALTY = 20;

// === Entities ===
// Projectiles
export const PROJECTILE_SPEED = 0.15;
export const PROJECTILE_RADIUS = 0.2;

// Embers
export const EMBER_LIFESPAN = 45000;

// Ravager
export const RAVAGER_SPEED = 0.05;
export const RAVAGER_CHASE_SPEED_MULT = 1.5;
export const RAVAGER_VIEW_RANGE = 7;

// Vex
export const VEX_ORBIT_SPEED = 0.02;
export const VEX_SWOOP_SPEED = 0.12;
export const VEX_SWOOP_COOLDOWN = 3000;
export const VEX_START_CLANK = 60;
export const VEX_SPAWN_INTERVAL = 10;

// Ghast
export const GHAST_SPEED = 0.03;
export const GHAST_VIEW_RANGE = 20;
export const GHAST_ATTACK_COOLDOWN = 3000;
