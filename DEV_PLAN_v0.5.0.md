# CorpSim v0.5.0 详细开发计划

**基于 OpenCode + Kimi K2.5 分析**
**制定日期**: 2026-02-10

---

## 📊 功能依赖关系分析

```
┌─────────────────────────────────────────────────────────┐
│                    功能依赖关系图                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────────┐                                    │
│  │ FR-003 消息同步 │ ←── 最基础，其他功能依赖            │
│  │     P0          │                                    │
│  └────────┬────────┘                                    │
│           │                                             │
│     ┌─────┴─────┐                                       │
│     │           │                                       │
│  ┌──▼───┐   ┌───▼────┐                                  │
│  │FR-001│   │ FR-002 │                                  │
│  │CEO   │   │倒计时  │                                  │
│  │监控  │   │系统    │                                  │
│  │P0    │   │P0      │                                  │
│  └──┬───┘   └───┬────┘                                  │
│     │           │                                       │
│     └─────┬─────┘                                       │
│           │                                             │
│     ┌─────▼─────┐                                       │
│     │ FR-004   │                                       │
│     │议程投票  │                                       │
│     │P1        │                                       │
│     └─────┬─────┘                                       │
│           │                                             │
│     ┌─────▼─────┐                                       │
│     │ FR-005   │                                       │
│     │通知系统  │                                       │
│     │P1        │                                       │
│     └─────┬─────┘                                       │
│           │                                             │
│     ┌─────▼─────┐                                       │
│     │ FR-006   │                                       │
│     │AI增强    │                                       │
│     │P1        │                                       │
│     └───────────┘                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 开发优先级排序

### 第一阶段 (v0.4.2) - P0 紧急修复 - 3天

| 顺序 | 功能 | 文件 | 难度 | 时间 |
|------|------|------|------|------|
| 1 | FR-003 消息同步 | sessionService.ts, routes/sessions.ts | ⭐⭐ | 1天 |
| 2 | FR-002 倒计时系统 | countdown.ts, server.ts | ⭐⭐⭐ | 1.5天 |
| 3 | FR-001 CEO监控 | ceoActivity.ts, server.ts | ⭐⭐ | 0.5天 |

### 第二阶段 (v0.5.0) - P1 核心功能 - 4天

| 顺序 | 功能 | 文件 | 难度 | 时间 |
|------|------|------|------|------|
| 4 | FR-004 议程投票 | agenda.ts, vote.ts | ⭐⭐⭐ | 2天 |
| 5 | FR-005 通知系统 | notification.ts | ⭐⭐ | 1天 |
| 6 | FR-006 AI增强 | aiPlayer.ts | ⭐⭐⭐ | 1天 |

### 第三阶段 (v0.5.1) - P2 体验优化 - 3天

| 顺序 | 功能 | 文件 | 难度 | 时间 |
|------|------|------|------|------|
| 7 | FR-007 游戏仪表板 | dashboard.ts | ⭐⭐ | 1.5天 |
| 8 | FR-008 角色唯一性 | sessionService.ts | ⭐⭐ | 0.5天 |
| 9 | 集成测试 | tests/ | ⭐⭐ | 1天 |

---

## 📁 详细文件修改清单

### FR-003: 消息同步保障

**修改文件**:
```
server/src/services/sessionService.ts
  ├─ sendMessage() - 添加确认回执
  ├─ addMessageToSession() - 新增
  └─ broadcastMessage() - 增强

server/src/routes/sessions.ts
  └─ POST /messages - 添加重试逻辑

server/src/types/message.ts (新增)
  ├─ MessageStatus: 'sending' | 'delivered' | 'failed'
  └─ MessageReceipt 接口
```

**代码示例**:
```typescript
// server/src/services/sessionService.ts
async sendMessageWithConfirmation(
  sessionId: string, 
  req: SendMessageRequest
): Promise<MessageReceipt> {
  const session = this.sessions.get(sessionId);
  if (!session) throw new Error('Session not found');
  
  const message: Message = {
    id: uuidv4(),
    status: 'sending',
    // ... 其他字段
  };
  
  // 1. 存储消息
  session.messages.push(message);
  
  // 2. 广播消息
  try {
    await this.broadcastWithRetry(sessionId, message);
    message.status = 'delivered';
  } catch (error) {
    message.status = 'failed';
    throw error;
  }
  
  return {
    messageId: message.id,
    status: message.status,
    timestamp: message.timestamp
  };
}
```

---

### FR-002: 倒计时系统

**新增文件**:
```
server/src/utils/countdown.ts
  ├─ CountdownTimer 类
  ├─ startTimer(sessionId, phase, duration)
  ├─ pauseTimer(sessionId)
  ├─ resumeTimer(sessionId)
  └─ onTimeout(callback)

