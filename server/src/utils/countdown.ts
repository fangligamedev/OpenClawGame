// server/src/utils/countdown.ts
// 游戏阶段倒计时系统

import { EventEmitter } from 'events';

export interface CountdownConfig {
  agenda: number;      // 议题讨论时长 (毫秒)
  voting: number;      // 投票时长 (毫秒)
  executing: number;   // 执行阶段时长 (毫秒)
}

// 默认配置
export const DEFAULT_COUNTDOWN_CONFIG: CountdownConfig = {
  agenda: 10 * 60 * 1000,      // 10分钟
  voting: 5 * 60 * 1000,       // 5分钟
  executing: 3 * 60 * 1000,    // 3分钟
};

export interface CountdownState {
  sessionId: string;
  phase: string;
  totalTime: number;
  remainingTime: number;
  isPaused: boolean;
  lastTick: number;
}

export class CountdownTimer extends EventEmitter {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private states: Map<string, CountdownState> = new Map();
  private config: CountdownConfig;

  constructor(config: CountdownConfig = DEFAULT_COUNTDOWN_CONFIG) {
    super();
    this.config = config;
  }

  /**
   * 开始倒计时
   * @param sessionId 会话ID
   * @param phase 当前阶段
   * @param customDuration 自定义时长（可选）
   */
  startTimer(
    sessionId: string,
    phase: keyof CountdownConfig,
    customDuration?: number
  ): void {
    // 停止之前的定时器
    this.stopTimer(sessionId);

    const duration = customDuration || this.config[phase];
    const now = Date.now();

    const state: CountdownState = {
      sessionId,
      phase,
      totalTime: duration,
      remainingTime: duration,
      isPaused: false,
      lastTick: now,
    };

    this.states.set(sessionId, state);

    // 立即触发一次tick
    this.emit('tick', sessionId, state);

    // 启动定时器（每秒更新）
    const timer = setInterval(() => {
      this.tick(sessionId);
    }, 1000);

    this.timers.set(sessionId, timer);

    console.log(`[Countdown] Started: session=${sessionId}, phase=${phase}, duration=${duration}ms`);
  }

  /**
   * 每秒更新倒计时
   */
  private tick(sessionId: string): void {
    const state = this.states.get(sessionId);
    if (!state || state.isPaused) return;

    const now = Date.now();
    const delta = now - state.lastTick;
    state.lastTick = now;
    state.remainingTime = Math.max(0, state.remainingTime - delta);

    // 触发tick事件
    this.emit('tick', sessionId, state);

    // 检查是否超时
    if (state.remainingTime <= 0) {
      this.onTimeout(sessionId);
    }

    // 最后60秒警告
    if (state.remainingTime <= 60000 && state.remainingTime > 59000) {
      this.emit('warning', sessionId, state);
    }
  }

  /**
   * 超时处理
   */
  private onTimeout(sessionId: string): void {
    const state = this.states.get(sessionId);
    if (!state) return;

    console.log(`[Countdown] Timeout: session=${sessionId}, phase=${state.phase}`);
    
    this.emit('timeout', sessionId, state);
    this.stopTimer(sessionId);
  }

  /**
   * 停止倒计时
   */
  stopTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(sessionId);
      console.log(`[Countdown] Stopped: session=${sessionId}`);
    }
  }

  /**
   * 暂停倒计时
   */
  pauseTimer(sessionId: string): void {
    const state = this.states.get(sessionId);
    if (state) {
      state.isPaused = true;
      console.log(`[Countdown] Paused: session=${sessionId}`);
    }
  }

  /**
   * 恢复倒计时
   */
  resumeTimer(sessionId: string): void {
    const state = this.states.get(sessionId);
    if (state) {
      state.isPaused = false;
      state.lastTick = Date.now();
      console.log(`[Countdown] Resumed: session=${sessionId}`);
    }
  }

  /**
   * 获取倒计时状态
   */
  getState(sessionId: string): CountdownState | undefined {
    return this.states.get(sessionId);
  }

  /**
   * 获取剩余时间（毫秒）
   */
  getRemainingTime(sessionId: string): number {
    const state = this.states.get(sessionId);
    return state ? state.remainingTime : 0;
  }

  /**
   * 获取格式化的剩余时间（MM:SS）
   */
  getFormattedTime(sessionId: string): string {
    const remaining = this.getRemainingTime(sessionId);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * 清理所有定时器
   */
  cleanup(): void {
    this.timers.forEach((timer, sessionId) => {
      clearInterval(timer);
      console.log(`[Countdown] Cleaned up: session=${sessionId}`);
    });
    this.timers.clear();
    this.states.clear();
  }
}

// 导出单例
export const countdownTimer = new CountdownTimer();
