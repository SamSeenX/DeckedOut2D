// js/mapmaker.js - Map Editor for Decked Out 2D
import { BLOCK_DEFS, DEFAULT_BLOCK } from '/js/data/tiles.js';
import { loadBlockTextures, getBlockTexture, getBlockVariants, getNextVariant } from '/js/world/tiles.js';

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
let currentTool = 'paint'; // 'paint', 'fill', 'erase'
let imageShiftX = 0;
let imageShiftY = 0;
let activeAttribute = null; // null means painting tiles
let historyStack = []; // Undo history

// ===== Persistence Keys =====
const STORAGE_KEY_MAP = 'deckedout_mapmaker_data';
const STORAGE_KEY_SETTINGS = 'deckedout_mapmaker_settings';
let autoSaveTimeout = null;

// ===== Zoom & Pan State =====
let zoomLevel = 1.0;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4.0;
const ZOOM_STEP = 0.25;
let isPanning = false;
let isSpaceDown = false;
let panStartX = 0;
let panStartY = 0;
let scrollStartX = 0;
let scrollStartY = 0;


// ===== DOM Elements =====
const uploadBtn = document.getElementById('upload-btn');
const imageUpload = document.getElementById('image-upload');
const clearImageBtn = document.getElementById('clear-image-btn');
const undoBtn = document.getElementById('undo-btn'); // New
const gridWidthInput = document.getElementById('grid-width');
const gridHeightInput = document.getElementById('grid-height');
const resizeBtn = document.getElementById('resize-btn');
const opacitySlider = document.getElementById('opacity-slider');
const opacityValue = document.getElementById('opacity-value');
const gridToggle = document.getElementById('grid-toggle');
const clearBtn = document.getElementById('clear-btn');
const fillBtn = document.getElementById('fill-btn');
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
    // Use empty basePath since SPRITES paths are already absolute from server root
    loadBlockTextures(() => {
        // Try to load saved map data first
        if (!loadFromLocalStorage()) {
            initMap();
        }
        generateTilePalette();
        setupEventListeners();
        resizeCanvas();
        setupMinimap();
        draw();
        console.log('Map Maker initialized. Map data will auto-save to browser storage.');
    }, '');
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
    // historyStack = []; // Clear history on init? Optional.
}

function resizeCanvas() {
    canvas.width = gridWidth * TILE_SIZE;
    canvas.height = gridHeight * TILE_SIZE;
    applyZoom();
}

// ===== Zoom Functions =====
function applyZoom() {
    canvas.style.transform = `scale(${zoomLevel})`;
    canvas.style.transformOrigin = 'top left';
    updateZoomDisplay();
}

function zoomIn() {
    if (zoomLevel < MAX_ZOOM) {
        zoomLevel = Math.min(MAX_ZOOM, zoomLevel + ZOOM_STEP);
        applyZoom();
    }
}

function zoomOut() {
    if (zoomLevel > MIN_ZOOM) {
        zoomLevel = Math.max(MIN_ZOOM, zoomLevel - ZOOM_STEP);
        applyZoom();
    }
}

function resetZoom() {
    zoomLevel = 1.0;
    applyZoom();
}

function updateZoomDisplay() {
    const zoomDisplay = document.getElementById('zoom-level');
    if (zoomDisplay) {
        zoomDisplay.textContent = `Zoom: ${Math.round(zoomLevel * 100)}%`;
    }
}

