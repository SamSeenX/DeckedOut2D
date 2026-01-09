// js/mapmaker.js - Map Editor for Decked Out 2D
import { BLOCK_DEFS, DEFAULT_BLOCK, loadBlockTextures, getBlockTexture, getBlockVariants, getNextVariant } from './world/tiles.js';

const canvas = document.getElementById('map-canvas');
const ctx = canvas.getContext('2d');

// ===== Configuration =====
const TILE_SIZE = 40;
let gridWidth = 40;
let gridHeight = 30;
let showGrid = true;
let imageOpacity = 0.5;
let blockOpacity = 0.5;

// ===== State =====
let mapData = [];
let selectedTileId = 0;
let referenceImage = null;
let isPainting = false;
let imageShiftX = 0;
let imageShiftY = 0;

// ===== DOM Elements =====
const uploadBtn = document.getElementById('upload-btn');
const imageUpload = document.getElementById('image-upload');
const clearImageBtn = document.getElementById('clear-image-btn');
const gridWidthInput = document.getElementById('grid-width');
const gridHeightInput = document.getElementById('grid-height');
const resizeBtn = document.getElementById('resize-btn');
const opacitySlider = document.getElementById('opacity-slider');
const opacityValue = document.getElementById('opacity-value');
const gridToggle = document.getElementById('grid-toggle');
const clearBtn = document.getElementById('clear-btn');
const saveBtn = document.getElementById('save-btn');
const loadBtn = document.getElementById('load-btn');
const loadInput = document.getElementById('load-input');
const tileList = document.getElementById('tile-list');
const selectedTileName = document.getElementById('selected-tile-name');
const cursorPos = document.getElementById('cursor-pos');
const mapSize = document.getElementById('map-size');
const imageAlignControls = document.getElementById('image-align-controls');
const cellSizeInput = document.getElementById('cell-size');
const autoCalcBtn = document.getElementById('auto-calc-btn');
const shiftXInput = document.getElementById('shift-x');
const shiftYInput = document.getElementById('shift-y');
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas.getContext('2d');
const canvasContainer = document.getElementById('canvas-container');
const blockOpacitySlider = document.getElementById('block-opacity-slider');
const blockOpacityValue = document.getElementById('block-opacity-value');

// ===== Initialization =====
function init() {
    // Load textures first, then initialize
    loadBlockTextures(() => {
        initMap();
        generateTilePalette();
        setupEventListeners();
        resizeCanvas();
        setupMinimap();
        draw();
    });
}

function initMap() {
    mapData = [];
    for (let y = 0; y < gridHeight; y++) {
        mapData[y] = [];
        for (let x = 0; x < gridWidth; x++) {
            mapData[y][x] = { id: -1, variant: 1 }; // Default to empty (transparent)
        }
    }
    updateMapSizeDisplay();
}

function resizeCanvas() {
    canvas.width = gridWidth * TILE_SIZE;
    canvas.height = gridHeight * TILE_SIZE;
}

// ===== Tile Palette =====
function generateTilePalette() {
    tileList.innerHTML = '';

    // Add Eraser tool first (special -1 id for transparency)
    const eraserItem = document.createElement('div');
    eraserItem.className = 'tile-item';
    eraserItem.dataset.id = -1;
    eraserItem.innerHTML = `
        <div class="tile-preview eraser-preview">✕</div>
        <span class="tile-name">Eraser</span>
        <span class="tile-id">-</span>
    `;
    eraserItem.addEventListener('click', () => selectTile(-1));
    tileList.appendChild(eraserItem);

    // Sort tile IDs numerically from BLOCK_DEFS
    const tileIds = Object.keys(BLOCK_DEFS).map(Number).sort((a, b) => a - b);

    tileIds.forEach(id => {
        const block = BLOCK_DEFS[id];
        const item = document.createElement('div');
        item.className = 'tile-item' + (id === selectedTileId ? ' selected' : '');
        item.dataset.id = id;

        item.innerHTML = `
            <div class="tile-preview" style="background-color: ${block.color}"></div>
            <span class="tile-name">${block.name}</span>
            <span class="tile-id">#${id}</span>
        `;

        item.addEventListener('click', () => selectTile(id));
        tileList.appendChild(item);
    });
}

function selectTile(id) {
    selectedTileId = id;
    selectedTileName.textContent = id === -1 ? 'Eraser' : (BLOCK_DEFS[id]?.name || 'Unknown');

    // Update visual selection
    document.querySelectorAll('.tile-item').forEach(item => {
        item.classList.toggle('selected', parseInt(item.dataset.id) === id);
    });
}

