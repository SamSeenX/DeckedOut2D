const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d');
const sheetCanvas = document.getElementById('sheet-canvas');
const sheetCtx = sheetCanvas.getContext('2d');
const previewArea = document.getElementById('preview-area');
const frameCounter = document.getElementById('frame-counter');

// Overlay Controls
const overlayPrevBtn = document.getElementById('overlay-prev-btn');
const overlayPlayBtn = document.getElementById('overlay-play-btn');
const overlayNextBtn = document.getElementById('overlay-next-btn');

// Tool Controls
const toolPaint = document.getElementById('tool-paint');
const toolEraser = document.getElementById('tool-eraser');
const toolPicker = document.getElementById('tool-picker');
const toolOnion = document.getElementById('tool-onion');
const colorPicker = document.getElementById('color-picker');
const colorHex = document.getElementById('color-hex');
const savePngBtn = document.getElementById('save-png');
const saveWebpBtn = document.getElementById('save-webp');

const fileInput = document.getElementById('file-input');
const updateBtn = document.getElementById('update-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
const debugInfo = document.getElementById('debug-info');
const bgButtons = document.querySelectorAll('.bg-btn');

// Master Canvas (Source of Truth)
const masterCanvas = document.createElement('canvas');
const masterCtx = masterCanvas.getContext('2d', { willReadFrequently: true });

// Inputs
const inputWidth = document.getElementById('cell-width');
const inputHeight = document.getElementById('cell-height');
const inputRow = document.getElementById('anim-row');
const inputPadX = document.getElementById('pad-x');
const inputPadY = document.getElementById('pad-y');
const inputFrames = document.getElementById('frame-count');
const inputFps = document.getElementById('fps');
const inputScale = document.getElementById('scale');

// Storage key for localStorage
const STORAGE_KEY = 'spritePreviewSettings';

let spritesheet = new Image();
let isLoaded = false;
let isPlaying = true;
let lastTime = 0;
let timer = 0;
let currentFrame = 0;

// State to render
let state = {
    w: 32,
    h: 32,
    row: 0,
    frames: 0, // 0 means auto-detect
    fps: 8,
    scale: 4,
    padX: 0,
    padY: 0,
    detectedFrames: 0,
    bgColor: 'checkered', // Track background color
    activeTool: 'paint', // paint, eraser, picker
    activeColor: '#ffffff',
    isDrawing: false,
    onionSkin: false,
    offsetX: 0,
    offsetY: 0,
    isPanning: false,
    offsetX: 0,
    offsetY: 0,
    isPanning: false,
    startPanX: 0,
    startPanY: 0,
    brushSize: 1,
    hoverX: null,
    hoverY: null
};

// Save settings to localStorage
function saveSettings() {
    const settings = {
        w: state.w,
        h: state.h,
        row: state.row,
        frames: state.frames,
        fps: state.fps,
        scale: state.scale,
        padX: state.padX,
        padY: state.padY,
        bgColor: state.bgColor,
        onionSkin: state.onionSkin
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.warn('Could not save settings to localStorage:', e);
    }
}

// Load settings from localStorage
function loadSettings() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const settings = JSON.parse(saved);

            // Apply saved values to state
            state.w = settings.w ?? 32;
            state.h = settings.h ?? 32;
            state.row = settings.row ?? 0;
            state.frames = settings.frames ?? 0;
            state.fps = settings.fps ?? 8;
            state.scale = settings.scale ?? 4;
            state.padX = settings.padX ?? 0;
            state.padY = settings.padY ?? 0;
            state.bgColor = settings.bgColor ?? 'checkered';
            state.onionSkin = settings.onionSkin ?? false;

            // Update UI
            if (state.onionSkin) {
                toolOnion.classList.add('active');
            }

            // Update input fields
            inputWidth.value = state.w;
            inputHeight.value = state.h;
            inputRow.value = state.row;
            inputFrames.value = state.frames;
            inputFps.value = state.fps;
            inputScale.value = state.scale;
            inputPadX.value = state.padX;
            inputPadY.value = state.padY;

            // Apply background color
            bgButtons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.bg === state.bgColor) {
                    btn.classList.add('active');
                }
            });
            previewArea.className = 'preview-area';
            previewArea.classList.add(`bg-${state.bgColor}`);
        }
    } catch (e) {
        console.warn('Could not load settings from localStorage:', e);
    }
}