// ===== Tile Palette =====
function generateTilePalette() {
    tileList.innerHTML = '';



    // Sort tile IDs numerically from BLOCK_DEFS
    const tileIds = Object.keys(BLOCK_DEFS).map(Number).sort((a, b) => a - b);

    // Generate palette with canvas previews
    tileIds.forEach(id => {
        const block = BLOCK_DEFS[id];
        const item = document.createElement('div');
        item.className = 'tile-item' + (id === selectedTileId ? ' selected' : '');
        item.dataset.id = id;

        // Texture Preview (Canvas)
        const previewContainer = document.createElement('div');
        previewContainer.className = 'tile-preview-container';

        const previewCanvas = document.createElement('canvas');
        previewCanvas.className = 'tile-preview-canvas';
        previewCanvas.width = 32;
        previewCanvas.height = 32;

        // Draw texture to canvas
        const ctx = previewCanvas.getContext('2d');
        const texture = getBlockTexture(id, 1);
        if (texture) {
            ctx.drawImage(texture.image, texture.sx, texture.sy, texture.sw, texture.sh, 0, 0, 32, 32);
        } else {
            ctx.fillStyle = block.color;
            ctx.fillRect(0, 0, 32, 32);
        }

        previewContainer.appendChild(previewCanvas);

        // Solid Indicator
        if (block.solid) {
            const ind = document.createElement('div');
            ind.className = 'solid-indicator';
            ind.title = "Solid Block";
            previewContainer.appendChild(ind);
        }

        // Info
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = `
            <span class="tile-name">${block.name}</span>
            <div style="display:flex; justify-content:space-between; width:100%">
                 <span class="tile-id">#${id}</span>
            </div>
        `;
        infoDiv.style.flex = "1";

        item.appendChild(previewContainer);
        item.appendChild(infoDiv);

        item.addEventListener('click', () => selectTile(id));
        tileList.appendChild(item);
    });
}

function selectTile(id) {
    selectedTileId = id;
    selectedTileId = id;
    activeAttribute = null; // Disable attribute mode when selecting a tile
    // isFillMode = false; // Optional: disable fill mode on new tile select? Let's keep it active if user wants to change fill color.
    document.querySelectorAll('.attr-btn').forEach(b => b.classList.remove('active'));

    selectedTileName.textContent = id === -1 ? 'Eraser' : (BLOCK_DEFS[id]?.name || 'Unknown');

    // Update visual selection
    document.querySelectorAll('.tile-item').forEach(item => {
        item.classList.toggle('selected', parseInt(item.dataset.id) === id);
    });

    updateTileDetails(id);
}

