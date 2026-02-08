export interface CountdownConfig {
    waiting: number;
    agenda: number;
    debate: number;
    voting: number;
    executing: number;
    feedback: number;
}
export declare const DEFAULT_COUNTDOWN: CountdownConfig;
export declare class PhaseCountdown {
    private sessionId;
    private phase;
    private remaining;
    private total;
    private interval;
    private onTick;
    private onComplete;
    constructor(sessionId: string, phase: string, config: CountdownConfig, onTick: (remaining: number) => void, onComplete: () => void);
    start(): void;
    stop(): void;
    complete(): void;
    getRemaining(): number;
    getProgress(): number;
    formatTime(): string;
    isRunningLow(): boolean;
}
export declare class CountdownManager {
    private countdowns;
    startCountdown(sessionId: string, phase: string, config: CountdownConfig, onTick: (remaining: number) => void, onComplete: () => void): PhaseCountdown;
    stopCountdown(sessionId: string): void;
    getCountdown(sessionId: string): PhaseCountdown | undefined;
    static formatTime(seconds: number): string;
}
export declare const countdownManager: CountdownManager;
//# sourceMappingURL=countdown.d.ts.map