function init() {
    // Load saved settings first
    loadSettings();

    fileInput.addEventListener('change', handleFileSelect);
    updateBtn.addEventListener('click', updateSettings);
    playPauseBtn.addEventListener('click', togglePlay);

    // Overlay Control Listeners
    overlayPlayBtn.addEventListener('click', togglePlay);
    overlayNextBtn.addEventListener('click', () => {
        pause(); // Pause when stepping manually
        nextFrame();
    });
    overlayPrevBtn.addEventListener('click', () => {
        pause(); // Pause when stepping manually
        prevFrame();
    });

    // Auto-update on input changes? Maybe annoying if typing numbers.
    // Let's stick to update button for now, or blur events.
    [inputWidth, inputHeight, inputRow, inputPadX, inputPadY, inputFps, inputScale, inputFrames].forEach(inp => {
        inp.addEventListener('change', updateSettings);
    });

    // Helper to set background
    function setBackground(bgType) {
        state.bgColor = bgType;

        // Update Buttons
        bgButtons.forEach(b => {
            if (b.dataset.bg === bgType) b.classList.add('active');
            else b.classList.remove('active');
        });

        // Update Preview
        previewArea.className = 'preview-area';
        previewArea.classList.add(`bg-${bgType}`);

        saveSettings();
    }

    // Background color switcher
    bgButtons.forEach(btn => {
        btn.addEventListener('click', () => setBackground(btn.dataset.bg));
    });

    // Tool Selectors
    function activateTool(tool) {
        state.activeTool = tool;
        [toolPaint, toolEraser, toolPicker].forEach(btn => btn.classList.remove('active'));
        if (tool === 'paint') toolPaint.classList.add('active');
        if (tool === 'eraser') toolEraser.classList.add('active');
        if (tool === 'picker') toolPicker.classList.add('active');
    }

    toolPaint.addEventListener('click', () => activateTool('paint'));
    toolEraser.addEventListener('click', () => activateTool('eraser'));
    toolPicker.addEventListener('click', () => activateTool('picker'));

    // Onion Skin
    function toggleOnionSkin() {
        state.onionSkin = !state.onionSkin;
        if (state.onionSkin) toolOnion.classList.add('active');
        else toolOnion.classList.remove('active');
        saveSettings();
        if (!isPlaying) draw(); // Redraw immediately if paused
    }
    toolOnion.addEventListener('click', toggleOnionSkin);

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in inputs
        if (e.target.tagName === 'INPUT') return;

        const key = e.key.toLowerCase();
        if (key === 'o') toggleOnionSkin();
        if (key === 'b') activateTool('paint');
        if (key === 'e') activateTool('eraser');
        if (key === 'i') activateTool('picker');

        // Background Shortcuts (1-7)
        if (key >= '1' && key <= '7') {
            const bgMap = ['checkered', 'black', 'white', 'gray', 'red', 'green', 'blue'];
            setBackground(bgMap[parseInt(key) - 1]);
        }

        // Zoom
        if (key === '=' || key === '+') {
            state.scale = Math.min(20, state.scale + 1);
            inputScale.value = state.scale;
            updateSettings();
        }
        if (key === '-' || key === '_') {
            state.scale = Math.max(1, state.scale - 1);
            inputScale.value = state.scale;
            updateSettings();
        }

        // Play/Pause (Moved to Enter)
        if (key === 'enter') {
            e.preventDefault();
            togglePlay();
        }

        // Pan Mode (Space Hold)
        if (key === ' ' && !state.isPanning) {
            e.preventDefault();
            state.isPanning = true;
            canvas.style.cursor = 'grab';
        }

        // Arrow Control
        if (key === 'arrowleft') {
            e.preventDefault();
            pause();
            prevFrame();
        }
        if (key === 'arrowright') {
            e.preventDefault();
            pause();
            nextFrame();
        }
        if (key === 'arrowup') {
            e.preventDefault();
            if (!isPlaying) {
                togglePlay();
            } else {
                state.fps = Math.min(60, state.fps + 1);
                inputFps.value = state.fps;
                updateDebugInfo();
                saveSettings();
            }
        }
        if (key === 'arrowdown') {
            e.preventDefault();
            if (!isPlaying) {
                togglePlay();
            } else {
                state.fps = Math.max(1, state.fps - 1);
                inputFps.value = state.fps;
                updateDebugInfo();
                saveSettings();
            }
        }

        // Brush Size
        if (key === '[') {
            state.brushSize = Math.max(1, state.brushSize - 1);
        }
        if (key === ']') {
            state.brushSize = Math.min(10, state.brushSize + 1);
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === ' ') {
            state.isPanning = false;
            state.isPanningDrag = false;
            canvas.style.cursor = 'default';
        }
    });

    // Color Picker
    colorPicker.addEventListener('input', (e) => {
        state.activeColor = e.target.value;
        colorHex.textContent = state.activeColor;
    });

    // Canvas Interaction (Drawing)
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    // Save Buttons
    savePngBtn.addEventListener('click', () => downloadImage('png'));
    saveWebpBtn.addEventListener('click', () => downloadImage('webp'));

    // Apply initial canvas size from loaded settings
    canvas.width = state.w * state.scale;
    canvas.height = state.h * state.scale;

    updatePlayButtons();
    requestAnimationFrame(loop);
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            isLoaded = true;
            spritesheet = img; // Keep ref just in case

            // Initialize Master Canvas
            masterCanvas.width = img.width;
            masterCanvas.height = img.height;
            masterCtx.drawImage(img, 0, 0);

            updateSettings(); // Recalculate based on new image
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function updateSettings() {
    state.w = parseInt(inputWidth.value) || 32;
    state.h = parseInt(inputHeight.value) || 32;
    state.row = parseInt(inputRow.value) || 0;
    state.padX = parseInt(inputPadX.value) || 0;
    state.padY = parseInt(inputPadY.value) || 0;
    state.frames = parseInt(inputFrames.value) || 0;
    state.fps = parseInt(inputFps.value) || 8;
    state.scale = parseInt(inputScale.value) || 1;

    // Resize Main Canvas
    canvas.width = state.w * state.scale;
    canvas.height = state.h * state.scale;

    // Resize Sheet Canvas
    if (isLoaded) {
        // Ensure master canvas is correct size if needed (usually handled on load)
        if (masterCanvas.width !== spritesheet.width) {
            masterCanvas.width = spritesheet.width;
            masterCanvas.height = spritesheet.height;
            masterCtx.drawImage(spritesheet, 0, 0);
        }

        sheetCanvas.width = masterCanvas.width;
        sheetCanvas.height = masterCanvas.height;
    }

    // Auto-detect max frames in this row if 0
    if (isLoaded && state.frames === 0) {
        // Effective width available after padding
        const effectiveWidth = spritesheet.width - state.padX;
        const maxCols = Math.floor(effectiveWidth / state.w);
        state.detectedFrames = Math.max(0, maxCols);
    } else if (state.frames > 0) {
        state.detectedFrames = state.frames; // Use manual override
    }

    // Reset animation
    currentFrame = 0;
    timer = 0;
    if (frameCounter) frameCounter.textContent = `Frame: ${currentFrame}`;

    updateDebugInfo();

    // Save settings to localStorage
    saveSettings();
}