function updateTileDetails(id) {
    const panel = document.getElementById('tile-details-panel');
    if (!panel) return;

    panel.innerHTML = '';

    if (id === -1) {
        panel.innerHTML = '<div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">Eraser</span></div>';
        return;
    }

    const block = BLOCK_DEFS[id];
    if (!block) return;

    // Helper for rows
    const addRow = (label, value) => {
        const row = document.createElement('div');
        row.className = 'detail-row';
        row.innerHTML = `<span class="detail-label">${label}</span><span class="detail-value">${value}</span>`;
        panel.appendChild(row);
    };

    addRow('Name', block.name);
    addRow('Slide', block.slideFactor || 0.8);
    if (block.z) addRow('Elevation', `+${block.z}`);
    if (block.damage) addRow('Damage', block.damage);
    if (block.heal) addRow('Heal', block.heal);

    // Tags
    if (block.solid) panel.innerHTML += '<span class="detail-tag tag-solid">SOLID</span>';
    else panel.innerHTML += '<span class="detail-tag tag-passable">PASSABLE</span>';

    if (block.enemyBlocked) panel.innerHTML += ' <span class="detail-tag tag-solid">BLOCKS ENEMY</span>';
    if (block.damage) panel.innerHTML += ' <span class="detail-tag tag-hazard">HAZARD</span>';
    if (block.heal) panel.innerHTML += ' <span class="detail-tag tag-heal">HEAL</span>';
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
                // Draw texture from sprite sheet
                ctx.drawImage(
                    texture.image,
                    texture.sx, texture.sy, texture.sw, texture.sh,
                    x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE
                );
            } else {
                // Fall back to color
                ctx.fillStyle = block.color;
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    ctx.globalAlpha = 1;

    // Draw Attribute Overlays
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            const tile = mapData[y]?.[x];
            if (!tile) continue;

            const px = x * TILE_SIZE;
            const py = y * TILE_SIZE;

            if (tile.isArtifactSpot) {
                ctx.strokeStyle = '#ff0000'; // Red
                ctx.lineWidth = 3;
                ctx.strokeRect(px + 1.5, py + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);

                // Small dot in corner
                ctx.fillStyle = '#ff0000';
                ctx.beginPath();
                ctx.arc(px + TILE_SIZE - 6, py + 6, 3, 0, Math.PI * 2);
                ctx.fill();
            }

            if (tile.isTreasure) {
                ctx.strokeStyle = '#ffd700'; // Gold
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 3]);
                ctx.strokeRect(px + 1.5, py + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
                ctx.setLineDash([]);
            }

            if (tile.isExit) {
                ctx.strokeStyle = '#00ff00'; // Green
                ctx.lineWidth = 3;
                ctx.strokeRect(px + 1.5, py + 1.5, TILE_SIZE - 3, TILE_SIZE - 3);
                ctx.fillStyle = '#00ff00';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('🚪', px + TILE_SIZE / 2, py + TILE_SIZE / 1.3);
            }

            // Draw Spawn Points
            if (tile.spawn) {
                ctx.lineWidth = 2;
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';

                if (tile.spawn === 'player') {
                    ctx.strokeStyle = '#00ffff';
                    ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    ctx.fillText('🟢', px + TILE_SIZE / 2, py + TILE_SIZE / 1.5);
                } else if (tile.spawn === 'ravager') {
                    ctx.strokeStyle = '#ff00ff';
                    ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    ctx.fillText('👿', px + TILE_SIZE / 2, py + TILE_SIZE / 1.5);
                } else if (tile.spawn === 'ghast') {
                    ctx.strokeStyle = '#aaaaaa';
                    ctx.strokeRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
                    ctx.fillText('👻', px + TILE_SIZE / 2, py + TILE_SIZE / 1.5);
                }
            }
        }
    }


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

        // ATTRIBUTE PAINTING MODE
        if (activeAttribute) {
            let tile = mapData[y][x];

            // Clearing Mode
            if (activeAttribute === 'clear') {
                delete tile.isArtifactSpot;
                delete tile.isTreasure;
                delete tile.isExit;
                delete tile.spawn;
                draw();
                scheduleAutoSave();
                return;
            }

            // Check if it's a SPAWN attribute (spawn:player)
            if (activeAttribute.startsWith('spawn:')) {
                const type = activeAttribute.split(':')[1];

                // Toggle: If inputting same spawn, remove it. Else, set it.
                if (tile.spawn === type) {
                    delete tile.spawn;
                } else {
                    tile.spawn = type;
                }
                draw();
                scheduleAutoSave();
                return;
            }

            // Boolean Attributes
            if (tile[activeAttribute]) {
                delete tile[activeAttribute];
            } else {
                tile[activeAttribute] = true;
            }

            draw();
            scheduleAutoSave();
            return;
        }

        // TILE PAINTING MODE
        const variants = getBlockVariants(tileId);
        // Randomize variant for painting (organic feel)
        const variant = variants.length > 0 ? variants[Math.floor(Math.random() * variants.length)] : 1;

        let newTile = { id: tileId, variant: variant };

        // Keep existing attributes when replacing tile
        let oldTile = mapData[y][x];
        if (oldTile.isArtifactSpot) newTile.isArtifactSpot = true;
        if (oldTile.isTreasure) newTile.isTreasure = true;
        if (oldTile.isExit) newTile.isExit = true;
        if (oldTile.spawn) newTile.spawn = oldTile.spawn;

        // Auto-apply Z level from definition
        const def = BLOCK_DEFS[tileId];
        if (def && def.z !== undefined) {
            newTile.z = def.z;
        }

        mapData[y][x] = newTile;
        draw();
        scheduleAutoSave();
    }
}
// Cycle through variants for existing tile (Shift+click)
function cycleVariant(x, y) {
    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
        const tile = mapData[y][x];
        if (!tile || tile.id === -1) return;

        const nextVariant = getNextVariant(tile.id, tile.variant);
        if (nextVariant !== tile.variant) {
            saveHistory(); // Save before changing
            mapData[y][x] = { id: tile.id, variant: nextVariant };
            draw();
            scheduleAutoSave();
        }
    }
}

