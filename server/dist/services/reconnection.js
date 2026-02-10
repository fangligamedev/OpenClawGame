"use strict";
// server/src/services/reconnection.ts
// 玩家断线重连和状态同步机制
Object.defineProperty(exports, "__esModule", { value: true });
exports.reconnectionHandler = exports.ReconnectionHandler = exports.DEFAULT_RECONNECTION_CONFIG = void 0;
const events_1 = require("events");
// 默认配置
exports.DEFAULT_RECONNECTION_CONFIG = {
    disconnectTimeout: 5 * 60 * 1000, // 5分钟
    messageBufferSize: 100, // 缓存最近100条消息
    syncInterval: 5000, // 5秒检查一次
};
class ReconnectionHandler extends events_1.EventEmitter {
    connections = new Map();
    states = new Map();
    disconnectTimers = new Map();
    config;
    checkInterval = null;
    constructor(config = exports.DEFAULT_RECONNECTION_CONFIG) {
        super();
        this.config = config;
        this.startCleanupInterval();
    }
    /**
     * 玩家连接
     */
    playerConnected(sessionId, agentId, wsId) {
        const connectionKey = `${sessionId}:${agentId}`;
        const existingConnection = this.connections.get(connectionKey);
        // 如果是断线重连
        if (existingConnection && !existingConnection.connected) {
            console.log(`[Reconnection] Player reconnecting: ${agentId} in session ${sessionId}`);
            // 清除断线定时器
            this.clearDisconnectTimer(connectionKey);
            // 更新连接状态
            existingConnection.connected = true;
            existingConnection.lastSeen = Date.now();
            existingConnection.wsId = wsId;
            delete existingConnection.disconnectTime;
            // 获取错过的消息
            const state = this.states.get(connectionKey);
            const missedMessages = state ? state.bufferedMessages : [];
            // 触发重连事件
            this.emit('player-reconnected', sessionId, agentId, missedMessages);
            return {
                isReconnecting: true,
                missedMessages,
            };
        }
        // 新连接
        const connection = {
            agentId,
            sessionId,
            connected: true,
            lastSeen: Date.now(),
            wsId,
        };
        this.connections.set(connectionKey, connection);
        // 初始化状态
        if (!this.states.has(connectionKey)) {
            this.states.set(connectionKey, {
                sessionId,
                agentId,
                lastSequence: 0,
                bufferedMessages: [],
            });
        }
        console.log(`[Reconnection] Player connected: ${agentId} in session ${sessionId}`);
        this.emit('player-connected', sessionId, agentId);
        return { isReconnecting: false };
    }
    /**
     * 玩家断开连接
     */
    playerDisconnected(sessionId, agentId) {
        const connectionKey = `${sessionId}:${agentId}`;
        const connection = this.connections.get(connectionKey);
        if (!connection)
            return;
        connection.connected = false;
        connection.disconnectTime = Date.now();
        console.log(`[Reconnection] Player disconnected: ${agentId} in session ${sessionId}`);
        this.emit('player-disconnected', sessionId, agentId);
        // 设置断线定时器
        const timer = setTimeout(() => {
            this.onDisconnectTimeout(sessionId, agentId);
        }, this.config.disconnectTimeout);
        this.disconnectTimers.set(connectionKey, timer);
    }
    /**
     * 断线超时处理
     */
    onDisconnectTimeout(sessionId, agentId) {
        const connectionKey = `${sessionId}:${agentId}`;
        console.log(`[Reconnection] Disconnect timeout: ${agentId} removed from session ${sessionId}`);
        // 清理连接
        this.connections.delete(connectionKey);
        this.states.delete(connectionKey);
        this.disconnectTimers.delete(connectionKey);
        // 触发超时事件
        this.emit('disconnect-timeout', sessionId, agentId);
    }
    /**
     * 缓存消息
     */
    bufferMessage(sessionId, message) {
        // 为会话中的每个玩家缓存消息
        this.connections.forEach((connection, key) => {
            if (connection.sessionId === sessionId) {
                const state = this.states.get(key);
                if (state) {
                    state.bufferedMessages.push(message);
                    // 限制缓存大小
                    if (state.bufferedMessages.length > this.config.messageBufferSize) {
                        state.bufferedMessages.shift();
                    }
                }
            }
        });
    }
    /**
     * 确认消息已接收
     */
    confirmMessageReceived(sessionId, agentId, messageId) {
        const connectionKey = `${sessionId}:${agentId}`;
        const state = this.states.get(connectionKey);
        if (!state)
            return;
        // 从缓存中移除已确认的消息
        state.bufferedMessages = state.bufferedMessages.filter(msg => msg.id !== messageId);
    }
    /**
     * 更新最后看到时间
     */
    updateLastSeen(sessionId, agentId) {
        const connectionKey = `${sessionId}:${agentId}`;
        const connection = this.connections.get(connectionKey);
        if (connection) {
            connection.lastSeen = Date.now();
        }
    }
    /**
     * 心跳检测
     */
    heartbeat(sessionId, agentId) {
        this.updateLastSeen(sessionId, agentId);
        return { status: 'ok' };
    }
    /**
     * 获取连接状态
     */
    getConnectionStatus(sessionId, agentId) {
        const connectionKey = `${sessionId}:${agentId}`;
        return this.connections.get(connectionKey);
    }
    /**
     * 检查玩家是否在线
     */
    isPlayerConnected(sessionId, agentId) {
        const connection = this.getConnectionStatus(sessionId, agentId);
        return connection ? connection.connected : false;
    }
    /**
     * 获取会话中的所有连接
     */
    getSessionConnections(sessionId) {
        const connections = [];
        this.connections.forEach((connection) => {
            if (connection.sessionId === sessionId) {
                connections.push(connection);
            }
        });
        return connections;
    }
    /**
     * 获取在线玩家列表
     */
    getOnlinePlayers(sessionId) {
        return this.getSessionConnections(sessionId)
            .filter(conn => conn.connected)
            .map(conn => conn.agentId);
    }
    /**
     * 获取离线但保留位置的玩家
     */
    getDisconnectedPlayers(sessionId) {
        return this.getSessionConnections(sessionId)
            .filter(conn => !conn.connected)
            .map(conn => conn.agentId);
    }
    /**
     * 清除断线定时器
     */
    clearDisconnectTimer(connectionKey) {
        const timer = this.disconnectTimers.get(connectionKey);
        if (timer) {
            clearTimeout(timer);
            this.disconnectTimers.delete(connectionKey);
        }
    }
    /**
     * 启动清理定时器
     */
    startCleanupInterval() {
        this.checkInterval = setInterval(() => {
            this.cleanupExpiredConnections();
        }, this.config.syncInterval);
    }
    /**
     * 清理过期连接
     */
    cleanupExpiredConnections() {
        const now = Date.now();
        this.connections.forEach((connection, key) => {
            // 清理长时间无响应的连接
            if (connection.connected && now - connection.lastSeen > this.config.disconnectTimeout * 2) {
                console.log(`[Reconnection] Cleaning up stale connection: ${key}`);
                this.playerDisconnected(connection.sessionId, connection.agentId);
            }
        });
    }
    /**
     * 强制移除玩家
     */
    removePlayer(sessionId, agentId) {
        const connectionKey = `${sessionId}:${agentId}`;
        this.clearDisconnectTimer(connectionKey);
        this.connections.delete(connectionKey);
        this.states.delete(connectionKey);
        console.log(`[Reconnection] Player removed: ${agentId} from session ${sessionId}`);
    }
    /**
     * 清理会话
     */
    cleanupSession(sessionId) {
        this.connections.forEach((connection, key) => {
            if (connection.sessionId === sessionId) {
                this.clearDisconnectTimer(key);
                this.connections.delete(key);
                this.states.delete(key);
            }
        });
        console.log(`[Reconnection] Session cleaned up: ${sessionId}`);
    }
    /**
     * 完全清理
     */
    cleanup() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.disconnectTimers.forEach(timer => clearTimeout(timer));
        this.disconnectTimers.clear();
        this.connections.clear();
        this.states.clear();
        console.log('[Reconnection] All cleaned up');
    }
}
exports.ReconnectionHandler = ReconnectionHandler;
// 导出单例
exports.reconnectionHandler = new ReconnectionHandler();
//# sourceMappingURL=reconnection.js.map