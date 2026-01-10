import { SHEET_TILE_SIZE, BLOCK_DEFS, DEFAULT_BLOCK } from '../data/tiles.js';

export { SHEET_TILE_SIZE, BLOCK_DEFS, DEFAULT_BLOCK };

// ===== Texture System =====
const tileSheet = new Image();
let texturesLoaded = false;

export function loadBlockTextures(callback, basePath = '') {
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
    // basePath allows tools in other folders (like ../tools) to resolve assets correctly
    tileSheet.src = (basePath ? basePath + '/' : '') + 'assets/sprits/tiles.webp';
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