// ===== Drawing =====
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw reference image first (behind everything)
    if (referenceImage) {
        ctx.globalAlpha = imageOpacity;
        // Calculate scale to fit image to grid, then apply shift
        const scale = TILE_SIZE / parseInt(cellSizeInput.value) || 1;
        const drawWidth = referenceImage.width * scale;
        const drawHeight = referenceImage.height * scale;
        ctx.drawImage(
            referenceImage,
            imageShiftX * scale,
            imageShiftY * scale,
            drawWidth,
            drawHeight
        );
        ctx.globalAlpha = 1;
    }

    // Draw tiles with block opacity
    ctx.globalAlpha = blockOpacity;
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const tile = mapData[y]?.[x];
            if (!tile) continue;

            const tileId = tile.id;
            const variant = tile.variant || 1;

            // Skip drawing if tile is -1 (eraser/transparent) to let reference show through
            if (tileId === -1) continue;

            const block = BLOCK_DEFS[tileId] || DEFAULT_BLOCK;
            const texture = getBlockTexture(tileId, variant);

            if (texture) {
                // Draw texture
                ctx.drawImage(texture, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            } else {
                // Fall back to color
                ctx.fillStyle = block.color;
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    ctx.globalAlpha = 1;

    // Draw grid overlay
    if (showGrid) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= gridWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * TILE_SIZE + 0.5, 0);
            ctx.lineTo(x * TILE_SIZE + 0.5, canvas.height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= gridHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * TILE_SIZE + 0.5);
            ctx.lineTo(canvas.width, y * TILE_SIZE + 0.5);
            ctx.stroke();
        }
    }

    // Update mini-map
    drawMinimap();
}

// ===== Tile Placement =====
function getTileCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top) * scaleY / TILE_SIZE);

    return { x, y };
}

function placeTile(x, y, tileId) {
    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
        // Get default variant (first available or 1)
        const variants = getBlockVariants(tileId);
        const variant = variants.length > 0 ? variants[0] : 1;

        let newTile = { id: tileId, variant: variant };

        // Auto-apply Z level from definition
        const def = BLOCK_DEFS[tileId];
        if (def && def.z !== undefined) {
            newTile.z = def.z;
        }

        mapData[y][x] = newTile;
        draw();
    }
}
// Cycle through variants for existing tile (Shift+click)
function cycleVariant(x, y) {
    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
        const tile = mapData[y][x];
        if (!tile || tile.id === -1) return;

        const nextVariant = getNextVariant(tile.id, tile.variant);
        if (nextVariant !== tile.variant) {
            mapData[y][x] = { id: tile.id, variant: nextVariant };
            draw();
        }
    }
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Canvas events
    canvas.addEventListener('mousedown', (e) => {
        const { x, y } = getTileCoords(e);

        // Shift+click to cycle variants
        if (e.shiftKey) {
            cycleVariant(x, y);
            return;
        }

        isPainting = true;
        // Right click or Ctrl+click to erase
        const tileId = (e.button === 2 || e.ctrlKey) ? -1 : selectedTileId;
        placeTile(x, y, tileId);
    });

    canvas.addEventListener('mousemove', (e) => {
        const { x, y } = getTileCoords(e);
        cursorPos.textContent = `Tile: (${x}, ${y})`;

        if (isPainting && !e.shiftKey) {
            const tileId = e.ctrlKey ? -1 : selectedTileId;
            placeTile(x, y, tileId);
        }
    });

    canvas.addEventListener('mouseup', () => {
        isPainting = false;
    });

    canvas.addEventListener('mouseleave', () => {
        isPainting = false;
    });

    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault(); // Prevent right-click menu
    });

    // Upload image
    uploadBtn.addEventListener('click', () => imageUpload.click());
    imageUpload.addEventListener('change', handleImageUpload);

    // Clear image
    clearImageBtn.addEventListener('click', () => {
        referenceImage = null;
        imageAlignControls.style.display = 'none';
        draw();
    });

    // Auto-calculate grid size
    autoCalcBtn.addEventListener('click', autoCalculateGrid);

    // Image shift controls
    shiftXInput.addEventListener('input', (e) => {
        imageShiftX = parseInt(e.target.value) || 0;
        draw();
    });

    shiftYInput.addEventListener('input', (e) => {
        imageShiftY = parseInt(e.target.value) || 0;
        draw();
    });

    cellSizeInput.addEventListener('input', () => {
        draw();
    });

    // Opacity slider
    opacitySlider.addEventListener('input', (e) => {
        imageOpacity = e.target.value / 100;
        opacityValue.textContent = `${e.target.value}%`;
        draw();
    });

    // Block opacity slider
    blockOpacitySlider.addEventListener('input', (e) => {
        blockOpacity = e.target.value / 100;
        blockOpacityValue.textContent = `${e.target.value}%`;
        draw();
    });

    // Grid toggle
    gridToggle.addEventListener('change', (e) => {
        showGrid = e.target.checked;
        draw();
    });

    // Resize grid
    resizeBtn.addEventListener('click', handleResize);

    // Clear map - show custom modal
    const confirmModal = document.getElementById('confirm-modal');
    const confirmYes = document.getElementById('confirm-yes');
    const confirmNo = document.getElementById('confirm-no');

    clearBtn.addEventListener('click', () => {
        confirmModal.classList.remove('hidden');
    });

    confirmYes.addEventListener('click', () => {
        initMap();
        draw();
        confirmModal.classList.add('hidden');
    });

    confirmNo.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
    });

    // Save/Load
    saveBtn.addEventListener('click', saveMap);
    document.getElementById('export-js-btn').addEventListener('click', saveMapAsJS);
    loadBtn.addEventListener('click', () => loadInput.click());
    loadInput.addEventListener('change', handleLoadMap);
}