function updateDebugInfo() {
    if (!isLoaded) {
        debugInfo.innerHTML = "No Image Loaded.";
        return;
    }
    const totalFrames = state.frames > 0 ? state.frames : state.detectedFrames;
    debugInfo.innerHTML = `
        Sheet: ${spritesheet.width}x${spritesheet.height}<br>
        Cell: ${state.w}x${state.h}<br>
        Padding: ${state.padX}, ${state.padY}<br>
        Row: ${state.row}<br>
        Frames: ${totalFrames} @ ${state.fps}fps
    `;
}

function togglePlay() {
    isPlaying = !isPlaying;
    updatePlayButtons();
}

function pause() {
    isPlaying = false;
    updatePlayButtons();
}

function updatePlayButtons() {
    const text = isPlaying ? "⏸ Pause" : "▶ Play";
    const icon = isPlaying ? "⏸" : "▶";
    playPauseBtn.textContent = text;
    if (overlayPlayBtn) overlayPlayBtn.textContent = icon;
}

function nextFrame() {
    if (!isLoaded) return;
    const maxFrames = state.frames > 0 ? state.frames : state.detectedFrames;
    if (maxFrames === 0) return;

    currentFrame++;
    if (currentFrame >= maxFrames) currentFrame = 0;

    if (frameCounter) frameCounter.textContent = `Frame: ${currentFrame}`;
}

