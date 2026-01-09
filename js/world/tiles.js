// js/world/tiles.js

export const BLOCK_DEFS = {
    // Basic
    0: { name: "Stone", color: "#222", solid: false, slideFactor: 0.80 },
    // FIXED: Map uses 1 as walls, so it must be solid (changed from Ice Floor to Ice Wall)
    1: { name: "Ice Wall", color: "#9dc8cda5", solid: true },
    2: { name: "Ice Floor", color: "#00bcd4", solid: false, slideFactor: 0.96 },

    4: { name: "Wall", color: "#666", solid: true },
    5: { name: "Wall2", color: "#444", solid: true },

    // Special
    6: { name: "Salt", color: "#ddd", solid: false, enemyBlocked: true, slideFactor: 0.80 },
    // Added 11 (used in map borders)
    11: { name: "Void", color: "#111", solid: true },

    // Hazards & Interactive
    7: { name: "Bush", color: "#343", solid: false, slideFactor: 0.70 }, // Bushes slow you down
    8: { name: "Berry", color: "#f0f", solid: false, heal: 2, slideFactor: 0.70 },
    9: { name: "Lava", color: "#d32f2f", solid: false, damage: 1, slideFactor: 0.80 },

    // Liquids/Terrain
    12: { name: "Mud", color: "#5d4037", solid: false, slideFactor: 0.40, z: -1 },
    13: { name: "Water", color: "#29b6f6", solid: false, slideFactor: 0.60, z: -1 },

    // Goal
    99: { name: "Artifact", color: "gold", solid: false, goal: true }
};

export const DEFAULT_BLOCK = { name: "Void", color: "magenta", solid: true };

// ===== Texture System =====
export const BLOCK_TEXTURES = {}; // { blockId: { variant: Image, ... } }
export const BLOCK_VARIANTS = {}; // { blockId: [variant1, variant2, ...] }

// Dynamically load textures for all blocks in BLOCK_DEFS
// Tries variants 1-10 for each block ID
export function loadBlockTextures(callback) {
    const blockIds = Object.keys(BLOCK_DEFS).map(Number);
    const maxVariant = 10; // Check up to 10 variants per block
    let pending = 0;
    let completed = 0;

    blockIds.forEach(id => {
        for (let variant = 1; variant <= maxVariant; variant++) {
            pending++;
            const img = new Image();

            img.onload = () => {
                // Store texture
                if (!BLOCK_TEXTURES[id]) BLOCK_TEXTURES[id] = {};
                BLOCK_TEXTURES[id][variant] = img;

                // Track variants
                if (!BLOCK_VARIANTS[id]) BLOCK_VARIANTS[id] = [];
                if (!BLOCK_VARIANTS[id].includes(variant)) {
                    BLOCK_VARIANTS[id].push(variant);
                    BLOCK_VARIANTS[id].sort((a, b) => a - b);
                }

                completed++;
                if (completed === pending && callback) callback();
            };

            img.onerror = () => {
                // Texture doesn't exist - that's fine
                completed++;
                if (completed === pending && callback) callback();
            };

            img.src = `assets/tiles/${id}.${variant}.png`;
        }
    });

    // If no blocks to check, callback immediately
    if (pending === 0 && callback) callback();
}

// Get texture for a block (returns Image or null)
export function getBlockTexture(blockId, variant = 1) {
    return BLOCK_TEXTURES[blockId]?.[variant] || null;
}

// Get available variants for a block
export function getBlockVariants(blockId) {
    return BLOCK_VARIANTS[blockId] || [];
}

// Get next variant (cycles through available variants)
export function getNextVariant(blockId, currentVariant) {
    const variants = getBlockVariants(blockId);
    if (variants.length === 0) return currentVariant;

    const idx = variants.indexOf(currentVariant);
    if (idx === -1) return variants[0];
    return variants[(idx + 1) % variants.length];
}
