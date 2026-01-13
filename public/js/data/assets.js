// ============================================
// ASSET PATHS - Centralized Asset Configuration
// ============================================
// All sprite and asset file paths defined here
// Using ES imports allows Vite to hash filenames for cache busting

// === SPRITES (imported for cache-busted hashed filenames) ===
import playerSprite from '../../assets/sprites/player.webp';
import frostbeastSprite from '../../assets/sprites/frostbeast.webp';
import specterSprite from '../../assets/sprites/specter.webp';
import phantomSprite from '../../assets/sprites/phantom.webp';
import tilesSprite from '../../assets/sprites/tiles.webp';

export const SPRITES = {
    player: playerSprite,
    frostbeast: frostbeastSprite,
    specter: specterSprite,
    phantom: phantomSprite,
    tiles: tilesSprite,
};

// === UI & MENU ASSETS (imported for cache-busted hashed filenames) ===
import menuBgImg from '../../assets/menu_bg.webp';
import doorLeftImg from '../../assets/door_left.webp';
import doorRightImg from '../../assets/door_right.webp';
import faviconImg from '../../assets/favicon.png';

export const UI_ASSETS = {
    menuBg: menuBgImg,
    doorLeft: doorLeftImg,
    doorRight: doorRightImg,
    favicon: faviconImg,
};

// === AUDIO / VOICE (imported for cache-busted hashed filenames) ===
import voiceReadyAudio from '../../assets/voice/ready.opus';

export const AUDIO_ASSETS = {
    voiceReady: voiceReadyAudio,
    // Add more audio files here as they're added:
    // bgMusic: '/assets/audio/bg.mp3',
    // sfxDamage: '/assets/audio/damage.wav',
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