function prevFrame() {
    if (!isLoaded) return;
    const maxFrames = state.frames > 0 ? state.frames : state.detectedFrames;
    if (maxFrames === 0) return;

    currentFrame--;
    if (currentFrame < 0) currentFrame = maxFrames - 1;

    if (frameCounter) frameCounter.textContent = `Frame: ${currentFrame}`;
}

function loop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    if (isLoaded && isPlaying) {
        const interval = 1000 / state.fps;
        timer += dt;

        if (timer > interval) {
            timer = 0; // or timer -= interval to preserve drift
            currentFrame++;

            const maxFrames = state.frames > 0 ? state.frames : state.detectedFrames;
            if (currentFrame >= maxFrames) {
                currentFrame = 0;
            }
            if (frameCounter) frameCounter.textContent = `Frame: ${currentFrame}`;
        }
    }

    draw();
    drawSheet(); // render the sheet preview
    requestAnimationFrame(loop);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear is important if transparency

    if (!isLoaded) {
        ctx.fillStyle = "#333";
        ctx.font = "16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Load an image", canvas.width / 2, canvas.height / 2);
        return;
    }

    // Disable smoothing for pixel art
    ctx.imageSmoothingEnabled = false;

    // Calculate source with Padding
    const sx = state.padX + (currentFrame * state.w);
    const sy = state.padY + (state.row * state.h);

    // --- Onion Skin Layer ---
    if (state.onionSkin) {
        const maxFrames = state.frames > 0 ? state.frames : state.detectedFrames;
        // Wrap around logic
        let prevFrame = currentFrame - 1;
        if (prevFrame < 0) prevFrame = maxFrames - 1;

        if (maxFrames > 1) {
            const prevSx = state.padX + (prevFrame * state.w);
            const prevSy = sy; // Same row

            // Check bounds for previous frame
            if (prevSx + state.w <= masterCanvas.width && prevSy + state.h <= masterCanvas.height) {
                ctx.globalAlpha = 0.5;
                ctx.drawImage(
                    masterCanvas,
                    prevSx, prevSy, state.w, state.h,
                    0, 0, canvas.width, canvas.height
                );
                ctx.globalAlpha = 1.0;
            }
        }
    }

    // Check bounds
    if (sx + state.w > masterCanvas.width || sy + state.h > masterCanvas.height) {
        // ... (bounds error logic remains same) ...
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "red";
        ctx.font = "12px monospace";
        ctx.fillText("Out of Bounds", 10, 20);
        return;
    }

    ctx.drawImage(
        masterCanvas,
        sx, sy, state.w, state.h,     // Source
        0, 0, canvas.width, canvas.height // Dest
    );

    // --- Cursor/Brush Overlay ---
    if (state.hoverX !== null && state.hoverY !== null && !state.isPanning) {
        if (state.activeTool === 'paint' || state.activeTool === 'eraser') {
            const bSize = state.brushSize;
            // Center the brush? Or top-left?
            // Usually paint tools are centered if odd, or top-left.
            // Let's do Standard Top-Left or Centered logic.
            // Let's do Centered.
            const offset = Math.floor(bSize / 2);
            const drawX = (state.hoverX - offset) * state.scale;
            const drawY = (state.hoverY - offset) * state.scale;
            const drawSize = bSize * state.scale;
            const centerX = drawX + (drawSize / 2);
            const centerY = drawY + (drawSize / 2);
            const radius = drawSize / 2;

            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(0,0,0,0.5)";
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255,255,255,0.8)";
            ctx.stroke();
        }
    }

    // Grid overlay (optional, help visualize cell)
    // ctx.strokeStyle = "rgba(255,255,255,0.2)";
    // ctx.strokeRect(0,0, canvas.width, canvas.height);
}

