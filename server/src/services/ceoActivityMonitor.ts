// server/src/services/ceoActivityMonitor.ts
// CEO活跃度监控和自动推进系统

import { EventEmitter } from 'events';

export interface CEOActivityConfig {
  reminderTime: number;      // 提醒时间（毫秒）
  awayTime: number;          // 标记离开时间（毫秒）
  autoProgressTime: number;  // 自动推进时间（毫秒）
  allowPause: boolean;       // 是否允许暂停
  maxPauseTime: number;      // 最大暂停时间（毫秒）
}

// 默认配置
export const DEFAULT_CEO_CONFIG: CEOActivityConfig = {
  reminderTime: 5 * 60 * 1000,    // 5分钟
  awayTime: 10 * 60 * 1000,       // 10分钟
  autoProgressTime: 20 * 60 * 1000, // 20分钟（根据审阅意见调整）
  allowPause: true,
  maxPauseTime: 10 * 60 * 1000,   // 10分钟
};

export interface CEOActivityState {
  sessionId: string;
  lastActiveTime: number;
  status: 'active' | 'away' | 'paused';
  pauseStartTime?: number;
  totalPausedTime: number;
  reminderSent: boolean;
  awayMarked: boolean;
}

export class CEOActivityMonitor extends EventEmitter {
  private states: Map<string, CEOActivityState> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private config: CEOActivityConfig;

  constructor(config: CEOActivityConfig = DEFAULT_CEO_CONFIG) {
    super();
    this.config = config;
    this.startMonitoring();
  }

