import {
    HEARTBEAT_MIN_INTERVAL, HEARTBEAT_MAX_INTERVAL, MAX_CLANK,
    HEARTBEAT_MIN_VOLUME, HEARTBEAT_MAX_VOLUME
} from '../data/config.js';

// --- AUDIO ENGINE ---
let audioCtx = null;

export function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

export function playGong(callback) {
    initAudio();

    const now = audioCtx.currentTime;
    const duration = 1.5;

    // Create delay for echo effect
    const delay = audioCtx.createDelay();
    delay.delayTime.value = 0.3;

    const feedback = audioCtx.createGain();
    feedback.gain.value = 0.4;

    const wetGain = audioCtx.createGain();
    wetGain.gain.value = 0.5;

    // Echo chain: delay -> feedback -> delay (loop), delay -> wetGain -> destination
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wetGain);
    wetGain.connect(audioCtx.destination);

    // Main output
    const masterGain = audioCtx.createGain();
    masterGain.connect(audioCtx.destination);
    masterGain.connect(delay); // Feed into echo

    // Gong frequencies (fundamental + overtones)
    const frequencies = [110, 165, 220, 330, 440];

    frequencies.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.value = freq;

        // Envelope: quick attack, long decay
        const volume = 0.3 / (i + 1); // Higher harmonics are quieter
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(now);
        osc.stop(now + duration);
    });

    // Fade out master
    masterGain.gain.setValueAtTime(0.8, now);
    masterGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    // Callback after gong finishes echoing
    if (callback) {
        setTimeout(callback, 1500); // Wait 1.5s then speak
    }
}

// --- TTS ANNOUNCER ---
export function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.9;  // Lower pitch for spooky vibe
    utterance.rate = 0.8;   // Slightly slower
    speechSynthesis.speak(utterance);
}

export function playDing() {
    initAudio();
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    // High pitch for "ding" - start high and decay slightly or strict chime
    // C6 = 1046.50 Hz, E6 = 1318.51 Hz
    osc.frequency.setValueAtTime(1046.50, now);
    osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1); // Sustain briefly

    // Envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05); // Attack
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8); // Decay

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.8);
}

export function playBingBing() {
    initAudio();
    const now = audioCtx.currentTime;

    // First Note (High C)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Second Note (Higher E)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5
    gain2.gain.setValueAtTime(0, now + 0.15);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.5);
}

export function playScaryDing() {
    initAudio();
    const now = audioCtx.currentTime;

    // Dissonant Cluster
    const freqs = [100, 107, 115]; // Clashing low notes

    freqs.forEach(f => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth'; // Harsh sound
        osc.frequency.setValueAtTime(f, now);
        // Pitch drop
        osc.frequency.linearRampToValueAtTime(f * 0.5, now + 1.0);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 1.5);
    });
}

export function playGameOverSequence() {
    initAudio();
    const now = audioCtx.currentTime;

    // A descending, dissonant tritone/minor pattern indicating failure
    // Notes: C4 -> F#3 -> C3 -> G2 (Low rumbles)
    const notes = [
        { freq: 261.63, time: 0, dur: 0.4 }, // C4
        { freq: 185.00, time: 0.3, dur: 0.4 }, // F#3 (Tritone down)
        { freq: 130.81, time: 0.6, dur: 0.6 }, // C3
        { freq: 98.00, time: 1.0, dur: 1.5 }   // G2 (Low final note)
    ];

    notes.forEach(n => {
        const startTime = now + n.time;

        // 1. Oscillator (Sawtooth for harshness, mixed with Sine for depth)
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = n.time > 0.8 ? 'triangle' : 'sawtooth'; // Soften the final note slightly
        osc.frequency.setValueAtTime(n.freq, startTime);
        // Pitch drift down (sagging pitch = dying)
        osc.frequency.linearRampToValueAtTime(n.freq * 0.9, startTime + n.dur);

        // 2. Envelope
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + n.dur);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + n.dur);
    });
}

