import { map } from '../data/map.js';

export function updateUI(gameState, player) {
    // Basic Stats
    document.getElementById('clank-display').innerText = gameState.clank;
    document.getElementById('hp-display').innerText = Math.floor(player.hp);
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

    // Compass Logic
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
    if (target) {
        // Calculate Angle
        const dx = target.x - player.x;
        const dy = target.y - player.y;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        needle.style.transform = `rotate(${angle}deg)`;
        needle.style.opacity = '1';
    } else {
        // Spin if confused or no target
        needle.style.opacity = '0.3';
    }
}

export function showToast(message, duration = 3000) {
    let toast = document.getElementById('toast-message');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-message';
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add('visible');

    // Clear any existing timeout (simple implementation)
    if (toast.timeout) clearTimeout(toast.timeout);

    toast.timeout = setTimeout(() => {
        toast.classList.remove('visible');
    }, duration);
}

export function showVictory(artifact, embers) {
    const overlay = document.getElementById('victory-overlay');
    document.getElementById('victory-artifact-name').innerText = artifact.name;
    document.getElementById('victory-artifact-desc').innerText = artifact.description;
    document.getElementById('victory-artifact-icon').innerText = artifact.icon;
    document.getElementById('victory-embers').innerText = embers;

    overlay.classList.remove('hidden');
    overlay.onclick = () => location.reload();
}
