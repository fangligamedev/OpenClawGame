import { EventEmitter } from 'events';
import { Message } from '../models/types';
export interface ReconnectionConfig {
    disconnectTimeout: number;
    messageBufferSize: number;
    syncInterval: number;
}
export declare const DEFAULT_RECONNECTION_CONFIG: ReconnectionConfig;
export interface PlayerConnection {
    agentId: string;
    sessionId: string;
    connected: boolean;
    lastSeen: number;
    disconnectTime?: number;
    wsId?: string;
}
export interface ReconnectionState {
    sessionId: string;
    agentId: string;
    lastSequence: number;
    bufferedMessages: Message[];
}
export declare class ReconnectionHandler extends EventEmitter {
    private connections;
    private states;
    private disconnectTimers;
    private config;
    private checkInterval;
    constructor(config?: ReconnectionConfig);
    /**
     * 玩家连接
     */
    playerConnected(sessionId: string, agentId: string, wsId: string): {
        isReconnecting: boolean;
        missedMessages?: Message[];
    };
    /**
     * 玩家断开连接
     */
    playerDisconnected(sessionId: string, agentId: string): void;
    /**
     * 断线超时处理
     */
    private onDisconnectTimeout;
    /**
     * 缓存消息
     */
    bufferMessage(sessionId: string, message: Message): void;
    /**
     * 确认消息已接收
     */
    confirmMessageReceived(sessionId: string, agentId: string, messageId: string): void;
    /**
     * 更新最后看到时间
     */
    updateLastSeen(sessionId: string, agentId: string): void;
    /**
     * 心跳检测
     */
    heartbeat(sessionId: string, agentId: string): {
        status: string;
    };
    /**
     * 获取连接状态
     */
    getConnectionStatus(sessionId: string, agentId: string): PlayerConnection | undefined;
    /**
     * 检查玩家是否在线
     */
    isPlayerConnected(sessionId: string, agentId: string): boolean;
    /**
     * 获取会话中的所有连接
     */
    getSessionConnections(sessionId: string): PlayerConnection[];
    /**
     * 获取在线玩家列表
     */
    getOnlinePlayers(sessionId: string): string[];
    /**
     * 获取离线但保留位置的玩家
     */
    getDisconnectedPlayers(sessionId: string): string[];
    /**
     * 清除断线定时器
     */
    private clearDisconnectTimer;
    /**
     * 启动清理定时器
     */
    private startCleanupInterval;
    /**
     * 清理过期连接
     */
    private cleanupExpiredConnections;
    /**
     * 强制移除玩家
     */
    removePlayer(sessionId: string, agentId: string): void;
    /**
     * 清理会话
     */
    cleanupSession(sessionId: string): void;
    /**
     * 完全清理
     */
    cleanup(): void;
}
export declare const reconnectionHandler: ReconnectionHandler;
//# sourceMappingURL=reconnection.d.ts.map