export function playVictoryTone() {
    initAudio();
    const now = audioCtx.currentTime;

    // Simple Arpeggio (C Major)
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
        const startTime = now + (i * 0.15);
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square'; // 8-bit vibe
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.6);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.6);
    });
}
export function playBerryCollect() {
    initAudio();
    const now = audioCtx.currentTime;

    // Create Noise Buffer for "Rustle"
    const bufferSize = audioCtx.sampleRate * 0.2; // 0.2 seconds
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    // Filter to make it sound like leaves/bush
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(800, now + 0.1); // Swish up

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(now);

    // Add a deeper "step/snap" thud
    const osc = audioCtx.createOscillator();
    const subGain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);

    subGain.gain.setValueAtTime(0.2, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.connect(subGain);
    subGain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
}

export function playEatBerry() {
    initAudio();
    const now = audioCtx.currentTime;

    // Helper to create a single small "bite" sound
    const playCrunch = (time, intensity, frequencyCenter) => {
        const bufferSize = audioCtx.sampleRate * 0.08; // Very short (80ms)
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        // White noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        // Bandpass removes the "Thud" (Low freqs) and "Hiss" (Super high freqs)
        // Leaving only the "Crunch" (Mids)
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 1.0;
        filter.frequency.setValueAtTime(frequencyCenter, time);
        filter.frequency.linearRampToValueAtTime(frequencyCenter * 0.6, time + 0.08); // Pitch drop

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(intensity, time + 0.01); // Fast attack
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.08); // Fast decay

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start(time);
    };

    // Sequence for "Crunch-crunch-sip"
    // 1. Main bite (High mid, crisp, NOT boomy)
    playCrunch(now, 0.4, 1500);

    // 2. Secondary bite (Slightly lower)
    playCrunch(now + 0.06, 0.2, 1200);

    // 3. Final swallow/settle (Lower, quiet)
    playCrunch(now + 0.13, 0.1, 800);
}

export function playEmberCollect() {
    initAudio();
    const now = audioCtx.currentTime;

    // Sparkle / Chime (Original Magical Sound)
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    // Fast sweep upward (Magical sparkle)
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.1);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.5);

    // Overtone for extra sparkle
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1200, now);
    osc2.frequency.linearRampToValueAtTime(2400, now + 0.15);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.1, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now);
    osc2.stop(now + 0.3);
}

// Heartbeat Loop State
let heartbeatTimer = null;

export function startHeartbeatSystem(getClankLevel) {
    if (heartbeatTimer) clearTimeout(heartbeatTimer);

    const beat = () => {
        initAudio();
        const clank = getClankLevel();
        const ratio = Math.min(clank, MAX_CLANK) / MAX_CLANK; // 0.0 to 1.0

        // Calculate next interval based on Clank
        // Higher Clank = Faster Heartbeat (Smaller Interval)
        const nextInterval = HEARTBEAT_MAX_INTERVAL - (ratio * (HEARTBEAT_MAX_INTERVAL - HEARTBEAT_MIN_INTERVAL));

        // Calculate Volume based on Clank
        // Higher Clank = Louder
        const volume = HEARTBEAT_MIN_VOLUME + (ratio * (HEARTBEAT_MAX_VOLUME - HEARTBEAT_MIN_VOLUME));

        // Play thump
        playHeartbeat(volume);

        heartbeatTimer = setTimeout(beat, nextInterval);
    };

    beat();
}

export function stopHeartbeatSystem() {
    if (heartbeatTimer) {
        clearTimeout(heartbeatTimer);
        heartbeatTimer = null;
    }
}

function playHeartbeat(volume = 0.3) {
    const now = audioCtx.currentTime;

    // Helper for a single heart syllable
    const playThud = (startTime, freqStart, freqEnd, vol) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freqStart, startTime);
        osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + 0.15); // Pitch drop

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(vol, startTime + 0.02); // Sharp attack
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2); // Fast decay

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.35);

        // Sub layer
        const subOsc = audioCtx.createOscillator();
        const subGain = audioCtx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(freqStart * 0.5, startTime);

        subGain.gain.setValueAtTime(vol * 0.6, startTime);
        subGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

        subOsc.connect(subGain);
        subGain.connect(audioCtx.destination);
        subOsc.start(startTime);
        subOsc.stop(startTime + 0.25);
    };

    // "Dub" - Slightly higher/sharper, first beat
    playThud(now, 130, 80, volume * 0.7);

    // "Lub" - Lower, second beat
    // 150ms delay
    playThud(now + 0.12, 90, 60, volume);
}

