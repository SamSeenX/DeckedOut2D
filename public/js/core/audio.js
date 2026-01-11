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

// Heartbeat Loop State
let heartbeatTimer = null;

export function startHeartbeatSystem(getClankLevel) {
    if (heartbeatTimer) clearTimeout(heartbeatTimer);

    const beat = () => {
        initAudio();
        // Play thump
        playHeartbeat();

        // Calculate next interval based on Clank
        // Higher Clank = Faster Heartbeat (Smaller Interval)
        const clank = getClankLevel();
        const maxClank = 100; // Cap
        const ratio = Math.min(clank, maxClank) / maxClank; // 0.0 to 1.0

        // Map 0 -> 1200ms, 100 -> 400ms
        // Linear Interpolation: Min + (Max - Min) * (1 - ratio)
        // No wait, fast is small interval.
        // Interval = MAX_INTERVAL - (ratio * (MAX_INTERVAL - MIN_INTERVAL))
        const minInterval = 400;
        const maxInterval = 1200;
        const nextInterval = maxInterval - (ratio * (maxInterval - minInterval));

        heartbeatTimer = setTimeout(beat, nextInterval);
    };

    beat();
}

function playHeartbeat() {
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
    playThud(now, 130, 80, 0.2);

    // "Lub" - Lower, second beat
    // 150ms delay
    playThud(now + 0.12, 90, 60, 0.3);
}