// ===== Undo System =====
function saveHistory() {
    // Deep copy the mapData
    const snapshot = mapData.map(row => row.map(tile => ({ ...tile })));
    historyStack.push({
        map: snapshot,
        width: gridWidth,
        height: gridHeight
    });

    if (historyStack.length > 30) {
        historyStack.shift(); // Keep last 30 states
    }
    // console.log("History saved. Stack size:", historyStack.length);
}

function undo() {
    if (historyStack.length === 0) return;

    const lastState = historyStack.pop();

    // Restore Dimensions
    if (gridWidth !== lastState.width || gridHeight !== lastState.height) {
        gridWidth = lastState.width;
        gridHeight = lastState.height;
        gridWidthInput.value = gridWidth;
        gridHeightInput.value = gridHeight;
        resizeCanvas();
    }

    // Restore Map Data (Deep copy back to avoid ref issues if we redo later)
    mapData = lastState.map.map(row => row.map(tile => ({ ...tile })));

    draw();
    updateMapSizeDisplay();
    scheduleAutoSave();
}

// ===== Persistence (localStorage) =====
function scheduleAutoSave() {
    // Debounce auto-save to avoid excessive writes
    if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
    }
    autoSaveTimeout = setTimeout(() => {
        saveToLocalStorage();
    }, 1000); // Save 1 second after last change
}

