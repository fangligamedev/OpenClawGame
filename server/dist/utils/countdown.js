"use strict";
// server/src/utils/countdown.ts
// 游戏阶段倒计时系统
Object.defineProperty(exports, "__esModule", { value: true });
exports.countdownTimer = exports.CountdownTimer = exports.DEFAULT_COUNTDOWN_CONFIG = void 0;
const events_1 = require("events");
// 默认配置
exports.DEFAULT_COUNTDOWN_CONFIG = {
    agenda: 10 * 60 * 1000, // 10分钟
    voting: 5 * 60 * 1000, // 5分钟
    executing: 3 * 60 * 1000, // 3分钟
};
class CountdownTimer extends events_1.EventEmitter {
    timers = new Map();
    states = new Map();
    config;
    constructor(config = exports.DEFAULT_COUNTDOWN_CONFIG) {
        super();
        this.config = config;
    }
    /**
     * 开始倒计时
     * @param sessionId 会话ID
     * @param phase 当前阶段
     * @param customDuration 自定义时长（可选）
     */
    startTimer(sessionId, phase, customDuration) {
        // 停止之前的定时器
        this.stopTimer(sessionId);
        const duration = customDuration || this.config[phase];
        const now = Date.now();
        const state = {
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
    tick(sessionId) {
        const state = this.states.get(sessionId);
        if (!state || state.isPaused)
            return;
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
    onTimeout(sessionId) {
        const state = this.states.get(sessionId);
        if (!state)
            return;
        console.log(`[Countdown] Timeout: session=${sessionId}, phase=${state.phase}`);
        this.emit('timeout', sessionId, state);
        this.stopTimer(sessionId);
    }
    /**
     * 停止倒计时
     */
    stopTimer(sessionId) {
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
    pauseTimer(sessionId) {
        const state = this.states.get(sessionId);
        if (state) {
            state.isPaused = true;
            console.log(`[Countdown] Paused: session=${sessionId}`);
        }
    }
    /**
     * 恢复倒计时
     */
    resumeTimer(sessionId) {
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
    getState(sessionId) {
        return this.states.get(sessionId);
    }
    /**
     * 获取剩余时间（毫秒）
     */
    getRemainingTime(sessionId) {
        const state = this.states.get(sessionId);
        return state ? state.remainingTime : 0;
    }
    /**
     * 获取格式化的剩余时间（MM:SS）
     */
    getFormattedTime(sessionId) {
        const remaining = this.getRemainingTime(sessionId);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    /**
     * 清理所有定时器
     */
    cleanup() {
        this.timers.forEach((timer, sessionId) => {
            clearInterval(timer);
            console.log(`[Countdown] Cleaned up: session=${sessionId}`);
        });
        this.timers.clear();
        this.states.clear();
    }
}
exports.CountdownTimer = CountdownTimer;
// 导出单例
exports.countdownTimer = new CountdownTimer();
//# sourceMappingURL=countdown.js.map