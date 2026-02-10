"use strict";
// src/server.ts - v0.4.2 with Countdown, CEO Monitor, and Reconnection
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ws_1 = require("ws");
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const sessions_1 = __importDefault(require("./routes/sessions"));
const sessionService_1 = require("./services/sessionService");
const countdown_1 = require("./utils/countdown");
const ceoActivityMonitor_1 = require("./services/ceoActivityMonitor");
const reconnection_1 = require("./services/reconnection");
const messageConfirmation_1 = require("./utils/messageConfirmation");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3004;
// Store WebSocket connections
const wsConnections = new Map();
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '0.4.2',
        features: ['countdown', 'ceo-monitor', 'reconnection', 'message-confirmation'],
        timestamp: new Date().toISOString(),
    });
});
// Static files
const webPath = path_1.default.join(__dirname, '../../web');
app.use(express_1.default.static(webPath));
// Routes
app.use('/api/sessions', sessions_1.default);
// Serve pages
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(webPath, 'observer.html'));
});
app.get('/dashboard', (req, res) => {
    res.sendFile(path_1.default.join(webPath, 'dashboard.html'));
});
// Error handling
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});
// Create HTTP server
const server = (0, http_1.createServer)(app);
// Create WebSocket server
const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
// ==================== Countdown Timer Events ====================
// 监听倒计时tick事件
countdown_1.countdownTimer.on('tick', (sessionId, state) => {
    broadcastToSession(sessionId, {
        type: 'countdown-tick',
        sessionId,
        phase: state.phase,
        remainingTime: state.remainingTime,
        formattedTime: countdown_1.countdownTimer.getFormattedTime(sessionId),
        isWarning: state.remainingTime <= 60000, // 最后60秒警告
    });
});
// 监听倒计时警告事件
countdown_1.countdownTimer.on('warning', (sessionId, state) => {
    broadcastToSession(sessionId, {
        type: 'countdown-warning',
        sessionId,
        phase: state.phase,
        message: `⏱️ ${state.phase}阶段即将结束，还剩1分钟！`,
        remainingTime: state.remainingTime,
    });
});
// 监听倒计时超时事件
countdown_1.countdownTimer.on('timeout', (sessionId, state) => {
    console.log(`[Server] Countdown timeout for session ${sessionId}, phase ${state.phase}`);
    // 自动推进到下一阶段
    const nextPhase = getNextPhase(state.phase);
    if (nextPhase) {
        sessionService_1.sessionService.transitionPhase(sessionId, nextPhase);
        broadcastToSession(sessionId, {
            type: 'phase-transition',
            sessionId,
            fromPhase: state.phase,
            toPhase: nextPhase,
            reason: 'countdown-timeout',
            message: `⏱️ ${state.phase}阶段时间到，自动进入${nextPhase}阶段`,
        });
        // 启动新阶段的倒计时
        if (nextPhase !== 'finished') {
            countdown_1.countdownTimer.startTimer(sessionId, nextPhase);
        }
    }
});
// ==================== CEO Activity Monitor Events ====================
// CEO提醒
ceoActivityMonitor_1.ceoActivityMonitor.on('ceo-reminder', (sessionId, data) => {
    broadcastToSession(sessionId, {
        type: 'ceo-reminder',
        sessionId,
        message: data.message,
        inactiveTime: ceoActivityMonitor_1.ceoActivityMonitor.getFormattedInactiveTime(sessionId),
    });
});
// CEO标记为离开
ceoActivityMonitor_1.ceoActivityMonitor.on('ceo-away', (sessionId, data) => {
    broadcastToSession(sessionId, {
        type: 'ceo-away',
        sessionId,
        message: data.message,
        status: 'away',
    });
});
// CEO恢复活跃
ceoActivityMonitor_1.ceoActivityMonitor.on('ceo-back', (sessionId) => {
    broadcastToSession(sessionId, {
        type: 'ceo-back',
        sessionId,
        message: '✅ CEO已回到游戏',
        status: 'active',
    });
});
// CEO自动推进
ceoActivityMonitor_1.ceoActivityMonitor.on('ceo-auto-progress', (sessionId, data) => {
    console.log(`[Server] CEO auto progress for session ${sessionId}`);
    const session = sessionService_1.sessionService.getSession(sessionId);
    if (session) {
        const nextPhase = getNextPhase(session.phase);
        if (nextPhase) {
            sessionService_1.sessionService.transitionPhase(sessionId, nextPhase);
            broadcastToSession(sessionId, {
                type: 'ceo-auto-progress',
                sessionId,
                message: data.message,
                fromPhase: session.phase,
                toPhase: nextPhase,
            });
            // 停止当前倒计时，启动新倒计时
            countdown_1.countdownTimer.stopTimer(sessionId);
            if (nextPhase !== 'finished') {
                countdown_1.countdownTimer.startTimer(sessionId, nextPhase);
            }
        }
    }
});
// ==================== Reconnection Handler Events ====================
reconnection_1.reconnectionHandler.on('player-reconnected', (sessionId, agentId, missedMessages) => {
    console.log(`[Server] Player reconnected: ${agentId} in session ${sessionId}`);
    broadcastToSession(sessionId, {
        type: 'player-reconnected',
        sessionId,
        agentId,
        message: `${agentId} 已重新连接`,
        missedMessagesCount: missedMessages.length,
    });
});
reconnection_1.reconnectionHandler.on('player-disconnected', (sessionId, agentId) => {
    console.log(`[Server] Player disconnected: ${agentId} in session ${sessionId}`);
    broadcastToSession(sessionId, {
        type: 'player-disconnected',
        sessionId,
        agentId,
        message: `${agentId} 暂时断开连接`,
    });
});
reconnection_1.reconnectionHandler.on('disconnect-timeout', (sessionId, agentId) => {
    console.log(`[Server] Player disconnect timeout: ${agentId} removed from ${sessionId}`);
    broadcastToSession(sessionId, {
        type: 'player-removed',
        sessionId,
        agentId,
        message: `${agentId} 因长时间离线被移出游戏`,
    });
});
// ==================== WebSocket Handling ====================
wss.on('connection', (ws, req) => {
    const wsId = (0, uuid_1.v4)();
    console.log(`[WebSocket] Client connected: ${wsId}`);
    wsConnections.set(wsId, ws);
    let sessionId = null;
    let agentId = null;
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            // 订阅会话
            if (data.type === 'subscribe' && data.sessionId) {
                sessionId = data.sessionId;
                agentId = data.agentId;
                console.log(`[WebSocket] ${wsId} subscribed to session ${sessionId}, agent ${agentId}`);
                // 记录连接（支持断线重连）
                if (agentId) {
                    const result = reconnection_1.reconnectionHandler.playerConnected(sessionId, agentId, wsId);
                    // 如果是重连，发送错过的消息
                    if (result.isReconnecting && result.missedMessages && result.missedMessages.length > 0) {
                        ws.send(JSON.stringify({
                            type: 'reconnected',
                            missedMessages: result.missedMessages,
                            message: `欢迎回来！您有 ${result.missedMessages.length} 条未读消息`,
                        }));
                    }
                }
                // 如果是CEO，开始监控活跃度
                if (agentId && sessionId) {
                    const session = sessionService_1.sessionService.getSession(sessionId);
                    if (session) {
                        const participant = session.participants.find(p => p.agentId === agentId);
                        if (participant && participant.role === 'ceo') {
                            ceoActivityMonitor_1.ceoActivityMonitor.startMonitoringSession(sessionId, agentId);
                        }
                    }
                }
                // 发送当前会话状态
                const session = sessionService_1.sessionService.getSession(sessionId);
                if (session) {
                    ws.send(JSON.stringify({
                        type: 'session-state',
                        sessionId,
                        data: {
                            phase: session.phase,
                            participants: session.participants,
                            countdown: countdown_1.countdownTimer.getState(sessionId),
                        },
                    }));
                }
            }
            // 心跳检测
            if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                // 更新最后看到时间
                if (sessionId && agentId) {
                    reconnection_1.reconnectionHandler.updateLastSeen(sessionId, agentId);
                    // 如果是CEO，记录活动
                    const session = sessionService_1.sessionService.getSession(sessionId);
                    if (session) {
                        const participant = session.participants.find(p => p.agentId === agentId);
                        if (participant && participant.role === 'ceo') {
                            ceoActivityMonitor_1.ceoActivityMonitor.recordActivity(sessionId);
                        }
                    }
                }
            }
            // 确认消息收到
            if (data.type === 'message-confirmed' && data.messageId) {
                messageConfirmation_1.messageConfirmationHandler.confirmMessageReceived(data.messageId);
            }
        }
        catch (err) {
            console.error('[WebSocket] Message error:', err);
        }
    });
    ws.on('close', () => {
        console.log(`[WebSocket] Client disconnected: ${wsId}`);
        wsConnections.delete(wsId);
        // 记录断开连接（支持重连）
        if (sessionId && agentId) {
            reconnection_1.reconnectionHandler.playerDisconnected(sessionId, agentId);
        }
    });
    ws.on('error', (err) => {
        console.error('[WebSocket] Error:', err);
    });
});
// ==================== Helper Functions ====================
/**
 * 广播消息到会话中的所有客户端
 */
function broadcastToSession(sessionId, data) {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === ws_1.WebSocket.OPEN) {
            // 这里简化处理，实际应该根据客户端订阅的session来过滤
            client.send(message);
        }
    });
}
/**
 * 获取下一阶段
 */
function getNextPhase(currentPhase) {
    const phases = ['waiting', 'agenda', 'debate', 'voting', 'executing', 'feedback', 'finished'];
    const currentIndex = phases.indexOf(currentPhase);
    if (currentIndex === -1 || currentIndex === phases.length - 1) {
        return null;
    }
    return phases[currentIndex + 1];
}
// ==================== Server Start ====================
server.listen(PORT, () => {
    console.log(`🚀 CorpSim Server v0.4.2 running on port ${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`✨ Features: countdown, ceo-monitor, reconnection, message-confirmation`);
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    countdown_1.countdownTimer.cleanup();
    ceoActivityMonitor_1.ceoActivityMonitor.cleanup();
    reconnection_1.reconnectionHandler.cleanup();
    messageConfirmation_1.messageConfirmationHandler.cleanup();
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
//# sourceMappingURL=server.js.map