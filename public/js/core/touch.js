
import { keys } from './input.js';
import { TOUCH_LAYOUT } from '../data/config.js';

let isTouchEnabled = false;
let dpadId = null; // Track specific touch ID for dpad to avoid multi-touch confusion
const dpadRadius = 75; // Half of 150px
const stickRadius = 25; // Half of 50px
const maxDist = 50; // Max distance stick can move from center

export function initTouchControls() {
    // 1. Setup Toggle
    const toggle = document.getElementById('touch-toggle');
    const controls = document.getElementById('touch-controls');

    // Apply Configurable Positioning
    if (controls) {
        // Apply Layout from Config
        const layout = TOUCH_LAYOUT;

        // DPAD
        const dpadContainer = document.getElementById('dpad-container');
        if (dpadContainer) {
            dpadContainer.style.position = 'absolute';
            dpadContainer.style.left = layout.dpad.x + 'px';
            dpadContainer.style.bottom = layout.dpad.y + 'px';
            dpadContainer.style.width = layout.dpad.size + 'px';
            dpadContainer.style.height = layout.dpad.size + 'px';
            dpadContainer.style.margin = '0'; // clear CSS margins
        }

        // Buttons
        const mapping = {
            'jump': 'btn-jump',
            'sneak': 'btn-sneak',
            'eat': 'btn-eat',
            'check': 'btn-check'
        };

        for (const [key, id] of Object.entries(mapping)) {
            const el = document.getElementById(id);
            if (el && layout[key]) {
                el.style.position = 'absolute';
                el.style.right = layout[key].x + 'px'; // x is right offset
                el.style.bottom = layout[key].y + 'px';
                el.style.width = layout[key].size + 'px';
                el.style.height = layout[key].size + 'px';
                el.style.margin = '0';
                el.style.fontSize = (layout[key].size * 0.4) + 'px'; // Scale icon
            }
        }
    }

    // Detect Mobile (User Agent Only - no width check)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Load saved preference?
    const saved = localStorage.getItem('dungeonoutcast_touch_enabled');

    if (saved !== null) {
        // Use user's manual preference
        isTouchEnabled = (saved === 'true');
    } else {
        // No preference saved, default based on device
        isTouchEnabled = isMobile;
    }

    toggle.checked = isTouchEnabled;

    toggle.addEventListener('change', (e) => {
        isTouchEnabled = e.target.checked;
        localStorage.setItem('dungeonoutcast_touch_enabled', isTouchEnabled);
    });

    // Prevent click from bubbling to Start Overlay (which starts game)
    toggle.addEventListener('click', (e) => e.stopPropagation());
    // Also the label needs it if the user clicks the text
    toggle.parentElement.addEventListener('click', (e) => e.stopPropagation());

    // 2. Setup D-Pad
    const dpadBase = document.getElementById('dpad-base');
    const dpadStick = document.getElementById('dpad-stick');

    dpadBase.addEventListener('touchstart', handleDpadStart, { passive: false });
    dpadBase.addEventListener('touchmove', handleDpadMove, { passive: false });
    dpadBase.addEventListener('touchend', handleDpadEnd);
    dpadBase.addEventListener('touchcancel', handleDpadEnd);

    // 3. Setup Buttons
    const buttons = document.querySelectorAll('.touch-btn');
    buttons.forEach(btn => {
        const key = btn.dataset.key;

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            btn.classList.add('active');
            simulateKey(key, true);
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            btn.classList.remove('active');
            simulateKey(key, false);
        });

        // Handle cancel/leave
        btn.addEventListener('touchcancel', () => {
            btn.classList.remove('active');
            simulateKey(key, false);
        });
    });

    // Helper to update stick position
    function updateStick(x, y) {
        dpadStick.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
    }

    function handleDpadStart(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        dpadId = touch.identifier;
        processDpadInput(touch.clientX, touch.clientY, dpadBase);
    }

    function handleDpadMove(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === dpadId) {
                processDpadInput(e.changedTouches[i].clientX, e.changedTouches[i].clientY, dpadBase);
                break;
            }
        }
    }

    function handleDpadEnd(e) {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === dpadId) {
                dpadId = null;
                resetDpad();
                break;
            }
        }
    }

    function resetDpad() {
        updateStick(0, 0);
        keys['w'] = false;
        keys['a'] = false;
        keys['s'] = false;
        keys['d'] = false;
    }

    function processDpadInput(clientX, clientY, base) {
        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = clientX - centerX;
        let dy = clientY - centerY;

        const distance = Math.sqrt(dx * dx + dy * dy);

        // Clamp stick visual
        let stickX = dx;
        let stickY = dy;

        if (distance > maxDist) {
            const angle = Math.atan2(dy, dx);
            stickX = Math.cos(angle) * maxDist;
            stickY = Math.sin(angle) * maxDist;
        }

        updateStick(stickX, stickY);

        // Map to Keys (WSAD)
        // Determine primary direction or diagonals
        // Threshold for activation
        const threshold = 10;

        keys['w'] = dy < -threshold;
        keys['s'] = dy > threshold;
        keys['a'] = dx < -threshold;
        keys['d'] = dx > threshold;
    }

    function simulateKey(key, content) {
        if (!key) return;
        const k = key.toLowerCase();
        keys[k] = content;
    }
}

export function updateTouchVisibility(isRunning) {
    const controls = document.getElementById('touch-controls');
    const toggle = document.getElementById('touch-toggle');

    // Check toggle state (preference)
    isTouchEnabled = toggle.checked;

    if (isRunning && isTouchEnabled) {
        controls.classList.remove('hidden');
    } else {
        controls.classList.add('hidden');
    }
}
