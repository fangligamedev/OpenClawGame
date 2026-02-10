// src/server.ts - v0.4.2 with Countdown, CEO Monitor, and Reconnection

import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sessionRoutes from './routes/sessions';
import { sessionService } from './services/sessionService';
import { countdownTimer } from './utils/countdown';
import { ceoActivityMonitor } from './services/ceoActivityMonitor';
import { reconnectionHandler } from './services/reconnection';
import { messageConfirmationHandler } from './utils/messageConfirmation';
import { MeetingPhase } from './models/types';

const app = express();
const PORT = process.env.PORT || 3004;

// Store WebSocket connections
const wsConnections: Map<string, WebSocket> = new Map();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
const webPath = path.join(__dirname, '../../web');
app.use(express.static(webPath));

// Routes
app.use('/api/sessions', sessionRoutes);

// Serve pages
app.get('/', (req, res) => {
  res.sendFile(path.join(webPath, 'observer.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(webPath, 'dashboard.html'));
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

// ==================== Countdown Timer Events ====================

// 监听倒计时tick事件
countdownTimer.on('tick', (sessionId: string, state: any) => {
  broadcastToSession(sessionId, {
    type: 'countdown-tick',
    sessionId,
    phase: state.phase,
    remainingTime: state.remainingTime,
    formattedTime: countdownTimer.getFormattedTime(sessionId),
    isWarning: state.remainingTime <= 60000, // 最后60秒警告
  });
});

// 监听倒计时警告事件
countdownTimer.on('warning', (sessionId: string, state: any) => {
  broadcastToSession(sessionId, {
    type: 'countdown-warning',
    sessionId,
    phase: state.phase,
    message: `⏱️ ${state.phase}阶段即将结束，还剩1分钟！`,
    remainingTime: state.remainingTime,
  });
});

// 监听倒计时超时事件
countdownTimer.on('timeout', (sessionId: string, state: any) => {
  console.log(`[Server] Countdown timeout for session ${sessionId}, phase ${state.phase}`);
  
  // 自动推进到下一阶段
  const nextPhase = getNextPhase(state.phase);
  if (nextPhase) {
    sessionService.transitionPhase(sessionId, nextPhase);
    
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
      countdownTimer.startTimer(sessionId, nextPhase as any);
    }
  }
});

// ==================== CEO Activity Monitor Events ====================

// CEO提醒
ceoActivityMonitor.on('ceo-reminder', (sessionId: string, data: any) => {
  broadcastToSession(sessionId, {
    type: 'ceo-reminder',
    sessionId,
    message: data.message,
    inactiveTime: ceoActivityMonitor.getFormattedInactiveTime(sessionId),
  });
});

// CEO标记为离开
ceoActivityMonitor.on('ceo-away', (sessionId: string, data: any) => {
  broadcastToSession(sessionId, {
    type: 'ceo-away',
    sessionId,
    message: data.message,
    status: 'away',
  });
});

// CEO恢复活跃
ceoActivityMonitor.on('ceo-back', (sessionId: string) => {
  broadcastToSession(sessionId, {
    type: 'ceo-back',
    sessionId,
    message: '✅ CEO已回到游戏',
    status: 'active',
  });
});

// CEO自动推进
ceoActivityMonitor.on('ceo-auto-progress', (sessionId: string, data: any) => {
  console.log(`[Server] CEO auto progress for session ${sessionId}`);
  
  const session = sessionService.getSession(sessionId);
  if (session) {
    const nextPhase = getNextPhase(session.phase);
    if (nextPhase) {
      sessionService.transitionPhase(sessionId, nextPhase);
      
      broadcastToSession(sessionId, {
        type: 'ceo-auto-progress',
        sessionId,
        message: data.message,
        fromPhase: session.phase,
        toPhase: nextPhase,
      });
      
      // 停止当前倒计时，启动新倒计时
      countdownTimer.stopTimer(sessionId);
      if (nextPhase !== 'finished') {
        countdownTimer.startTimer(sessionId, nextPhase as any);
      }
    }
  }
});

// ==================== Reconnection Handler Events ====================

reconnectionHandler.on('player-reconnected', (sessionId: string, agentId: string, missedMessages: any[]) => {
  console.log(`[Server] Player reconnected: ${agentId} in session ${sessionId}`);
  
  broadcastToSession(sessionId, {
    type: 'player-reconnected',
    sessionId,
    agentId,
    message: `${agentId} 已重新连接`,
    missedMessagesCount: missedMessages.length,
  });
});

reconnectionHandler.on('player-disconnected', (sessionId: string, agentId: string) => {
  console.log(`[Server] Player disconnected: ${agentId} in session ${sessionId}`);
  
  broadcastToSession(sessionId, {
    type: 'player-disconnected',
    sessionId,
    agentId,
    message: `${agentId} 暂时断开连接`,
  });
});

reconnectionHandler.on('disconnect-timeout', (sessionId: string, agentId: string) => {
  console.log(`[Server] Player disconnect timeout: ${agentId} removed from ${sessionId}`);
  
  broadcastToSession(sessionId, {
    type: 'player-removed',
    sessionId,
    agentId,
    message: `${agentId} 因长时间离线被移出游戏`,
  });
});

// ==================== WebSocket Handling ====================

wss.on('connection', (ws: WebSocket, req) => {
  const wsId = uuidv4();
  console.log(`[WebSocket] Client connected: ${wsId}`);
  
  wsConnections.set(wsId, ws);
  
  let sessionId: string | null = null;
  let agentId: string | null = null;

  ws.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      
      // 订阅会话
      if (data.type === 'subscribe' && data.sessionId) {
        sessionId = data.sessionId;
        agentId = data.agentId;
        
        console.log(`[WebSocket] ${wsId} subscribed to session ${sessionId}, agent ${agentId}`);
        
        // 记录连接（支持断线重连）
        if (agentId && sessionId) {
          const result = reconnectionHandler.playerConnected(sessionId as string, agentId as string, wsId);
          
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
          const session = sessionService.getSession(sessionId);
          if (session) {
            const participant = session.participants.find(p => p.agentId === agentId);
            if (participant && participant.role === 'ceo') {
              ceoActivityMonitor.startMonitoringSession(sessionId, agentId as string);
            }
          }
        }
        
        // 发送当前会话状态
        const session = sessionService.getSession(sessionId);
        if (session) {
          ws.send(JSON.stringify({
            type: 'session-state',
            sessionId,
            data: {
              phase: session.phase,
              participants: session.participants,
              countdown: countdownTimer.getState(sessionId),
            },
          }));
        }
      }
      
      // 心跳检测
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        
        // 更新最后看到时间
        if (sessionId && agentId) {
          reconnectionHandler.updateLastSeen(sessionId as string, agentId as string);

          // 如果是CEO，记录活动
          const session = sessionService.getSession(sessionId as string);
          if (session) {
            const participant = session.participants.find(p => p.agentId === agentId);
            if (participant && participant.role === 'ceo') {
              ceoActivityMonitor.recordActivity(sessionId as string);
            }
          }
        }
      }
      
      // 确认消息收到
      if (data.type === 'message-confirmed' && data.messageId) {
        messageConfirmationHandler.confirmMessageReceived(data.messageId);
      }
      
    } catch (err) {
      console.error('[WebSocket] Message error:', err);
    }
  });

  ws.on('close', () => {
    console.log(`[WebSocket] Client disconnected: ${wsId}`);
    wsConnections.delete(wsId);
    
    // 记录断开连接（支持重连）
    if (sessionId && agentId) {
      reconnectionHandler.playerDisconnected(sessionId, agentId as string);
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
function broadcastToSession(sessionId: string, data: any): void {
  const message = JSON.stringify(data);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      // 这里简化处理，实际应该根据客户端订阅的session来过滤
      client.send(message);
    }
  });
}

/**
 * 获取下一阶段
 */
function getNextPhase(currentPhase: string): MeetingPhase | null {
  const phases: MeetingPhase[] = ['waiting', 'agenda', 'debate', 'voting', 'executing', 'feedback', 'finished'];
  const currentIndex = phases.indexOf(currentPhase as MeetingPhase);
  
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
  
  countdownTimer.cleanup();
  ceoActivityMonitor.cleanup();
  reconnectionHandler.cleanup();
  messageConfirmationHandler.cleanup();
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
