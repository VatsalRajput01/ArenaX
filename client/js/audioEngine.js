// client/js/audioEngine.js

// Initialize audio context lazily to comply with browser autoplay policies
let audioCtx = null;
const getContext = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

// Pre-load static audio assets for immediate playback
const emojiSounds = {
    ':happy:': new Audio('/sounds/happy.mp3'),
    ':laugh:': new Audio('/sounds/laugh.mp3'),
    ':cool:': new Audio('/sounds/cool.mp3'),
    ':angry:': new Audio('/sounds/angry.mp3'),
    ':cry:': new Audio('/sounds/cry.mp3'),
    'tick': new Audio('/sounds/tick.mp3')
};

const AudioEngine = {
    // Generate synthetic audio tones using oscillator nodes and exponential gain ramps
    playTone: function (freq, type, duration, vol) {
        const ctx = getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(vol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + duration);
    },

    // Interface interaction feedback
    hover: function () {
        if (!audioCtx || audioCtx.state !== 'running') return;
        this.playTone(200, 'sine', 0.05, 0.02);
    },
    click: function () {
        const ctx = getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.03);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.03);
    },

    // Board gameplay audio cues
    placeMove: function () {
        this.playTone(500, 'sine', 0.05, 0.1);
        setTimeout(() => this.playTone(250, 'sine', 0.05, 0.1), 30);
    },
    invalidMove: function () {
        this.playTone(150, 'sawtooth', 0.1, 0.05);
    },

    // Communication notification tones
    chatReceive: function () {
        this.playTone(900, 'sine', 0.05, 0.05);
        setTimeout(() => this.playTone(1200, 'sine', 0.1, 0.05), 80);
    },

    // Match outcome tones
    success: function () {
        this.playTone(400, 'sine', 0.1, 0.05);
        setTimeout(() => this.playTone(800, 'sine', 0.2, 0.08), 100);
    },
    victory: function () {
        this.playTone(300, 'triangle', 0.1, 0.1);
        setTimeout(() => this.playTone(400, 'triangle', 0.1, 0.1), 100);
        setTimeout(() => this.playTone(500, 'triangle', 0.1, 0.1), 200);
        setTimeout(() => this.playTone(600, 'triangle', 0.4, 0.15), 300);
    },
    defeat: function () {
        this.playTone(300, 'sawtooth', 0.2, 0.1);
        setTimeout(() => this.playTone(200, 'sawtooth', 0.4, 0.1), 200);
    },
    draw: function () {
        this.playTone(250, 'square', 0.2, 0.05);
        setTimeout(() => this.playTone(250, 'square', 0.2, 0.05), 250);
    },

    // Play pre-rendered sound effects for sticker expressions
    playEmojiSound: function (emojiCode) {
        if (emojiSounds[emojiCode]) {
            emojiSounds[emojiCode].currentTime = 0;
            emojiSounds[emojiCode].play().catch(e => console.log('Audio playback prevented:', e));
        } else {
            this.chatReceive();
        }
    },

    // Countdown audio warning triggered in the final seconds of a turn
    playTickSequence: function () {
        if (emojiSounds['tick']) {
            emojiSounds['tick'].currentTime = 0;
            emojiSounds['tick'].play().catch(e => console.log('Audio playback prevented:', e));
        }
    },

    // Immediate audio interrupt for valid moves
    stopTickSequence: function () {
        if (emojiSounds['tick']) {
            emojiSounds['tick'].pause();
            emojiSounds['tick'].currentTime = 0;
        }
    },

    // Synthetic bell tone triggered when turn duration expires
    timeUpTing: function () {
        const ctx = getContext();
        if (!ctx || ctx.state !== 'running') return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 1.0);

        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 1.0);
    }
};

export default AudioEngine;