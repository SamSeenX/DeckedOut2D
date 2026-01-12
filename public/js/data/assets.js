// ============================================
// ASSET PATHS - Centralized Asset Configuration
// ============================================
// All sprite and asset file paths defined here
// Update paths in one place when renaming files

// === SPRITES ===
export const SPRITES = {
    player: 'assets/sprites/player.webp',
    ravager: 'assets/sprites/ravager.webp',
    ghast: 'assets/sprites/ghast.webp',
    vex: 'assets/sprites/vex.webp',
    tiles: 'assets/sprites/tiles.webp',
};

// === UI & MENU ASSETS ===
export const UI_ASSETS = {
    menuBg: 'assets/menu_bg.webp',
    doorLeft: 'assets/door_left.webp',
    doorRight: 'assets/door_right.webp',
    favicon: 'assets/favicon.png',
};

// === AUDIO / VOICE ===
export const AUDIO_ASSETS = {
    voiceReady: 'assets/voice/ready.opus',
    // Add more audio files here as they're added:
    // bgMusic: 'assets/audio/bg.mp3',
    // sfxDamage: 'assets/audio/damage.wav',
};

// === HELPER: Preload images ===
export function preloadSprites(callback) {
    const sprites = Object.values(SPRITES);
    let loaded = 0;

    sprites.forEach(src => {
        const img = new Image();
        img.onload = () => {
            loaded++;
            if (loaded === sprites.length && callback) {
                callback();
            }
        };
        img.onerror = () => {
            console.warn('Failed to load sprite:', src);
            loaded++;
            if (loaded === sprites.length && callback) {
                callback();
            }
        };
        img.src = src;
    });
}
