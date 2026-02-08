# CorpSim v1.0 开发路线图

> 基于 OpenClawGame 仓库的部署成功后的持续开发计划

---

## 🎉 当前状态

| 项目 | 状态 |
|------|------|
| **GitHub 仓库** | ✅ https://github.com/fangligamedev/OpenClawGame |
| **Railway 部署** | ✅ https://openclawgame-production.up.railway.app/ |
| **健康检查** | ✅ /api/health 正常 |
| **基础功能** | ✅ 3人模式、WebSocket、AI替补 |

---

## 🎯 v1.0 开发目标

### Phase 1: 数据库持久化（Week 1）
- [ ] PostgreSQL 数据库集成
- [ ] 会话数据持久化
- [ ] 玩家数据持久化
- [ ] 消息历史记录
- [ ] 游戏状态恢复

**技术点**:
```typescript
// 数据库 Schema
- sessions (会话表)
- participants (参与者表)
- messages (消息表)
- company_states (公司状态表)
- game_history (游戏历史表)
```

---

### Phase 2: 游戏机制优化（Week 2）
- [ ] 阶段倒计时系统
- [ ] 超时自动推进
- [ ] 随机事件触发
- [ ] 决策反馈机制
- [ ] 多公司竞争模式

**核心功能**:
```
WAITING → AGENDA (10min) → DEBATE (15min) → VOTING (5min) → EXECUTING → FEEDBACK
```

---

### Phase 3: AI 增强（Week 3）
- [ ] AI CEO 决策逻辑
- [ ] AI CTO 技术方案
- [ ] AI CMO 市场策略
- [ ] AI 投票机制
- [ ] AI 消息生成

**AI 特性**:
- 基于当前游戏状态做决策
- 参与讨论和辩论
- 模拟真实玩家行为

---

### Phase 4: Web 界面升级（Week 4）
- [ ] 响应式 Dashboard
- [ ] 实时数据可视化
- [ ] 游戏回放功能
- [ ] 排行榜系统
- [ ] 移动端适配

---

## 📅 详细开发计划

### Week 1: 数据库持久化

#### Day 1-2: 数据库设计
```sql
-- 会话表
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  company_name VARCHAR(255),
  quarter INTEGER,
  phase VARCHAR(50),
  company_state JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- 参与者表
CREATE TABLE participants (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  agent_id VARCHAR(255),
  role VARCHAR(50),
  type VARCHAR(50),
  joined_at TIMESTAMP
);

-- 消息表
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  author_id VARCHAR(255),
  content TEXT,
  timestamp TIMESTAMP,
  type VARCHAR(50)
);
```

#### Day 3-4: 数据库集成
- [ ] 安装 pg 依赖
- [ ] 创建数据库连接池
- [ ] 修改 SessionService 支持数据库
- [ ] 添加数据持久化逻辑

#### Day 5-7: 测试与优化
- [ ] 测试数据持久化
- [ ] 测试数据恢复
- [ ] 性能优化
- [ ] 错误处理

---

### Week 2: 游戏机制

#### Day 1-2: 倒计时系统
```typescript
// 阶段倒计时配置
const PHASE_COUNTDOWN = {
  agenda: 10 * 60 * 1000,    // 10分钟
  debate: 15 * 60 * 1000,    // 15分钟
  voting: 5 * 60 * 1000,     // 5分钟
  executing: 3 * 60 * 1000,  // 3分钟
};
```

#### Day 3-4: 自动推进
- [ ] 超时检测
- [ ] 自动进入下一阶段
- [ ] 通知所有玩家
- [ ] 保存阶段历史

#### Day 5-7: 随机事件
- [ ] 事件触发器
- [ ] 事件效果应用
- [ ] 事件通知
- [ ] 事件历史记录

---

## 🔧 技术架构

### 当前架构
```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ WebSocket / HTTP
       ▼
┌─────────────┐
│   Railway   │
│   (Node.js) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Memory    │
│   (临时)    │
└─────────────┘
```

