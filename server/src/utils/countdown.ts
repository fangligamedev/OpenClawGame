// src/utils/countdown.ts
// Phase countdown timer for CorpSim

export interface CountdownConfig {
  waiting: number;   // seconds
  agenda: number;    // seconds
  debate: number;    // seconds
  voting: number;    // seconds
  executing: number; // seconds
  feedback: number;  // seconds
}

export const DEFAULT_COUNTDOWN: CountdownConfig = {
  waiting: 300,    // 5 minutes
  agenda: 600,     // 10 minutes
  debate: 600,     // 10 minutes
  voting: 180,     // 3 minutes
  executing: 60,   // 1 minute
  feedback: 300,   // 5 minutes
};

export class PhaseCountdown {
  private sessionId: string;
  private phase: string;
  private remaining: number;
  private total: number;
  private interval: NodeJS.Timeout | null = null;
  private onTick: (remaining: number) => void;
  private onComplete: () => void;

  constructor(
    sessionId: string,
    phase: string,
    config: CountdownConfig,
    onTick: (remaining: number) => void,
    onComplete: () => void
  ) {
    this.sessionId = sessionId;
    this.phase = phase;
    this.total = config[phase as keyof CountdownConfig] || 300;
    this.remaining = this.total;
    this.onTick = onTick;
    this.onComplete = onComplete;
  }

  start(): void {
    console.log(`[Countdown ${this.sessionId}] Started ${this.phase}: ${this.remaining}s`);
    
    this.interval = setInterval(() => {
      this.remaining--;
      this.onTick(this.remaining);
      
      if (this.remaining <= 0) {
        this.complete();
      }
    }, 1000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  complete(): void {
    this.stop();
    console.log(`[Countdown ${this.sessionId}] Completed ${this.phase}`);
    this.onComplete();
  }

  getRemaining(): number {
    return this.remaining;
  }

  getProgress(): number {
    return ((this.total - this.remaining) / this.total) * 100;
  }

  // Format remaining time as MM:SS
  formatTime(): string {
    const minutes = Math.floor(this.remaining / 60);
    const seconds = this.remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Check if time is running low (less than 30 seconds)
  isRunningLow(): boolean {
    return this.remaining <= 30;
  }
}

// Countdown manager for multiple sessions
export class CountdownManager {
  private countdowns: Map<string, PhaseCountdown> = new Map();

  startCountdown(
    sessionId: string,
    phase: string,
    config: CountdownConfig,
    onTick: (remaining: number) => void,
    onComplete: () => void
  ): PhaseCountdown {
    // Stop existing countdown for this session
    this.stopCountdown(sessionId);
    
    const countdown = new PhaseCountdown(sessionId, phase, config, onTick, onComplete);
    this.countdowns.set(sessionId, countdown);
    countdown.start();
    return countdown;
  }

  stopCountdown(sessionId: string): void {
    const countdown = this.countdowns.get(sessionId);
    if (countdown) {
      countdown.stop();
      this.countdowns.delete(sessionId);
    }
  }

  getCountdown(sessionId: string): PhaseCountdown | undefined {
    return this.countdowns.get(sessionId);
  }

  // Format time for display
  static formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

export const countdownManager = new CountdownManager();