server/src/services/phaseManager.ts
  ├─ managePhaseTransition()
  └─ autoProgressPhase()
```

**修改文件**:
```
server/src/services/sessionService.ts
  └─ transitionPhase() - 集成倒计时

server/src/server.ts
  └─ WebSocket - 广播倒计时更新
```

**代码示例**:
```typescript
// server/src/utils/countdown.ts
export class CountdownTimer {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  
  startTimer(
    sessionId: string, 
    phase: string, 
    durationMs: number,
    onTick: (remaining: number) => void,
    onTimeout: () => void
  ): void {
    const startTime = Date.now();
    const endTime = startTime + durationMs;
    
    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      
      onTick(remaining);
      
      if (remaining <= 0) {
        onTimeout();
      } else {
        const nextTick = Math.min(1000, remaining);
        this.timers.set(sessionId, setTimeout(tick, nextTick));
      }
    };
    
    tick();
  }
  
  stopTimer(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(sessionId);
    }
  }
}

// 阶段时间配置
export const PHASE_DURATIONS = {
  agenda: 10 * 60 * 1000,    // 10分钟
  voting: 5 * 60 * 1000,     // 5分钟
  executing: 3 * 60 * 1000,  // 3分钟
};
```

---

### FR-001: CEO活跃度监控

**新增文件**:
```
server/src/services/ceoActivityMonitor.ts
  ├─ CEOActivityMonitor 类
  ├─ startMonitoring(sessionId)
  ├─ recordActivity(sessionId, agentId)
  └─ checkInactivity()
```

**代码示例**:
```typescript
// server/src/services/ceoActivityMonitor.ts
export class CEOActivityMonitor {
  private activityMap: Map<string, number> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  
  // 配置
  private readonly REMINDER_TIME = 5 * 60 * 1000;   // 5分钟
  private readonly AWAY_TIME = 10 * 60 * 1000;      // 10分钟
  private readonly AUTO_PROGRESS_TIME = 15 * 60 * 1000; // 15分钟
  
  startMonitoring(sessionId: string): void {
    this.activityMap.set(sessionId, Date.now());
    
    this.checkInterval = setInterval(() => {
      this.checkInactivity(sessionId);
    }, 60000); // 每分钟检查
  }
  
  recordActivity(sessionId: string): void {
    this.activityMap.set(sessionId, Date.now());
  }
  
  private checkInactivity(sessionId: string): void {
    const lastActive = this.activityMap.get(sessionId);
    if (!lastActive) return;
    
    const inactiveTime = Date.now() - lastActive;
    
    if (inactiveTime >= this.AUTO_PROGRESS_TIME) {
      // 15分钟 - 自动推进
      this.autoProgress(sessionId);
    } else if (inactiveTime >= this.AWAY_TIME) {
      // 10分钟 - 标记离开
      this.markCEOAsAway(sessionId);
    } else if (inactiveTime >= this.REMINDER_TIME) {
      // 5分钟 - 发送提醒
      this.sendReminder(sessionId);
    }
  }
  
  private sendReminder(sessionId: string): void {
    // 广播提醒消息
    sessionService.broadcastMessage(sessionId, {
      type: 'system',
      content: '@CEO 已5分钟无响应，请尽快参与讨论'
    });
  }
  
  private markCEOAsAway(sessionId: string): void {
    // 更新CEO状态
    sessionService.updateParticipantStatus(sessionId, 'ceo', 'away');
  }
  
