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

const fileInput = document.getElementById('file-input');
const updateBtn = document.getElementById('update-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
const debugInfo = document.getElementById('debug-info');
const bgButtons = document.querySelectorAll('.bg-btn');

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
    bgColor: 'checkered' // Track background color
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
        bgColor: state.bgColor
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

    // Background color switcher
    bgButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            bgButtons.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');

            // Get the background type from data attribute
            const bgType = btn.dataset.bg;
            state.bgColor = bgType; // Track in state

            // Remove all bg-* classes from preview area
            previewArea.className = 'preview-area';
            // Add the selected background class
            previewArea.classList.add(`bg-${bgType}`);

            // Save to localStorage
            saveSettings();
        });
    });

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
        spritesheet = new Image();
        spritesheet.onload = () => {
            isLoaded = true;
            updateSettings(); // Recalculate based on new image
        };
        spritesheet.src = event.target.result;
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
        sheetCanvas.width = spritesheet.width;
        sheetCanvas.height = spritesheet.height;
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

    // Check bounds
    if (sx + state.w > spritesheet.width || sy + state.h > spritesheet.height) {
        // Out of bounds - draw error placeholder
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "red";
        ctx.font = "12px monospace";
        ctx.fillText("Out of Bounds", 10, 20);
        return;
    }

    ctx.drawImage(
        spritesheet,
        sx, sy, state.w, state.h,     // Source
        0, 0, canvas.width, canvas.height // Dest (scaled by canvas size)
    );

    // Grid overlay (optional, help visualize cell)
    // ctx.strokeStyle = "rgba(255,255,255,0.2)";
    // ctx.strokeRect(0,0, canvas.width, canvas.height);
}

function drawSheet() {
    sheetCtx.clearRect(0, 0, sheetCanvas.width, sheetCanvas.height);

    if (!isLoaded) return;

    sheetCtx.drawImage(spritesheet, 0, 0);

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
    sheetCtx.strokeRect(state.padX, sy, spritesheet.width - state.padX, state.h);
}

init();
