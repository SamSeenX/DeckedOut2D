
const videoUpload = document.getElementById('video-upload');
const uploadBtn = document.getElementById('upload-btn');
const videoPlayer = document.getElementById('video-player');
const videoMeta = document.getElementById('video-meta');
const capturedFramesList = document.getElementById('captured-frames-list');
const markFrameBtn = document.getElementById('mark-frame-btn');
const clearFramesBtn = document.getElementById('clear-frames-btn');
const exportBtn = document.getElementById('export-btn');
const sheetCanvas = document.getElementById('sheet-canvas');
const sheetCtx = sheetCanvas.getContext('2d');
const animCanvas = document.getElementById('animation-canvas');
const animCtx = animCanvas.getContext('2d');
const frameCountEl = document.getElementById('frame-count');

// Controls
const inputWidth = document.getElementById('sprite-width');
const inputHeight = document.getElementById('sprite-height');
const inputPadding = document.getElementById('sheet-padding');
const inputCols = document.getElementById('preview-cols');
const inputFps = document.getElementById('anim-fps');
const btnPlayAnim = document.getElementById('play-anim-btn');
const selectExportFormat = document.getElementById('export-format');

// State
let frames = []; // Array of objects { canvas: HTMLCanvasElement (Full Res), time: number, id: number }
let isAnimating = false;
let animFrameIndex = 0;
let lastAnimTime = 0;
let animInterval = 1000 / 10;
let animationId = null;

// Event Listeners
uploadBtn.addEventListener('click', () => videoUpload.click());

// Hotkeys
document.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'Enter') && !markFrameBtn.disabled) {
        // Prevent default only if we aren't focused on an input
        if (e.target.tagName !== 'INPUT') {
            e.preventDefault();
            captureFrame();
            // Optional: Visual feedback on button
            markFrameBtn.classList.add('active'); // You might need CSS for this or just rely on click effect
            setTimeout(() => markFrameBtn.classList.remove('active'), 100);
        }
    }
});

videoUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        videoPlayer.src = url;
        videoPlayer.load();

        videoPlayer.onloadedmetadata = () => {
            // Show detailed metadata
            videoMeta.innerHTML = `<strong>${videoPlayer.videoWidth}x${videoPlayer.videoHeight}px</strong> • ${formatTime(videoPlayer.duration)} • ${file.type || 'video'}`;

            enableControls();

            // Auto-set the target dimensions to match the source video
            inputWidth.value = videoPlayer.videoWidth;
            inputHeight.value = videoPlayer.videoHeight;

            // If we have frames already (rare on new load, but possible if not cleared), update preview
            if (frames.length > 0) {
                updatePreview();
            }
        };
    }
});

function enableControls() {
    markFrameBtn.disabled = false;
    clearFramesBtn.disabled = false;
}

markFrameBtn.addEventListener('click', captureFrame);

clearFramesBtn.addEventListener('click', () => {
    if (confirm('Clear all captured frames?')) {
        frames = [];
        updateTimeline();
        updatePreview();
    }
});

// Playback Step Controls
document.getElementById('step-back').addEventListener('click', () => {
    videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 1);
});
document.getElementById('step-fwd').addEventListener('click', () => {
    videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 1);
});
document.getElementById('step-frame-back').addEventListener('click', () => {
    // Approx frame step (assuming 30 or 60 fps, 0.033 is ~30fps)
    videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 0.033);
});
document.getElementById('step-frame-fwd').addEventListener('click', () => {
    videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 0.033);
});

videoPlayer.addEventListener('timeupdate', () => {
    document.getElementById('current-time').textContent = formatTime(videoPlayer.currentTime);
});

async function captureFrame() {
    if (!videoPlayer.src) return;

    // Capture at FULL resolution
    const canvas = document.createElement('canvas');
    canvas.width = videoPlayer.videoWidth;
    canvas.height = videoPlayer.videoHeight;
    const ctx = canvas.getContext('2d');

    // Draw full size
    ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);

    const frameObj = {
        canvas: canvas, // Storing full res
        time: videoPlayer.currentTime,
        id: Date.now()
    };

    frames.push(frameObj);

    // Sort by time so the sprite sheet matches video progression
    frames.sort((a, b) => a.time - b.time);

    updateTimeline();
    updatePreview();
}

