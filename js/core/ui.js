export function updateUI(gameState, player) {
    document.getElementById('clank-display').innerText = gameState.clank;
    document.getElementById('hp-display').innerText = Math.floor(player.hp);
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
