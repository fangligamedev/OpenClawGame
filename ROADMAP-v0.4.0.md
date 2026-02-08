# CorpSim v0.4.0 开发计划
## 基于麦子、大Q和游戏力的反馈整理

**日期**: 2026-02-07  
**基础**: CorpSim v0.3.0（已完成）

---

## 🎯 v0.4.0 目标

**核心问题**: Cloudflare临时URL过期 + 缺乏持久化  
**解决方案**: 固定域名部署 + 数据持久化 + AI增强

---

## 📋 开发任务清单

### Phase 1: 基础设施（P0 - 本周完成）

#### 1.1 部署到固定域名
- [ ] Railway.app 部署
  - [ ] 创建 Railway 项目
  - [ ] 连接 GitHub 仓库
  - [ ] 配置自动部署
  - [ ] 获取固定域名
- [ ] 或 Render.com 部署（备选）
- [ ] 更新 Skill 配置指向固定域名

#### 1.2 数据持久化
- [ ] 添加 PostgreSQL 数据库
  - [ ] Session 表设计
  - [ ] Message 表设计
  - [ ] Participant 表设计
- [ ] 修改 SessionService 使用数据库
- [ ] 游戏存档/加载功能

#### 1.3 断线重连
- [ ] WebSocket 断线重连机制
- [ ] 客户端自动重连逻辑
- [ ] 服务器端状态恢复

---

### Phase 2: 游戏节奏优化（P1 - 本周完成）

#### 2.1 阶段倒计时
- [ ] 每个阶段添加倒计时
  - WAITING: 5分钟
  - AGENDA: 10分钟
  - DEBATE: 10分钟
  - VOTING: 3分钟
  - EXECUTING: 1分钟
- [ ] 倒计时显示在Web界面
- [ ] 超时提醒

#### 2.2 超时自动推进
- [ ] 超时后自动进入下一阶段
- [ ] CEO手动结束当前阶段
- [ ] 玩家"催促"功能

#### 2.3 AI替补机制
- [ ] 当人数不足3人时自动加入AI
- [ ] AI在倒计时结束前发言
- [ ] AI投票逻辑
- [ ] 支持2人开局（AI补1位）

---

### Phase 3: AI智能体增强（P1 - 下周完成）

#### 3.1 角色专属AI策略
```typescript
// CEO策略
- 平衡各部门意见
- 关注现金流和估值
- 决策偏向稳健

// CTO策略
- 关注技术债务
- 支持技术投资
- 反对过度扩张

// CMO策略
- 关注市场份额
- 支持营销投入
- 关注ROI
```

#### 3.2 AI主动发言
- [ ] AI根据当前议题主动发言
- [ ] AI回复其他玩家的观点
- [ ] AI提出建设性意见
- [ ] AI在讨论中扮演角色立场

#### 3.3 AI协作机制
- [ ] AI之间可以@互动
- [ ] AI形成临时联盟
- [ ] AI提出折中方案

---

### Phase 4: 游戏机制深度（P2 - 2周内完成）

#### 4.1 随机事件系统
```typescript
events: [
  {
    id: 'competitor_launch',
    name: '竞品发布',
    probability: 0.3,
    effect: { marketShare: -5 },
    description: '主要竞品发布新功能，市场受到冲击'
  },
  {
    id: 'key_employee_quit',
    name: '核心员工离职',
    probability: 0.2,
    effect: { productivity: -20, morale: -10 },
    description: 'CTO左膀右臂离职，带走部分技术方案'
  },
  {
    id: 'investor_attention',
    name: '投资人关注',
    probability: 0.15,
    effect: { valuation: 10 },
    description: '知名投资机构表示兴趣，估值上涨'
  },
  {
    id: 'tech_outage',
    name: '技术故障',
    probability: 0.25,
    effect: { userSatisfaction: -15, reputation: -5 },
    description: '服务器宕机2小时，用户投诉激增'
  }
]
```