### 目标架构
```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ WebSocket / HTTP
       ▼
┌─────────────┐
│   Railway   │
│   (Node.js) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  PostgreSQL │
│  (持久化)   │
└─────────────┘
```

---

## 📝 API 扩展计划

### 新增端点

```typescript
// 数据库相关
GET    /api/sessions/:id/history    // 获取会话历史
GET    /api/sessions/archived        // 获取已归档会话
POST   /api/sessions/:id/archive     // 归档会话

// 统计相关
GET    /api/stats/sessions           // 会话统计
GET    /api/stats/players/:id        // 玩家统计
GET    /api/leaderboard              // 排行榜

// 回放相关
GET    /api/replay/:sessionId        // 获取回放数据
```

---

## 🎮 游戏玩法设计

### 完整游戏流程

```
1. 创建公司
   ↓
2. 等待玩家加入（3人）
   ↓
3. 第1季度开始
   ├─ AGENDA 阶段（10分钟）
   │  └─ 提出议题
   │
   ├─ DEBATE 阶段（15分钟）
   │  └─ 讨论方案
   │
   ├─ VOTING 阶段（5分钟）
   │  └─ 投票决策
   │
   ├─ EXECUTING 阶段（3分钟）
   │  └─ 执行决策
   │
   └─ FEEDBACK 阶段
      └─ 查看结果
         ↓
4. 随机事件发生
   ↓
5. 第2季度开始...
   ↓
6. 4季度后游戏结束
   ↓
7. 查看最终排名
```

---

## 🔐 环境变量配置

### 必需变量
```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
PORT=3004
NODE_ENV=production
```

### 可选变量
```env
PHASE_TIMEOUT_AGENDA=600000      # 10分钟
PHASE_TIMEOUT_DEBATE=900000      # 15分钟
PHASE_TIMEOUT_VOTING=300000      # 5分钟
ENABLE_AI_SUBSTITUTE=true
MAX_QUARTERS=4
```

---

## 📊 开发进度追踪

| Week | 目标 | 状态 | 完成日期 |
|------|------|------|----------|
| Week 1 | 数据库持久化 | 🔄 进行中 | - |
| Week 2 | 游戏机制优化 | ⏳ 待开始 | - |
| Week 3 | AI 增强 | ⏳ 待开始 | - |
| Week 4 | Web 界面 | ⏳ 待开始 | - |

---

## 🚀 下一步行动

### 立即开始：数据库集成

1. **创建 PostgreSQL 数据库**
   - Railway Dashboard → New → Database → PostgreSQL
   - 复制 DATABASE_URL

2. **更新代码**
   ```bash
   npm install pg
   npm install -D @types/pg
   ```

3. **配置环境变量**
   - Railway Dashboard → Variables → Add DATABASE_URL

4. **修改 SessionService**
   - 添加数据库读写逻辑
   - 保持内存缓存作为备份

---

## 💡 开发建议

1. **分支管理**
   ```
   main           ← 稳定版本
   ├── develop    ← 开发分支
   ├── feature/db-integration
   ├── feature/countdown
   └── feature/ai-enhancement
   ```

2. **提交规范**
   ```
   feat: 添加数据库连接
   fix: 修复会话保存问题
   docs: 更新API文档
   test: 添加数据库测试
   ```

3. **测试策略**
   - 单元测试：Service 层逻辑
   - 集成测试：数据库操作
   - E2E 测试：完整游戏流程

---

## 📚 参考资源

- [PostgreSQL + Node.js](https://node-postgres.com/)
- [Railway PostgreSQL](https://docs.railway.app/databases/postgresql)
- [TypeScript 数据库操作](https://github.com/brianc/node-postgres)

---

**开始开发：Week 1 Day 1 - 数据库设计** 🦞

---

*创建日期: 2026-02-08*  
*最后更新: 2026-02-08*
