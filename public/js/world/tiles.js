// js/world/tiles.js

export const SHEET_TILE_SIZE = 32; // Assuming the sprite sheet source tiles are 32x32. Change this if they are 40x40 or other.

export const BLOCK_DEFS = {
    "0": {
        "name": "Stone",
        "color": "#222",
        "solid": false,
        "slideFactor": 0.8,
        "sheetIndex": [
            [
                0,
                0
            ],
            [
                1,
                1
            ]
        ]
    },
    "1": {
        "name": "Ice Wall",
        "color": "#9dc8cda5",
        "solid": true,
        "sheetIndex": [
            [
                2,
                1
            ],
            [
                3,
                1
            ],
            [
                2,
                0
            ],
            [
                3,
                0
            ]
        ]
    },
    "2": {
        "name": "Ice Floor",
        "color": "#00bcd4",
        "solid": false,
        "slideFactor": 0.96,
        "sheetIndex": [
            [
                4,
                0
            ],
            [
                5,
                0
            ],
            [
                5,
                1
            ],
            [
                4,
                1
            ]
        ]
    },
    "4": {
        "name": "Wall",
        "color": "#666",
        "solid": true,
        "sheetIndex": [
            [
                0,
                1
            ],
            [
                1,
                0
            ]
        ]
    },
    "5": {
        "name": "Wall2",
        "color": "#444",
        "solid": true,
        "sheetIndex": [
            [
                0,
                2
            ],
            [
                1,
                3
            ],
            [
                1,
                2
            ],
            [
                0,
                3
            ]
        ]
    },
    "6": {
        "name": "Salt",
        "color": "#ddd",
        "solid": false,
        "enemyBlocked": true,
        "slideFactor": 0.8,
        "sheetIndex": [
            [
                7,
                2
            ],
            [
                6,
                2
            ],
            [
                6,
                3
            ],
            [
                7,
                3
            ]
        ]
    },
    "7": {
        "name": "Bush",
        "color": "#343",
        "solid": false,
        "slideFactor": 0.7,
        "sheetIndex": [
            1,
            6
        ]
    },
    "8": {
        "name": "Berry",
        "color": "#f0f",
        "solid": false,
        "heal": 2,
        "slideFactor": 0.7,
        "sheetIndex": [
            0,
            6
        ]
    },
    "9": {
        "name": "Lava",
        "color": "#d32f2f",
        "solid": false,
        "damage": 1,
        "slideFactor": 0.8,
        "sheetIndex": [
            [
                4,
                4
            ],
            [
                5,
                4
            ],
            [
                5,
                5
            ],
            [
                4,
                5
            ]
        ]
    },
    "11": {
        "name": "Void",
        "color": "#111",
        "solid": true,
        "sheetIndex": [
            [
                1,
                5
            ],
            [
                0,
                4
            ],
            [
                1,
                4
            ],
            [
                0,
                5
            ]
        ]
    },
    "12": {
        "name": "Mud",
        "color": "#5d4037",
        "solid": false,
        "slideFactor": 0.4,
        "z": -1,
        "sheetIndex": [
            [
                3,
                2
            ],
            [
                2,
                2
            ],
            [
                2,
                3
            ],
            [
                3,
                3
            ]
        ]
    },
    "13": {
        "name": "Water",
        "color": "#29b6f6",
        "solid": false,
        "slideFactor": 0.6,
        "z": -1,
        "sheetIndex": [
            [
                4,
                2
            ],
            [
                4,
                3
            ],
            [
                5,
                3
            ],
            [
                5,
                2
            ]
        ]
    },
    "99": {
        "name": "Artifact",
        "color": "#000000",
        "solid": false,
        "slideFactor": 0.8,
        "sheetIndex": [
            3,
            11
        ]
    }
};

export const DEFAULT_BLOCK = { name: "Void", color: "magenta", solid: true, sheetIndex: [0, 3] };

// ===== Texture System =====
const tileSheet = new Image();
let texturesLoaded = false;

export function loadBlockTextures(callback) {
    tileSheet.onload = () => {
        texturesLoaded = true;
        console.log("Sprite sheet loaded.");
        if (callback) callback();
    };
    tileSheet.onerror = () => {
        console.error("Failed to load sprite sheet.");
        if (callback) callback();
    };
    // Correct path considering the public folder structure used in game
    tileSheet.src = 'assets/sprits/tiles.webp';
}

// Get render info for a block
export function getBlockTexture(blockId, variant = 1) {
    if (!texturesLoaded) return null;

    const block = BLOCK_DEFS[blockId] || DEFAULT_BLOCK;
    let gx, gy;

    // Check if sheetIndex is array of arrays (multiple variants)
    if (block.sheetIndex && Array.isArray(block.sheetIndex[0])) {
        // Multiple variants defined
        let index = variant - 1;
        if (index < 0 || index >= block.sheetIndex.length) index = 0;
        [gx, gy] = block.sheetIndex[index];
    } else {
        // Single definition: [x, y]
        [gx, gy] = block.sheetIndex || [0, 0];
    }

    return {
        image: tileSheet,
        sx: gx * SHEET_TILE_SIZE,
        sy: gy * SHEET_TILE_SIZE,
        sw: SHEET_TILE_SIZE,
        sh: SHEET_TILE_SIZE
    };
}

// Get available variants for a block
export function getBlockVariants(blockId) {
    const block = BLOCK_DEFS[blockId];
    if (!block || !block.sheetIndex) return [1];

    if (Array.isArray(block.sheetIndex[0])) {
        // Return array [1, 2, 3... N]
        return block.sheetIndex.map((_, i) => i + 1);
    }
    return [1];
}

export function getNextVariant(blockId, current) {
    const variants = getBlockVariants(blockId);
    if (variants.length === 0) return 1;

    // Cycle through variants
    let idx = variants.indexOf(current);
    if (idx === -1) return variants[0];
    return variants[(idx + 1) % variants.length];
}