  private autoProgress(sessionId: string): void {
    // 自动推进到下一阶段
    sessionService.transitionPhase(sessionId, 'next');
  }
}
```

---

## 📅 开发时间表

### Week 1: v0.4.2 P0 紧急修复 (2月10日-12日)

| 日期 | 任务 | 负责人 | 产出 |
|------|------|--------|------|
| 2/10 | FR-003 消息同步修复 | 弦子 | 消息确认机制完成 |
| 2/11 | FR-002 倒计时系统 | 弦子 | 倒计时功能完成 |
| 2/11 | FR-001 CEO监控 | 弦子 | 活跃度监控完成 |
| 2/12 | 集成测试 | 弦子 | v0.4.2 发布 |

### Week 2: v0.5.0 P1 核心功能 (2月13日-16日)

| 日期 | 任务 | 负责人 | 产出 |
|------|------|--------|------|
| 2/13-14 | FR-004 议程投票 | 弦子 | 投票系统完成 |
| 2/15 | FR-005 通知系统 | 弦子 | 通知功能完成 |
| 2/16 | FR-006 AI增强 | 弦子 | AI智能参与完成 |

### Week 3: v0.5.1 P2 优化 (2月17日-19日)

| 日期 | 任务 | 负责人 | 产出 |
|------|------|--------|------|
| 2/17-18 | FR-007 仪表板 | 弦子 | 可视化界面完成 |
| 2/18 | FR-008 角色唯一性 | 弦子 | 角色管理完成 |
| 2/19 | 完整测试 | 弦子 | v0.5.1 发布 |

---

## 🔧 关键技术点

### 1. WebSocket 广播可靠性

```typescript
// 带重试的广播
async function broadcastWithRetry(
  sessionId: string, 
  message: any, 
  maxRetries = 3
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await wss.broadcast(sessionId, message);
      return; // 成功
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await delay(1000 * (i + 1)); // 指数退避
    }
  }
}
```

### 2. 定时器管理

```typescript
// 避免内存泄漏
class TimerManager {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  
  setTimer(id: string, callback: () => void, delay: number): void {
    this.clearTimer(id); // 清除旧定时器
    const timer = setTimeout(callback, delay);
    this.timers.set(id, timer);
  }
  
  clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
  
  clearAll(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}
```

### 3. 消息幂等性

```typescript
// 防止重复消息
const processedMessageIds = new Set<string>();

function processMessage(message: Message): void {
  if (processedMessageIds.has(message.id)) {
    return; // 已处理，跳过
  }
  
  // 处理消息
  displayMessage(message);
  
  // 记录已处理
  processedMessageIds.add(message.id);
  
  // 限制集合大小
  if (processedMessageIds.size > 1000) {
    const first = processedMessageIds.values().next().value;
    processedMessageIds.delete(first);
  }
}
```

---

## 🧪 测试计划

### 单元测试

```typescript
// countdown.test.ts
describe('CountdownTimer', () => {
  it('should call onTimeout when time expires', (done) => {
    const timer = new CountdownTimer();
    timer.startTimer(
      'test-session',
      'agenda',
      100, // 100ms for testing
      () => {}, // onTick
      () => {
        done(); // Should be called
      }
    );
  });
});

// ceoMonitor.test.ts
describe('CEOActivityMonitor', () => {
  it('should send reminder after 5 minutes', () => {
    const monitor = new CEOActivityMonitor();
    const spy = jest.spyOn(monitor, 'sendReminder');
    
    monitor.startMonitoring('test-session');
    jest.advanceTimersByTime(5 * 60 * 1000);
    
    expect(spy).toHaveBeenCalled();
  });
});
```

### 集成测试

```typescript
// gameFlow.test.ts
describe('Complete Game Flow', () => {
  it('should complete a 3-player game', async () => {
    // 1. Create session
    const session = await createSession('Test Corp');
    
    // 2. Join 3 players
    await joinSession(session.id, 'ceo', 'player1');
    await joinSession(session.id, 'cto', 'player2');
    await joinSession(session.id, 'cmo', 'player3');
    
    // 3. Start game
    expect(session.phase).toBe('agenda');
    
    // 4. Send messages
    await sendMessage(session.id, 'ceo', 'Hello');
    
    // 5. Wait for countdown
    jest.advanceTimersByTime(10 * 60 * 1000);
    expect(session.phase).toBe('voting');
    
    // 6. Vote
    await submitVote(session.id, 'ceo', 'option1');
    await submitVote(session.id, 'cto', 'option1');
    await submitVote(session.id, 'cmo', 'option1');
    
    // 7. Check result
    expect(session.phase).toBe('executing');
  });
});
```

---

## ⚠️ 风险评估

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| WebSocket不稳定 | 中 | 高 | 实现重连机制和心跳检测 |
| 定时器漂移 | 低 | 中 | 使用服务器端权威时间 |
| 内存泄漏 | 低 | 高 | 定期清理定时器和缓存 |
| 并发冲突 | 中 | 中 | 使用乐观锁或队列 |

---

## ✅ 验收标准

- [ ] 消息发送成功率 > 99%
- [ ] 倒计时误差 < 1秒
- [ ] CEO 15分钟无响应自动推进
- [ ] 3人完整游戏流程 < 45分钟
- [ ] 代码覆盖率 > 80%

---

**计划制定**: 弦子 (AI产品助理)  
**制定时间**: 2026-02-10  
**审核状态**: 待麦子CTO和大Q CMO确认

---

*本文档基于 OpenCode + Kimi K2.5 分析生成*