function updateTimeline() {
    capturedFramesList.innerHTML = '';
    frameCountEl.textContent = frames.length;

    if (frames.length === 0) {
        capturedFramesList.innerHTML = '<div class="empty-state">No frames marked yet</div>';
        exportBtn.disabled = true;
        return;
    }

    exportBtn.disabled = false;

    // We only create thumbnails for the UI to save DOM weight
    frames.forEach((frame, index) => {
        const div = document.createElement('div');
        div.className = 'captured-frame';
        div.title = `Frame ${index + 1} at ${formatTime(frame.time)}`;

        // Create a small thumbnail canvas (e.g. width 80px matching CSS)
        // Maintain aspect ratio
        const thumbW = 80;
        const aspect = frame.canvas.width / frame.canvas.height;
        const thumbH = thumbW / aspect;

        const thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = thumbW;
        thumbCanvas.height = thumbH;
        // Draw entire source to thumbnail
        thumbCanvas.getContext('2d').drawImage(frame.canvas, 0, 0, frame.canvas.width, frame.canvas.height, 0, 0, thumbW, thumbH);

        div.appendChild(thumbCanvas);

        const timeLabel = document.createElement('div');
        timeLabel.className = 'frame-time';
        timeLabel.textContent = index + 1; // Just show index
        div.appendChild(timeLabel);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-frame';
        removeBtn.textContent = '×';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            frames.splice(index, 1);
            updateTimeline();
            updatePreview();
        };
        div.appendChild(removeBtn);

        capturedFramesList.appendChild(div);
    });
}

function updatePreview() {
    if (frames.length === 0) {
        sheetCanvas.width = 0;
        sheetCanvas.height = 0;
        return;
    }

    // Get current target settings
    // This allows resizing ALL frames instantly by changing the input
    const targetW = parseInt(inputWidth.value) || 64;
    const targetH = parseInt(inputHeight.value) || 64;
    const cols = parseInt(inputCols.value) || 5;
    const padding = parseInt(inputPadding.value) || 0;
    const rows = Math.ceil(frames.length / cols);

    const sheetW = (targetW * cols) + (padding * (cols - 1));
    const sheetH = (targetH * rows) + (padding * (rows - 1));

    sheetCanvas.width = sheetW;
    sheetCanvas.height = sheetH;

    // Clear
    sheetCtx.clearRect(0, 0, sheetW, sheetH);
    // Disable smoothing for pixel art look, or enable for smoother downscale?
    // "DeckedOut2D" implies pixel art. We'll keep it crisp.
    sheetCtx.imageSmoothingEnabled = false;

    frames.forEach((frame, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);

        const x = col * (targetW + padding);
        const y = row * (targetH + padding);

        // Draw from source (full res) to destination (target size)
        sheetCtx.drawImage(
            frame.canvas,
            0, 0, frame.canvas.width, frame.canvas.height, // Source Rect
            x, y, targetW, targetH // Dest Rect
        );
    });
}

// Watch for setting changes to update preview immediately
// Now inputWidth and inputHeight also trigger updates!
[inputWidth, inputHeight, inputPadding, inputCols].forEach(input => {
    input.addEventListener('change', updatePreview);
});

// Animation Preview
btnPlayAnim.addEventListener('click', toggleAnimation);
inputFps.addEventListener('change', () => {
    animInterval = 1000 / (parseInt(inputFps.value) || 10);
});

function toggleAnimation() {
    if (isAnimating) {
        isAnimating = false;
        btnPlayAnim.textContent = '▶ Play';
        cancelAnimationFrame(animationId);
    } else {
        if (frames.length === 0) return;
        isAnimating = true;
        btnPlayAnim.textContent = '⏹ Stop';
        animFrameIndex = 0;
        lastAnimTime = 0;
        requestAnimationFrame(animateLoop);
    }
}

function animateLoop(timestamp) {
    if (!isAnimating) return;

    if (timestamp - lastAnimTime >= animInterval) {
        lastAnimTime = timestamp;

        if (frames.length > 0) {
            const frame = frames[animFrameIndex];
            const targetW = parseInt(inputWidth.value) || 64;
            const targetH = parseInt(inputHeight.value) || 64;

            animCanvas.width = targetW;
            animCanvas.height = targetH;

            animCtx.clearRect(0, 0, animCanvas.width, animCanvas.height);
            animCtx.imageSmoothingEnabled = false;

            animCtx.drawImage(
                frame.canvas,
                0, 0, frame.canvas.width, frame.canvas.height,
                0, 0, targetW, targetH
            );

            animFrameIndex = (animFrameIndex + 1) % frames.length;
        }
    }

    animationId = requestAnimationFrame(animateLoop);
}

// Export
exportBtn.addEventListener('click', () => {
    if (frames.length === 0) return;

    const format = selectExportFormat.value; // png or webp
    const mime = format === 'webp' ? 'image/webp' : 'image/png';

    const link = document.createElement('a');
    link.download = `spritesheet.${format}`;
    link.href = sheetCanvas.toDataURL(mime);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Helper
function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
