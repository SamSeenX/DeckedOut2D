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
