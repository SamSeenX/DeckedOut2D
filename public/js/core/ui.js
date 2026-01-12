import { map } from '../data/map.js';
import { PLAYER_MAX_HP, COMPASS_UPDATE_INTERVAL, COMPASS_ROTATION_STEP } from '../data/config.js';
import { stopHeartbeatSystem, stopAmbientAudio } from './audio.js';

let lastCompassUpdate = 0;

export function updateUI(gameState, player) {
    // Basic Stats
    document.getElementById('clank-display').innerText = gameState.clank;

    // Heart Rendering
    const hpContainer = document.getElementById('hp-container');
    if (hpContainer) {
        hpContainer.innerHTML = '';
        // Assume 1 Heart = 1 HP for clarity with 10 Max HP
        // (Or 1 Heart = 2 HP if we want 5 hearts, but user said "row of hearts" and 10 is fine)
        // Let's go with 1 Heart = 1 HP to match the integer value exactly displayed before.

        for (let i = 0; i < PLAYER_MAX_HP; i++) {
            const heart = document.createElement('div');
            heart.classList.add('heart');
            if (i < Math.floor(player.hp)) {
                heart.classList.add('full');
            } else {
                heart.classList.add('empty');
            }
            hpContainer.appendChild(heart);
        }
    }

    document.getElementById('ember-display').innerText = gameState.embers;
    document.getElementById('food-display').innerText = gameState.inventory.food;

    // Artifact Logic
    const artIcon = document.getElementById('artifact-icon');
    if (gameState.hasArtifact) {
        artIcon.textContent = gameState.targetArtifactItem ? gameState.targetArtifactItem.icon : '👑';
        artIcon.classList.remove('empty');
        artIcon.title = gameState.targetArtifactItem ? gameState.targetArtifactItem.name : "Artifact";
    } else {
        artIcon.textContent = '?';
        artIcon.classList.add('empty');
    }

    // Compass Logic (Throttled)
    const now = Date.now();
    if (now - lastCompassUpdate > COMPASS_UPDATE_INTERVAL) {
        lastCompassUpdate = now;

        let target = null;

        if (!gameState.hasArtifact) {
            target = gameState.targetArtifactLoc;
        } else {
            // Find Nearest Exit
            let minDist = Infinity;
            for (let y = 0; y < map.length; y++) {
                for (let x = 0; x < map[0].length; x++) {
                    let cell = map[y][x];
                    if ((typeof cell === 'object') && cell.isExit) {
                        let d = (player.x - x) ** 2 + (player.y - y) ** 2;
                        if (d < minDist) {
                            minDist = d;
                            target = { x, y };
                        }
                    }
                }
            }
        }

        const needle = document.getElementById('compass-needle');
        const container = document.getElementById('compass-container');

        if (target) {
            const dx = target.x - player.x;
            const dy = target.y - player.y;
            let angle = Math.atan2(dy, dx) * (180 / Math.PI);

            // Snap Rotation
            if (COMPASS_ROTATION_STEP > 0) {
                angle = Math.round(angle / COMPASS_ROTATION_STEP) * COMPASS_ROTATION_STEP;
            }

            needle.style.transform = `rotate(${angle}deg)`;
            needle.style.opacity = '1';

            // Visual indicator
            if (!gameState.hasArtifact) {
                container.style.borderColor = "#ffd700"; // Gold container
                needle.style.color = "#ff0000"; // RED Arrow for Artifact (User Request)
            } else {
                container.style.borderColor = "#00ff00"; // Green for Exit
                needle.style.color = "#00ff00";
            }
        } else {
            needle.style.opacity = '0.3';
        }
    }
}

export function showToast(message, duration = 3000) {
    let toast = document.getElementById('toast-message');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-message';
        document.body.appendChild(toast);
    }

    // Reset Animation State
    toast.classList.remove('exiting');
    toast.classList.remove('visible');

    // Force Reflow to restart animation if triggered rapidly
    void toast.offsetWidth;

    toast.textContent = message;
    toast.classList.add('visible');

    // Clear any existing timeouts to prevent glitches
    if (toast.timeout) clearTimeout(toast.timeout);
    if (toast.exitTimeout) clearTimeout(toast.exitTimeout);

    // Schedule Exit
    toast.timeout = setTimeout(() => {
        toast.classList.add('exiting');

        // Fully hide after exit animation completes
        toast.exitTimeout = setTimeout(() => {
            toast.classList.remove('visible');
            toast.classList.remove('exiting');
        }, 500); // Matches CSS transition duration
    }, duration);
}

export function showVictory(artifact, mapEmbers) {
    const overlay = document.getElementById('victory-overlay');
    document.getElementById('victory-artifact-name').innerText = artifact.name;
    document.getElementById('victory-artifact-desc').innerText = artifact.description;
    document.getElementById('victory-artifact-icon').innerText = artifact.icon;

    // Breakdown Logic
    const artifactValue = artifact.value || 0;
    const totalEmbers = mapEmbers + artifactValue;

    const statsContainer = document.querySelector('.victory-stats');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div class="stat-row">
                <span>🔥 Embers Collected:</span>
                <strong>${mapEmbers}</strong>
            </div>
            <div class="stat-row">
                <span>${artifact.icon} Artifact Value:</span>
                <strong>${artifactValue}</strong>
            </div>
            <hr class="stat-divider">
            <div class="stat-row total-row">
                <span>🏆 TOTAL:</span>
                <strong>${totalEmbers}</strong>
            </div>
        `;
    }

    stopHeartbeatSystem();
    stopAmbientAudio();
    overlay.classList.remove('hidden');
    overlay.onclick = () => location.reload();
}
