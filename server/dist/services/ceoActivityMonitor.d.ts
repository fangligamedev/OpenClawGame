import { EventEmitter } from 'events';
export interface CEOActivityConfig {
    reminderTime: number;
    awayTime: number;
    autoProgressTime: number;
    allowPause: boolean;
    maxPauseTime: number;
}
export declare const DEFAULT_CEO_CONFIG: CEOActivityConfig;
export interface CEOActivityState {
    sessionId: string;
    lastActiveTime: number;
    status: 'active' | 'away' | 'paused';
    pauseStartTime?: number;
    totalPausedTime: number;
    reminderSent: boolean;
    awayMarked: boolean;
}
export declare class CEOActivityMonitor extends EventEmitter {
    private states;
    private checkInterval;
    private config;
    constructor(config?: CEOActivityConfig);
    /**
     * 开始监控（每分钟检查一次）
     */
    private startMonitoring;
    /**
     * 停止监控
     */
    stopMonitoring(): void;
    /**
     * 初始化CEO监控
     */
    startMonitoringSession(sessionId: string, ceoAgentId: string): void;
    /**
     * 记录CEO活动
     */
    recordActivity(sessionId: string): void;
    /**
     * CEO主动暂停
     */
    pauseSession(sessionId: string): boolean;
    /**
     * CEO恢复
     */
    resumeSession(sessionId: string): void;
    /**
     * 检查暂停超时
     */
    private checkPauseTimeout;
    /**
     * 检查所有会话的不活跃状态
     */
    private checkAllInactivity;
    /**
     * 检查特定会话的不活跃状态
     */
    private checkInactivity;
    /**
     * 发送提醒
     */
    private sendReminder;
    /**
     * 标记CEO为离开状态
     */
    private markCEOAsAway;
    /**
     * 自动推进到下一阶段
     */
    private autoProgress;
    /**
     * 获取CEO状态
     */
    getState(sessionId: string): CEOActivityState | undefined;
    /**
     * 获取CEO活跃状态
     */
    getCEOStatus(sessionId: string): string;
    /**
     * 获取不活跃时间（毫秒）
     */
    getInactiveTime(sessionId: string): number;
    /**
     * 获取格式化的不活跃时间
     */
    getFormattedInactiveTime(sessionId: string): string;
    /**
     * 清理会话状态
     */
    cleanupSession(sessionId: string): void;
    /**
     * 清理所有状态
     */
    cleanup(): void;
}
export declare const ceoActivityMonitor: CEOActivityMonitor;
//# sourceMappingURL=ceoActivityMonitor.d.ts.map