function saveToLocalStorage() {
    try {
        const saveData = {
            version: 1,
            timestamp: Date.now(),
            gridWidth,
            gridHeight,
            mapData,
            // Save current settings
            settings: {
                selectedTileId,
                currentTool,
                showGrid,
                imageOpacity,
                blockOpacity,
                imageShiftX,
                imageShiftY
            }
        };
        localStorage.setItem(STORAGE_KEY_MAP, JSON.stringify(saveData));
        console.log('Map auto-saved to browser storage.');
    } catch (e) {
        console.warn('Failed to save map to localStorage:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY_MAP);
        if (!saved) return false;

        const data = JSON.parse(saved);
        if (!data || !data.mapData) return false;

        // Restore dimensions
        gridWidth = data.gridWidth || 40;
        gridHeight = data.gridHeight || 30;
        gridWidthInput.value = gridWidth;
        gridHeightInput.value = gridHeight;

        // Restore map data with validation
        mapData = data.mapData.map(row =>
            row.map(tile => {
                if (typeof tile === 'number') {
                    return { id: tile, variant: 1 };
                }
                return { variant: 1, ...tile };
            })
        );

        // Restore settings if available
        if (data.settings) {
            selectedTileId = data.settings.selectedTileId ?? 0;
            currentTool = data.settings.currentTool || 'paint';
            showGrid = data.settings.showGrid ?? true;
            imageOpacity = data.settings.imageOpacity ?? 0.5;
            blockOpacity = data.settings.blockOpacity ?? 0.5;
            imageShiftX = data.settings.imageShiftX || 0;
            imageShiftY = data.settings.imageShiftY || 0;

            // Update UI elements
            opacitySlider.value = imageOpacity * 100;
            opacityValue.textContent = `${Math.round(imageOpacity * 100)}%`;
            blockOpacitySlider.value = blockOpacity * 100;
            blockOpacityValue.textContent = `${Math.round(blockOpacity * 100)}%`;
            gridToggle.checked = showGrid;
            shiftXInput.value = imageShiftX;
            shiftYInput.value = imageShiftY;

            // Update tool button selection
            const tools = ['paint', 'fill', 'pick', 'erase'];
            tools.forEach(t => {
                const btn = document.getElementById(`tool-${t}`);
                if (btn) btn.classList.toggle('active', t === currentTool);
            });
        }

        const savedDate = new Date(data.timestamp);
        console.log(`Restored map from browser storage (saved: ${savedDate.toLocaleString()})`);
        return true;
    } catch (e) {
        console.warn('Failed to load map from localStorage:', e);
        return false;
    }
}

function clearLocalStorage() {
    localStorage.removeItem(STORAGE_KEY_MAP);
    console.log('Map data cleared from browser storage.');
}

// ===== Flood Fill =====
function performFloodFill(startX, startY, replacementId) {
    if (startX < 0 || startX >= gridWidth || startY < 0 || startY >= gridHeight) return;

    const targetId = mapData[startY][startX].id;
    if (targetId === replacementId) return; // Nothing to do

    saveHistory(); // Save before fill

    // Stack-based recursive fill
    const stack = [{ x: startX, y: startY }];

    // Safety break
    let iterations = 0;
    const maxIterations = gridWidth * gridHeight * 2;

    while (stack.length > 0 && iterations < maxIterations) {
        iterations++;
        const { x, y } = stack.pop();

        if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) continue;

        const currentTile = mapData[y][x];
        if (currentTile.id !== targetId) continue;

        // Replace Tile
        // Use random variant if available for organic look
        const variants = getBlockVariants(replacementId);
        const variant = variants.length > 0 ? variants[Math.floor(Math.random() * variants.length)] : 1;

        mapData[y][x] = { ...currentTile, id: replacementId, variant: variant }; // Preserve other props? Or wipe them? 
        // Logic check: "placeTile" usually wipes ID but keeps attrs. Let's keep attrs.

        // Add neighbors
        stack.push({ x: x + 1, y: y });
        stack.push({ x: x - 1, y: y });
        stack.push({ x: x, y: y + 1 });
        stack.push({ x: x, y: y - 1 });
    }

    draw();
    scheduleAutoSave();
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Canvas events
    canvas.addEventListener('mousedown', (e) => {
        // Spacebar panning mode
        if (isSpaceDown) {
            isPanning = true;
            panStartX = e.clientX;
            panStartY = e.clientY;
            scrollStartX = canvasContainer.scrollLeft;
            scrollStartY = canvasContainer.scrollTop;
            canvas.style.cursor = 'grabbing';
            return;
        }

        const { x, y } = getTileCoords(e);

        // Shift+click to cycle variants
        if (e.shiftKey) {
            cycleVariant(x, y);
            return;
        }

        // Flood Fill
        if (currentTool === 'fill' && !e.ctrlKey && activeAttribute === null) {
            const tileId = (e.button === 2) ? -1 : selectedTileId;
            performFloodFill(x, y, tileId);
            return;
        }

        // Pick Tool
        if (currentTool === 'pick' && !e.ctrlKey) {
            const tile = mapData[y]?.[x];
            if (tile) {
                selectTile(tile.id);
                // Auto-switch back to paint for convenience
                document.getElementById('tool-paint').click();
            }
            return;
        }

        // Painting (Save History only once per stroke)
        if (!activeAttribute && !isPainting) { // Only save if not already painting
            saveHistory();
        }

        isPainting = true;
        // Right click or Ctrl+click to erase (or if tool is erase)
        let tileId;
        if (currentTool === 'erase' || e.button === 2 || e.ctrlKey) {
            tileId = -1;
        } else {
            tileId = selectedTileId;
        }

        placeTile(x, y, tileId);
    });

    canvas.addEventListener('mousemove', (e) => {
        // Handle panning
        if (isPanning && isSpaceDown) {
            const dx = e.clientX - panStartX;
            const dy = e.clientY - panStartY;
            canvasContainer.scrollLeft = scrollStartX - dx;
            canvasContainer.scrollTop = scrollStartY - dy;
            return;
        }

        const { x, y } = getTileCoords(e);
        cursorPos.textContent = `Tile: (${x}, ${y})`;

        if (isPainting && !e.shiftKey && !isSpaceDown) {
            let tileId;
            if (currentTool === 'erase' || e.ctrlKey) {
                tileId = -1;
            } else if (currentTool === 'paint') {
                tileId = selectedTileId;
            } else {
                return; // Don't drag-paint in fill mode
            }
            placeTile(x, y, tileId);
        }
    });

    canvas.addEventListener('mouseup', () => {
        isPainting = false;
        if (isSpaceDown) {
            canvas.style.cursor = 'grab';
        }
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

    // Undo
    undoBtn.addEventListener('click', undo);

    // Keyboard
    window.addEventListener('keydown', (e) => {
        // Prevent default for zoom keys when focused on canvas area
        if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === ' ') {
            // Only prevent if not in an input field
            if (document.activeElement.tagName !== 'INPUT') {
                e.preventDefault();
            }
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
            undo();
        }

        // Zoom controls (+/- keys)
        if (!e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
            if (e.key === '+' || e.key === '=') {
                zoomIn();
            }
            if (e.key === '-' || e.key === '_') {
                zoomOut();
            }
            // Reset zoom with 0
            if (e.key === '0') {
                resetZoom();
            }
        }

        // Spacebar for panning
        if (e.key === ' ' && !isSpaceDown && document.activeElement.tagName !== 'INPUT') {
            isSpaceDown = true;
            canvas.style.cursor = 'grab';
        }

        // Tool Shortcuts
        if (!e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
            if (e.key.toLowerCase() === 'p') document.getElementById('tool-paint').click();
            if (e.key.toLowerCase() === 'f') document.getElementById('tool-fill').click();
            if (e.key.toLowerCase() === 'e') document.getElementById('tool-erase').click();
            if (e.key.toLowerCase() === 'i') document.getElementById('tool-pick').click();
        }
    });

    // Keyup for spacebar release
    window.addEventListener('keyup', (e) => {
        if (e.key === ' ') {
            isSpaceDown = false;
            isPanning = false;
            canvas.style.cursor = 'crosshair';
        }
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

    // Tool Buttons
    const tools = ['paint', 'fill', 'pick', 'erase'];
    tools.forEach(t => {
        document.getElementById(`tool-${t}`).addEventListener('click', () => {
            currentTool = t;
            // Update UI
            tools.forEach(ut => document.getElementById(`tool-${ut}`).classList.toggle('active', ut === t));

            // Disable Attributes if selecting tool
            activeAttribute = null;
            document.querySelectorAll('.attr-btn').forEach(b => b.classList.remove('active'));
        });
    });

    confirmYes.addEventListener('click', () => {
        initMap();
        clearLocalStorage(); // Clear saved data when clearing map
        draw();
        confirmModal.classList.add('hidden');
    });

    confirmNo.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
    });

    // Save/Load
    saveBtn.addEventListener('click', saveMap);
    // export-js-btn listener removed
    loadBtn.addEventListener('click', () => loadInput.click());
    loadInput.addEventListener('change', handleLoadMap);

    // Attribute Buttons
    const attrButtons = document.querySelectorAll('.attr-btn');
    attrButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const attr = btn.dataset.attr;

            // If clearing, just set mode
            if (btn.id === 'clear-attr-btn') {
                activeAttribute = (activeAttribute === 'clear') ? null : 'clear';
            } else {
                // Toggle this attribute mode
                activeAttribute = (activeAttribute === attr) ? null : attr;
            }

            // If attribute mode is on, clear tool selection visually (but maybe default back to paint internally?)
            if (activeAttribute) {
                // Deselect all tools
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            }

            // Update UI
            attrButtons.forEach(b => b.classList.remove('active'));
            if (activeAttribute) {
                btn.classList.add('active');
                // Deselect tile to avoid confusion
                document.querySelectorAll('.tile-item').forEach(i => i.classList.remove('selected'));
            } else {
                // Reselect current tile
                selectTile(selectedTileId);
            }
        });
    });
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

    saveHistory(); // Save before resizing

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
    scheduleAutoSave();
}