// ===== Image Upload =====
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            referenceImage = img;
            // Show image alignment controls
            imageAlignControls.style.display = 'flex';
            // Reset shift values
            imageShiftX = 0;
            imageShiftY = 0;
            shiftXInput.value = 0;
            shiftYInput.value = 0;
            draw();
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// ===== Auto-Calculate Grid from Image =====
function autoCalculateGrid() {
    if (!referenceImage) {
        alert('Please load an image first.');
        return;
    }

    const cellSize = parseInt(cellSizeInput.value) || 12;
    const newWidth = Math.ceil(referenceImage.width / cellSize);
    const newHeight = Math.ceil(referenceImage.height / cellSize);

    gridWidthInput.value = newWidth;
    gridHeightInput.value = newHeight;

    handleResize();
}

// ===== Grid Resize =====
function handleResize() {
    const newWidth = parseInt(gridWidthInput.value) || 40;
    const newHeight = parseInt(gridHeightInput.value) || 30;

    // Clamp values
    gridWidthInput.value = Math.max(5, Math.min(200, newWidth));
    gridHeightInput.value = Math.max(5, Math.min(200, newHeight));

    const oldData = mapData;
    gridWidth = parseInt(gridWidthInput.value);
    gridHeight = parseInt(gridHeightInput.value);

    // Create new map, preserving existing data
    mapData = [];
    for (let y = 0; y < gridHeight; y++) {
        mapData[y] = [];
        for (let x = 0; x < gridWidth; x++) {
            mapData[y][x] = oldData[y]?.[x] ?? { id: -1, variant: 1 };
        }
    }

    resizeCanvas();
    updateMapSizeDisplay();
    draw();
}

function updateMapSizeDisplay() {
    mapSize.textContent = `Map: ${gridWidth} × ${gridHeight}`;
}

