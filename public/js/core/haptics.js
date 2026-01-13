/**
 * Haptics System
 * Handles device vibration for tactile feedback.
 * Supported primarily on Android. iOS support is limited/non-existent for navigator.vibrate.
 */

export function triggerHaptic(pattern) {
    if (navigator.vibrate) {
        // pattern can be a single number (ms) or an array of numbers [vibrate, pause, vibrate...]
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // Ignore errors if API is blocked or unsupported
        }
    }
}

// Patterns
export const HAPTIC_DAMAGE = 400; // Strong hit
export const HAPTIC_AGGRO = [200, 50, 200]; // Double pulse
export const HAPTIC_FAIL = [50, 50, 50]; // Quick stutter
export const HAPTIC_ARTIFACT = [100, 50, 100, 50, 300]; // Victory-ish
export const HAPTIC_EMBER = 40; // Very short "tick"
export const HAPTIC_HEARTBEAT = 30; // Subtle pulse
export const HAPTIC_MALFUNCTION = 20; // Glitch tick