  /**
   * 开始监控（每分钟检查一次）
   */
  private startMonitoring(): void {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.checkAllInactivity();
    }, 60000); // 每分钟检查

    console.log('[CEO Monitor] Started monitoring');
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[CEO Monitor] Stopped monitoring');
    }
  }

  /**
   * 初始化CEO监控
   */
  startMonitoringSession(sessionId: string, ceoAgentId: string): void {
    const now = Date.now();
    const state: CEOActivityState = {
      sessionId,
      lastActiveTime: now,
      status: 'active',
      totalPausedTime: 0,
      reminderSent: false,
      awayMarked: false,
    };

    this.states.set(sessionId, state);
    console.log(`[CEO Monitor] Started monitoring session: ${sessionId}, CEO: ${ceoAgentId}`);
  }

  /**
   * 记录CEO活动
   */
  recordActivity(sessionId: string): void {
    const state = this.states.get(sessionId);
    if (!state) return;

    state.lastActiveTime = Date.now();
    
    // 如果之前标记为离开，恢复为活跃
    if (state.status === 'away') {
      state.status = 'active';
      state.awayMarked = false;
      console.log(`[CEO Monitor] CEO back to active: session=${sessionId}`);
      this.emit('ceo-back', sessionId);
    }

    // 重置提醒标记
    if (state.reminderSent) {
      state.reminderSent = false;
    }
  }

  /**
   * CEO主动暂停
   */
  pauseSession(sessionId: string): boolean {
    if (!this.config.allowPause) return false;

    const state = this.states.get(sessionId);
    if (!state || state.status === 'paused') return false;

    state.status = 'paused';
    state.pauseStartTime = Date.now();
    
    console.log(`[CEO Monitor] Session paused: session=${sessionId}`);
    this.emit('ceo-paused', sessionId);
    
    // 设置暂停超时
    setTimeout(() => {
      this.checkPauseTimeout(sessionId);
    }, this.config.maxPauseTime);

    return true;
  }

  /**
   * CEO恢复
   */
  resumeSession(sessionId: string): void {
    const state = this.states.get(sessionId);
    if (!state || state.status !== 'paused') return;

    const now = Date.now();
    const pauseDuration = now - (state.pauseStartTime || now);
    state.totalPausedTime += pauseDuration;
    state.status = 'active';
    state.pauseStartTime = undefined;

    console.log(`[CEO Monitor] Session resumed: session=${sessionId}, pauseDuration=${pauseDuration}ms`);
    this.emit('ceo-resumed', sessionId);
  }

  /**
   * 检查暂停超时
   */
  private checkPauseTimeout(sessionId: string): void {
    const state = this.states.get(sessionId);
    if (!state || state.status !== 'paused') return;

    // 自动恢复
    this.resumeSession(sessionId);
    this.emit('pause-timeout', sessionId);
  }

  /**
   * 检查所有会话的不活跃状态
   */
  private checkAllInactivity(): void {
    this.states.forEach((state, sessionId) => {
      this.checkInactivity(sessionId, state);
    });
  }

  /**
   * 检查特定会话的不活跃状态
   */
  private checkInactivity(sessionId: string, state: CEOActivityState): void {
    if (state.status === 'paused') return;

    const now = Date.now();
    const inactiveTime = now - state.lastActiveTime - state.totalPausedTime;

    // 5分钟 - 发送提醒
    if (inactiveTime >= this.config.reminderTime && !state.reminderSent) {
      this.sendReminder(sessionId);
      state.reminderSent = true;
    }

    // 10分钟 - 标记离开
    if (inactiveTime >= this.config.awayTime && !state.awayMarked) {
      this.markCEOAsAway(sessionId, state);
    }

    // 20分钟 - 自动推进
    if (inactiveTime >= this.config.autoProgressTime) {
      this.autoProgress(sessionId, state);
    }
  }

  /**
   * 发送提醒
   */
  private sendReminder(sessionId: string): void {
    console.log(`[CEO Monitor] Sending reminder: session=${sessionId}`);
    
    this.emit('ceo-reminder', sessionId, {
      type: 'reminder',
      message: '@CEO 已5分钟无响应，请尽快参与讨论',
      timestamp: Date.now(),
    });
  }

  /**
   * 标记CEO为离开状态
   */
  private markCEOAsAway(sessionId: string, state: CEOActivityState): void {
    state.status = 'away';
    state.awayMarked = true;

    console.log(`[CEO Monitor] CEO marked as away: session=${sessionId}`);
    
    this.emit('ceo-away', sessionId, {
      type: 'away',
      message: 'CEO暂时离开，游戏将在10分钟后自动推进',
      timestamp: Date.now(),
    });
  }

  /**
   * 自动推进到下一阶段
   */
  private autoProgress(sessionId: string, state: CEOActivityState): void {
    console.log(`[CEO Monitor] Auto progressing: session=${sessionId}`);
    
    this.emit('ceo-auto-progress', sessionId, {
      type: 'auto-progress',
      message: 'CEO 20分钟无响应，游戏自动推进到下一阶段',
      timestamp: Date.now(),
    });

    // 清理状态
    this.states.delete(sessionId);
  }

  /**
   * 获取CEO状态
   */
  getState(sessionId: string): CEOActivityState | undefined {
    return this.states.get(sessionId);
  }

  /**
   * 获取CEO活跃状态
   */
  getCEOStatus(sessionId: string): string {
    const state = this.states.get(sessionId);
    return state ? state.status : 'unknown';
  }

  /**
   * 获取不活跃时间（毫秒）
   */
  getInactiveTime(sessionId: string): number {
    const state = this.states.get(sessionId);
    if (!state) return 0;
    
    const now = Date.now();
    return now - state.lastActiveTime - state.totalPausedTime;
  }

  /**
   * 获取格式化的不活跃时间
   */
  getFormattedInactiveTime(sessionId: string): string {
    const inactiveTime = this.getInactiveTime(sessionId);
    const minutes = Math.floor(inactiveTime / 60000);
    const seconds = Math.floor((inactiveTime % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  }

  /**
   * 清理会话状态
   */
  cleanupSession(sessionId: string): void {
    this.states.delete(sessionId);
    console.log(`[CEO Monitor] Cleaned up session: ${sessionId}`);
  }

  /**
   * 清理所有状态
   */
  cleanup(): void {
    this.states.clear();
    this.stopMonitoring();
    console.log('[CEO Monitor] All cleaned up');
  }
}

// 导出单例
export const ceoActivityMonitor = new CEOActivityMonitor();