function updateMapSizeDisplay() {
    mapSize.textContent = `Map: ${gridWidth} × ${gridHeight}`;
}

// ===== Save Map =====
function saveMap() {
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
            let hasAttr = tile.isArtifactSpot || tile.isTreasure || tile.isExit;
            let hasVariant = (tile.variant !== 1 && tile.variant !== undefined);

            if (hasZOverride || hasSpawn || hasAttr || hasVariant) {
                let out = { id: tile.id };
                if (hasVariant) out.variant = tile.variant;
                if (hasZOverride) out.z = tile.z;
                if (hasSpawn) out.spawn = tile.spawn;
                if (tile.isArtifactSpot) out.isArtifactSpot = true;
                if (tile.isTreasure) out.isTreasure = true;
                if (tile.isExit) out.isExit = true;
                return out;
            }

            return tile.id;
        })
    );

    // Compact Formatting: One row per line
    const mapString = '[\n' + simpleMap.map(row => {
        const rowString = row.map(cell => JSON.stringify(cell)).join(', ');
        return `    [${rowString}]`;
    }).join(',\n') + '\n]';

    const jsContent = `// js/data/map.js - Game Map Data
// Generated by Map Maker on ${new Date().toISOString()}

export const map = ${mapString};
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
            let content = event.target.result;
            let loadedData = null;

            // Detect JS file content by looking for the export statement
            if (content.includes('export const map =')) {
                // Extract the array part. 
                // We split by the export statement and take the second part.
                const parts = content.split('export const map =');
                if (parts.length > 1) {
                    let arrayString = parts[1].trim();
                    // Remove trailing semicolon if present
                    arrayString = arrayString.replace(/;\s*$/, '');

                    // Use new Function to safely evaluate the array structure
                    try {
                        loadedData = new Function('return ' + arrayString)();
                    } catch (e) {
                        console.error("Eval error:", e);
                        console.log("Failed content snippet:", arrayString.substring(0, 100) + "...");
                        throw new Error("Could not parse map array from JS file. Check console for details.");
                    }
                } else {
                    throw new Error("Found export statement but could not extract data.");
                }
            } else {
                // Fallback: Try analyzing as pure JSON
                if (!content.trim()) {
                    throw new Error("File is empty.");
                }
                loadedData = JSON.parse(content);
            }

            // Normalize Data Structure
            let newMapData = [];
            let newWidth = 0;
            let newHeight = 0;

            if (Array.isArray(loadedData)) {
                // JS Format (Direct Array)
                newHeight = loadedData.length;
                newWidth = loadedData[0]?.length || 0;
                newMapData = loadedData;
            } else if (loadedData && loadedData.tiles && Array.isArray(loadedData.tiles)) {
                // JSON Format (Object wrapper)
                newWidth = loadedData.width || loadedData.tiles[0]?.length || 40;
                newHeight = loadedData.height || loadedData.tiles.length || 30;
                newMapData = loadedData.tiles;
            } else {
                console.error("Loaded data:", loadedData);
                throw new Error("Unknown map format: Root element must be an Array or Map Object.");
            }

            // Update Global State
            gridWidth = newWidth;
            gridHeight = newHeight;
            gridWidthInput.value = gridWidth;
            gridHeightInput.value = gridHeight;

            // Convert and Validate Tiles
            mapData = newMapData.map(row =>
                row.map(tile => {
                    if (typeof tile === 'number') {
                        return { id: tile, variant: 1 };
                    }
                    // Ensure object structure has defaults
                    return { variant: 1, ...tile };
                })
            );

            resizeCanvas();
            updateMapSizeDisplay();
            draw();
            scheduleAutoSave(); // Persist loaded map to localStorage

            console.log('Map loaded successfully!');

        } catch (err) {
            console.error("Load Error:", err);
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