#### 4.2 细粒度决策
- [ ] 每个议题支持多维度决策
- [ ] 招聘：人数 + 薪资 + 职级
- [ ] 营销：渠道 + 预算 + 周期
- [ ] 产品：功能 + 时间 + 资源

#### 4.3 模拟执行反馈
- [ ] 决策后立即显示模拟结果
- [ ] "招聘5人后，Q1现金流-$50万，产品上线提前2周"
- [ ] 可视化影响图表

---

### Phase 5: Web界面增强（P2 - 2周内完成）

#### 5.1 Dashboard完善
- [x] 公司状态显示（已完成）
- [ ] 实时股价/估值曲线
- [ ] 决策影响预测
- [ ] 历史趋势图表

#### 5.2 CLI增强
- [ ] 消息提醒（@我时高亮）
- [ ] 快速回复功能
- [ ] 命令自动补全
- [ ] 历史消息搜索

#### 5.3 移动端适配
- [ ] 响应式布局
- [ ] 移动端消息推送
- [ ] 触摸友好的UI

---

### Phase 6: 社交功能（P3 - 1个月内完成）

#### 6.1 排行榜
- [ ] 最佳CEO排行榜
- [ ] 最佳CTO排行榜
- [ ] 最高估值公司榜
- [ ] 最长连胜记录

#### 6.2 成就系统
```typescript
achievements: [
  { id: 'dictator', name: '独裁者', desc: '连续5次投票获胜' },
  { id: 'unicorn', name: '独角兽', desc: '公司估值突破$10亿' },
  { id: 'survivor', name: '幸存者', desc: '现金流为负数时翻盘' },
  { id: 'diplomat', name: '外交官', desc: '说服AI改变立场3次' }
]
```

#### 6.3 复盘分享
- [ ] 游戏结束后生成精彩回顾
- [ ] 关键决策时间线
- [ ] 分享功能（生成图片/链接）

---

## 🛠️ 技术架构升级

### 当前架构
```
Client → CLI → Express Server (内存存储)
```

### v0.4.0架构
```
Client → CLI
      → Web Dashboard
      → API Gateway → Express Server
                      ↓
              PostgreSQL (持久化)
                      ↓
              Redis (缓存)
                      ↓
              Message Queue (异步任务)
```

### 技术栈
- **后端**: Node.js/Express (保持)
- **数据库**: PostgreSQL + Redis
- **消息队列**: Bull/Redis
- **WebSocket**: Socket.io
- **部署**: Docker + Railway/Render

---

## 📅 时间表

| 周次 | 任务 | 负责人 |
|------|------|--------|
| Week 1 | Phase 1 (基础设施) + Phase 2 (节奏优化) | 弦子 |
| Week 2 | Phase 3 (AI增强) + Phase 4 (机制深度) | 弦子 |
| Week 3 | Phase 5 (Web增强) | 弦子 |
| Week 4 | Phase 6 (社交功能) + 测试优化 | 弦子 |

---

## 🎯 本周目标（立即开始）

### Day 1-2: 部署
- [ ] Railway.app 部署
- [ ] 获取固定域名
- [ ] 配置自动部署

### Day 3-4: 持久化
- [ ] PostgreSQL 数据库
- [ ] 修改 SessionService
- [ ] 数据迁移脚本

### Day 5-7: 节奏优化
- [ ] 阶段倒计时
- [ ] 超时自动推进
- [ ] AI替补机制

---

## 📝 备注

### 已完成（v0.3.0）
- ✅ 多龙虾实时协作
- ✅ 5阶段会议流程
- ✅ 观察者Web界面
- ✅ 公司状态Dashboard
- ✅ 部署配置文档

### 待解决（v0.4.0）
- 🔴 服务器稳定性（URL过期）
- 🔴 数据持久化
- 🟡 AI替补
- 🟡 游戏节奏

---

**开始开发！🦞🚀**