function drawSheet() {
    sheetCtx.clearRect(0, 0, sheetCanvas.width, sheetCanvas.height);

    if (!isLoaded) return;

    sheetCtx.drawImage(masterCanvas, 0, 0);

    // Draw Highlight with Padding
    const sx = state.padX + (currentFrame * state.w);
    const sy = state.padY + (state.row * state.h);

    // Highlight Current Frame
    sheetCtx.strokeStyle = "#00bcd4";
    sheetCtx.lineWidth = 2;
    sheetCtx.strokeRect(sx, sy, state.w, state.h);

    // Highlight Current Row (accounting for padding)
    sheetCtx.strokeStyle = "rgba(0, 188, 212, 0.3)";
    sheetCtx.lineWidth = 1;
    // Highlight the row starting from padX
    sheetCtx.strokeRect(state.padX, sy, masterCanvas.width - state.padX, state.h);
}

// --- Interaction / Editing ---

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
}

function handleMouseDown(e) {
    if (!isLoaded) return;

    // Pan Mode Start
    if (state.isPanning) {
        state.isPanningDrag = true;
        state.startPanX = e.clientX;
        state.startPanY = e.clientY;
        canvas.style.cursor = 'grabbing';
        return;
    }

    // Draw Mode Start
    state.isDrawing = true;
    handleMouseMove(e); // Draw immediately
}

function handleMouseUp(e) {
    state.isDrawing = false;
    if (state.isPanningDrag) {
        state.isPanningDrag = false;
        canvas.style.cursor = 'grab';
    }
}

function handleMouseMove(e) {
    if (!isLoaded) return;

    // Panning Logic
    if (state.isPanningDrag) {
        const dx = e.clientX - state.startPanX;
        const dy = e.clientY - state.startPanY;
        state.offsetX += dx;
        state.offsetY += dy;
        state.startPanX = e.clientX;
        state.startPanY = e.clientY;
        updateCanvasTransform();
        return; // Skip drawing logic if panning
    }

    const pos = getMousePos(e);

    // Map Canvas Pos -> Pixel in Frame
    const pixelX = Math.floor(pos.x / state.scale);
    const pixelY = Math.floor(pos.y / state.scale);

    // Update Hover State (for cursor drawing)
    if (pixelX >= 0 && pixelX < state.w && pixelY >= 0 && pixelY < state.h) {
        state.hoverX = pixelX;
        state.hoverY = pixelY;
        // Hide default cursor if painting
        if (state.activeTool === 'paint' || state.activeTool === 'eraser') {
            canvas.style.cursor = 'none';
        } else {
            canvas.style.cursor = 'default';
        }
    } else {
        state.hoverX = null;
        state.hoverY = null;
        canvas.style.cursor = 'default';
    }

    // Tool Check
    if (!state.isDrawing && state.activeTool !== 'picker') return;
    if (state.activeTool === 'picker' && !state.isDrawing) return;

    // If out of cell bounds, ignore
    if (state.hoverX === null) return;

    // Map Pixel in Frame -> Pixel in Sheet
    const sheetX = state.padX + (currentFrame * state.w) + pixelX;
    const sheetY = state.padY + (state.row * state.h) + pixelY;

    if (sheetX >= masterCanvas.width || sheetY >= masterCanvas.height) return;

    performToolAction(sheetX, sheetY);
}

function performToolAction(centerX, centerY) {
    if (state.activeTool === 'picker') {
        const p = masterCtx.getImageData(centerX, centerY, 1, 1).data;
        // Convert to hex
        const hex = rgbToHex(p[0], p[1], p[2]);
        state.activeColor = hex;
        colorPicker.value = hex;
        colorHex.textContent = hex;
        // Stop drawing after pick? Maybe.
        state.isDrawing = false;

        // Switch back to paint? optional. Let's stay in picker.
        return;
    }

    const bSize = state.brushSize;
    const offset = Math.floor(bSize / 2);

    for (let i = 0; i < bSize; i++) {
        for (let j = 0; j < bSize; j++) {
            const x = centerX - offset + i;
            const y = centerY - offset + j;

            if (state.activeTool === 'paint') {
                masterCtx.fillStyle = state.activeColor;
                masterCtx.fillRect(x, y, 1, 1);
            } else if (state.activeTool === 'eraser') {
                masterCtx.clearRect(x, y, 1, 1);
            }
        }
    }
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function updateCanvasTransform() {
    canvas.style.transform = `translate(${state.offsetX}px, ${state.offsetY}px)`;
}

function downloadImage(format) {
    if (!isLoaded) return;

    const link = document.createElement('a');
    link.download = `sprite_edited.${format}`;
    link.href = masterCanvas.toDataURL(`image/${format}`);
    link.click();
}

init();