// ============================================
// === AMBIENT DUNGEON SOUNDSCAPE ===
// ============================================
let ambientNodes = null;
let randomNoteTimer = null;

export function startAmbientAudio() {
    initAudio();
    if (ambientNodes) return; // Already running

    const now = audioCtx.currentTime;
    ambientNodes = {};

    // --- MASTER GAIN ---
    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.15; // Keep ambient quiet
    masterGain.connect(audioCtx.destination);
    ambientNodes.masterGain = masterGain;

    // --- LOW DRONE (Ominous Base) ---
    const droneOsc = audioCtx.createOscillator();
    const droneGain = audioCtx.createGain();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = 55; // Very low A1
    droneGain.gain.value = 0.4;

    // Slow LFO for subtle pitch wobble
    const droneLFO = audioCtx.createOscillator();
    const droneLFOGain = audioCtx.createGain();
    droneLFO.type = 'sine';
    droneLFO.frequency.value = 0.1; // Very slow
    droneLFOGain.gain.value = 2; // Subtle detune
    droneLFO.connect(droneLFOGain);
    droneLFOGain.connect(droneOsc.frequency);

    droneOsc.connect(droneGain);
    droneGain.connect(masterGain);
    droneOsc.start(now);
    droneLFO.start(now);
    ambientNodes.droneOsc = droneOsc;
    ambientNodes.droneLFO = droneLFO;

    // --- HIGHER DRONE (Dissonant Overtone) ---
    const drone2 = audioCtx.createOscillator();
    const drone2Gain = audioCtx.createGain();
    drone2.type = 'triangle';
    drone2.frequency.value = 82.5; // Slightly sharp for tension
    drone2Gain.gain.value = 0.15;
    drone2.connect(drone2Gain);
    drone2Gain.connect(masterGain);
    drone2.start(now);
    ambientNodes.drone2 = drone2;

    // --- FILTERED NOISE (Wind/Whispers) ---
    const noiseBufferSize = audioCtx.sampleRate * 2;
    const noiseBuffer = audioCtx.createBuffer(1, noiseBufferSize, audioCtx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseBufferSize; i++) {
        noiseData[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 400;
    noiseFilter.Q.value = 2;

    // LFO for filter sweep (breathing effect)
    const noiseLFO = audioCtx.createOscillator();
    const noiseLFOGain = audioCtx.createGain();
    noiseLFO.type = 'sine';
    noiseLFO.frequency.value = 0.05; // Very slow
    noiseLFOGain.gain.value = 200; // Sweep range
    noiseLFO.connect(noiseLFOGain);
    noiseLFOGain.connect(noiseFilter.frequency);

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.value = 0.08;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(now);
    noiseLFO.start(now);
    ambientNodes.noise = noise;
    ambientNodes.noiseLFO = noiseLFO;

    // --- RANDOM CREEPY NOTES ---
    startRandomNotes();
}

function startRandomNotes() {
    const scheduleNextNote = () => {
        // Random interval: 3-8 seconds
        const delay = 3000 + Math.random() * 5000;

        randomNoteTimer = setTimeout(() => {
            playRandomCreepyNote();
            scheduleNextNote();
        }, delay);
    };

    scheduleNextNote();
}

function playRandomCreepyNote() {
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    // Creepy scale notes (minor/diminished)
    const creepyNotes = [
        65.41,  // C2
        69.30,  // C#2
        77.78,  // D#2
        87.31,  // F2
        92.50,  // F#2
        103.83, // G#2
        116.54, // A#2
        130.81, // C3
        138.59, // C#3
    ];

    const freq = creepyNotes[Math.floor(Math.random() * creepyNotes.length)];
    const noteType = Math.random();

    if (noteType < 0.4) {
        // Short pluck
        playCreepyPluck(now, freq);
    } else if (noteType < 0.7) {
        // Long moan
        playCreepyMoan(now, freq);
    } else {
        // Dissonant cluster
        playCreepyCluster(now, freq);
    }
}

function playCreepyPluck(now, freq) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 1.5);
}

function playCreepyMoan(now, freq) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq * 0.85, now + 3); // Slow pitch drop

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.5);
    gain.gain.linearRampToValueAtTime(0.04, now + 2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 3);
}

