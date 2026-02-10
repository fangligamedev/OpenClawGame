import { EventEmitter } from 'events';
export interface CountdownConfig {
    agenda: number;
    voting: number;
    executing: number;
}
export declare const DEFAULT_COUNTDOWN_CONFIG: CountdownConfig;
export interface CountdownState {
    sessionId: string;
    phase: string;
    totalTime: number;
    remainingTime: number;
    isPaused: boolean;
    lastTick: number;
}
export declare class CountdownTimer extends EventEmitter {
    private timers;
    private states;
    private config;
    constructor(config?: CountdownConfig);
    /**
     * 开始倒计时
     * @param sessionId 会话ID
     * @param phase 当前阶段
     * @param customDuration 自定义时长（可选）
     */
    startTimer(sessionId: string, phase: keyof CountdownConfig, customDuration?: number): void;
    /**
     * 每秒更新倒计时
     */
    private tick;
    /**
     * 超时处理
     */
    private onTimeout;
    /**
     * 停止倒计时
     */
    stopTimer(sessionId: string): void;
    /**
     * 暂停倒计时
     */
    pauseTimer(sessionId: string): void;
    /**
     * 恢复倒计时
     */
    resumeTimer(sessionId: string): void;
    /**
     * 获取倒计时状态
     */
    getState(sessionId: string): CountdownState | undefined;
    /**
     * 获取剩余时间（毫秒）
     */
    getRemainingTime(sessionId: string): number;
    /**
     * 获取格式化的剩余时间（MM:SS）
     */
    getFormattedTime(sessionId: string): string;
    /**
     * 清理所有定时器
     */
    cleanup(): void;
}
export declare const countdownTimer: CountdownTimer;
//# sourceMappingURL=countdown.d.ts.map