// ===== Save Map =====
function saveMap() {
    const data = {
        version: 1,
        width: gridWidth,
        height: gridHeight,
        tiles: mapData
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `deckedout_map_${Date.now()}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

// ===== Save Map as JavaScript =====
function saveMapAsJS() {
    // Smart Export: Numbers for simple tiles, Objects for metadata
    const simpleMap = mapData.map(row =>
        row.map(tile => {
            if (!tile || tile.id === -1) return 0;

            const def = BLOCK_DEFS[tile.id];
            const defaultZ = def ? (def.z || 0) : 0;

            // Check for metadata that needs preserving
            // ONLY export Z if it differs from the block's default definition
            let hasZOverride = (tile.z !== undefined && tile.z !== defaultZ);
            let hasSpawn = (tile.spawn !== undefined);

            if (hasZOverride || hasSpawn) {
                let out = { id: tile.id };
                if (hasZOverride) out.z = tile.z;
                if (hasSpawn) out.spawn = tile.spawn;
                return out;
            }

            return tile.id;
        })
    );

    const jsContent = `// js/world/map.js - Game Map Data
// Generated by Map Maker on ${new Date().toISOString()}

export const map = ${JSON.stringify(simpleMap, null, 4)};
`;

    const blob = new Blob([jsContent], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'map.js';
    a.click();

    URL.revokeObjectURL(url);
}

// ===== Load Map =====
function handleLoadMap(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);

            if (data.tiles && Array.isArray(data.tiles)) {
                gridWidth = data.width || data.tiles[0]?.length || 40;
                gridHeight = data.height || data.tiles.length || 30;

                // Convert old format (number) to new format ({id, variant})
                mapData = data.tiles.map(row =>
                    row.map(tile => {
                        if (typeof tile === 'number') {
                            return { id: tile, variant: 1 };
                        }
                        return tile;
                    })
                );

                gridWidthInput.value = gridWidth;
                gridHeightInput.value = gridHeight;

                resizeCanvas();
                updateMapSizeDisplay();
                draw();

                console.log('Map loaded successfully!');
            } else {
                alert('Invalid map file format.');
            }
        } catch (err) {
            alert('Error loading map: ' + err.message);
        }
    };
    reader.readAsText(file);

    // Reset input so same file can be loaded again
    e.target.value = '';
}

// ===== Mini-Map =====
function setupMinimap() {
    // Set minimap size
    minimapCanvas.width = minimapCanvas.offsetWidth;
    minimapCanvas.height = 150;

    // Click on minimap to navigate
    minimapCanvas.addEventListener('click', handleMinimapClick);

    // Update minimap when scrolling
    canvasContainer.addEventListener('scroll', drawMinimap);
}

function drawMinimap() {
    const mmWidth = minimapCanvas.width;
    const mmHeight = minimapCanvas.height;

    minimapCtx.clearRect(0, 0, mmWidth, mmHeight);

    // Draw reference image if loaded
    if (referenceImage) {
        // Scale image to fit minimap while maintaining aspect ratio
        const imgAspect = referenceImage.width / referenceImage.height;
        const mmAspect = mmWidth / mmHeight;

        let drawWidth, drawHeight, drawX, drawY;

        if (imgAspect > mmAspect) {
            drawWidth = mmWidth;
            drawHeight = mmWidth / imgAspect;
            drawX = 0;
            drawY = (mmHeight - drawHeight) / 2;
        } else {
            drawHeight = mmHeight;
            drawWidth = mmHeight * imgAspect;
            drawX = (mmWidth - drawWidth) / 2;
            drawY = 0;
        }

        minimapCtx.globalAlpha = 0.7;
        minimapCtx.drawImage(referenceImage, drawX, drawY, drawWidth, drawHeight);
        minimapCtx.globalAlpha = 1;
    } else {
        // No image - draw a representation of the grid
        minimapCtx.fillStyle = '#1a1a1a';
        minimapCtx.fillRect(0, 0, mmWidth, mmHeight);

        minimapCtx.fillStyle = '#333';
        minimapCtx.font = '12px sans-serif';
        minimapCtx.textAlign = 'center';
        minimapCtx.fillText('Load image for preview', mmWidth / 2, mmHeight / 2);
    }

    // Draw viewport indicator
    const totalWidth = canvas.width;
    const totalHeight = canvas.height;
    const viewWidth = canvasContainer.clientWidth;
    const viewHeight = canvasContainer.clientHeight;
    const scrollX = canvasContainer.scrollLeft;
    const scrollY = canvasContainer.scrollTop;

    // Calculate viewport rectangle on minimap
    const scaleX = mmWidth / totalWidth;
    const scaleY = mmHeight / totalHeight;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (mmWidth - totalWidth * scale) / 2;
    const offsetY = (mmHeight - totalHeight * scale) / 2;

    const vpX = offsetX + scrollX * scale;
    const vpY = offsetY + scrollY * scale;
    const vpW = Math.min(viewWidth, totalWidth) * scale;
    const vpH = Math.min(viewHeight, totalHeight) * scale;

    // Draw viewport rectangle
    minimapCtx.strokeStyle = '#6a5acd';
    minimapCtx.lineWidth = 2;
    minimapCtx.strokeRect(vpX, vpY, vpW, vpH);

    // Fill with semi-transparent color
    minimapCtx.fillStyle = 'rgba(106, 90, 205, 0.1)';
    minimapCtx.fillRect(vpX, vpY, vpW, vpH);
}

function handleMinimapClick(e) {
    const rect = minimapCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const mmWidth = minimapCanvas.width;
    const mmHeight = minimapCanvas.height;
    const totalWidth = canvas.width;
    const totalHeight = canvas.height;

    // Calculate scale and offset
    const scaleX = mmWidth / totalWidth;
    const scaleY = mmHeight / totalHeight;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (mmWidth - totalWidth * scale) / 2;
    const offsetY = (mmHeight - totalHeight * scale) / 2;

    // Convert click to main canvas coordinates
    const targetX = (clickX - offsetX) / scale;
    const targetY = (clickY - offsetY) / scale;

    // Center viewport on clicked position
    const viewWidth = canvasContainer.clientWidth;
    const viewHeight = canvasContainer.clientHeight;

    canvasContainer.scrollLeft = targetX - viewWidth / 2;
    canvasContainer.scrollTop = targetY - viewHeight / 2;

    drawMinimap();
}

// ===== Start =====
init();