function playCreepyCluster(now, baseFreq) {
    // Play 2-3 dissonant notes together
    const offsets = [1, 1.05, 1.12]; // Slightly detuned

    offsets.forEach((mult, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = baseFreq * mult;

        const vol = 0.02 / (i + 1);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 2);
    });
}

export function stopAmbientAudio() {
    if (randomNoteTimer) {
        clearTimeout(randomNoteTimer);
        randomNoteTimer = null;
    }

    if (ambientNodes) {
        const now = audioCtx.currentTime;

        // Fade out gracefully
        if (ambientNodes.masterGain) {
            ambientNodes.masterGain.gain.linearRampToValueAtTime(0, now + 1);
        }

        // Stop all nodes after fade
        setTimeout(() => {
            try {
                if (ambientNodes.droneOsc) ambientNodes.droneOsc.stop();
                if (ambientNodes.droneLFO) ambientNodes.droneLFO.stop();
                if (ambientNodes.drone2) ambientNodes.drone2.stop();
                if (ambientNodes.noise) ambientNodes.noise.stop();
                if (ambientNodes.noiseLFO) ambientNodes.noiseLFO.stop();
            } catch (e) {
                // Already stopped
            }
            ambientNodes = null;
        }, 1100);
    }
}

// ============================================
// === DATA-DRIVEN AUDIO ENGINE ===
// ============================================

export function playSequence(config) {
    initAudio();
    const now = audioCtx.currentTime;

    if (!config || !config.notes) return;

    config.notes.forEach(note => {
        const startTime = now + (note.startTime || 0);
        const duration = note.duration || 0.1;

        // Volume Envelope
        const volStart = note.volStart !== undefined ? note.volStart : 0;
        const volPeak = note.volPeak !== undefined ? note.volPeak : 0.5;
        const volEnd = note.volEnd !== undefined ? note.volEnd : 0;
        const attack = note.attack || 0.01;

        // Frequency Envelope
        const freqStart = note.freqStart || 440;
        const freqEnd = note.freqEnd !== undefined ? note.freqEnd : freqStart;

        let source, filter;
        const gain = audioCtx.createGain();

        // 1. Source Generation
        if (note.type === 'noise') {
            const bufferSize = audioCtx.sampleRate * duration;
            const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            source = audioCtx.createBufferSource();
            source.buffer = buffer;
        } else {
            // Oscillator
            source = audioCtx.createOscillator();
            source.type = note.wave || 'sine';

            source.frequency.setValueAtTime(freqStart, startTime);
            if (freqStart !== freqEnd) {
                source.frequency.exponentialRampToValueAtTime(Math.max(0.1, freqEnd), startTime + duration);
            }
        }

        // 2. Filter Chain (Optional)
        if (note.filterType && note.filterType !== 'none') {
            filter = audioCtx.createBiquadFilter();
            filter.type = note.filterType; // lowpass, highpass, bandpass

            const fFreqStart = note.filterFreqStart || 1000;
            const fFreqEnd = note.filterFreqEnd !== undefined ? note.filterFreqEnd : fFreqStart;

            filter.frequency.setValueAtTime(fFreqStart, startTime);
            if (fFreqStart !== fFreqEnd) {
                filter.frequency.exponentialRampToValueAtTime(Math.max(0.1, fFreqEnd), startTime + duration);
            }

            if (note.Q) filter.Q.value = note.Q;

            source.connect(filter);
            filter.connect(gain);
        } else {
            source.connect(gain);
        }

        // 3. Gain Envelope
        gain.connect(audioCtx.destination);

        gain.gain.setValueAtTime(volStart, startTime);
        gain.gain.linearRampToValueAtTime(volPeak, startTime + attack);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volEnd), startTime + duration);

        // 4. Play
        source.start(startTime);
        source.stop(startTime + duration + 0.1); // Cleanup
    });
}

// Cache for sound configs
const soundCache = {};

export async function loadSound(url) {
    if (soundCache[url]) return soundCache[url];

    try {
        const response = await fetch(url);
        const config = await response.json();
        soundCache[url] = config;
        return config;
    } catch (e) {
        console.error("Failed to load sound:", url, e);
        return null;
    }
}

export async function playJson(url) {
    const config = await loadSound(url);
    if (config) {
        playSequence(config);
    }
}
