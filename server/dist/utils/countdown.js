"use strict";
// src/utils/countdown.ts
// Phase countdown timer for CorpSim
Object.defineProperty(exports, "__esModule", { value: true });
exports.countdownManager = exports.CountdownManager = exports.PhaseCountdown = exports.DEFAULT_COUNTDOWN = void 0;
exports.DEFAULT_COUNTDOWN = {
    waiting: 300, // 5 minutes
    agenda: 600, // 10 minutes
    debate: 600, // 10 minutes
    voting: 180, // 3 minutes
    executing: 60, // 1 minute
    feedback: 300, // 5 minutes
};
class PhaseCountdown {
    sessionId;
    phase;
    remaining;
    total;
    interval = null;
    onTick;
    onComplete;
    constructor(sessionId, phase, config, onTick, onComplete) {
        this.sessionId = sessionId;
        this.phase = phase;
        this.total = config[phase] || 300;
        this.remaining = this.total;
        this.onTick = onTick;
        this.onComplete = onComplete;
    }
    start() {
        console.log(`[Countdown ${this.sessionId}] Started ${this.phase}: ${this.remaining}s`);
        this.interval = setInterval(() => {
            this.remaining--;
            this.onTick(this.remaining);
            if (this.remaining <= 0) {
                this.complete();
            }
        }, 1000);
    }
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
    complete() {
        this.stop();
        console.log(`[Countdown ${this.sessionId}] Completed ${this.phase}`);
        this.onComplete();
    }
    getRemaining() {
        return this.remaining;
    }
    getProgress() {
        return ((this.total - this.remaining) / this.total) * 100;
    }
    // Format remaining time as MM:SS
    formatTime() {
        const minutes = Math.floor(this.remaining / 60);
        const seconds = this.remaining % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    // Check if time is running low (less than 30 seconds)
    isRunningLow() {
        return this.remaining <= 30;
    }
}
exports.PhaseCountdown = PhaseCountdown;
// Countdown manager for multiple sessions
class CountdownManager {
    countdowns = new Map();
    startCountdown(sessionId, phase, config, onTick, onComplete) {
        // Stop existing countdown for this session
        this.stopCountdown(sessionId);
        const countdown = new PhaseCountdown(sessionId, phase, config, onTick, onComplete);
        this.countdowns.set(sessionId, countdown);
        countdown.start();
        return countdown;
    }
    stopCountdown(sessionId) {
        const countdown = this.countdowns.get(sessionId);
        if (countdown) {
            countdown.stop();
            this.countdowns.delete(sessionId);
        }
    }
    getCountdown(sessionId) {
        return this.countdowns.get(sessionId);
    }
    // Format time for display
    static formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
}
exports.CountdownManager = CountdownManager;
exports.countdownManager = new CountdownManager();
//# sourceMappingURL=countdown.js.map