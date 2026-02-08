# CorpSim 开发任务清单

## Phase 1: 数据库持久化 (进行中)

### 任务1: 数据库Schema设计
- [ ] 创建 database/schema.sql
- [ ] sessions 表
- [ ] participants 表  
- [ ] messages 表
- [ ] company_states 表

### 任务2: 安装依赖
- [ ] npm install pg
- [ ] npm install -D @types/pg

### 任务3: 数据库连接
- [ ] 创建 src/config/database.ts
- [ ] 配置连接池
- [ ] 环境变量支持

### 任务4: 修改SessionService
- [ ] 添加数据库读写方法
- [ ] 保持内存缓存作为备份
- [ ] 会话创建时持久化
- [ ] 会话查询时优先数据库

### 任务5: 测试
- [ ] 数据库连接测试
- [ ] CRUD操作测试
- [ ] 集成测试

---

## Phase 2: 游戏机制优化

### 任务1: 倒计时系统
- [ ] 阶段倒计时配置
- [ ] 倒计时管理器
- [ ] WebSocket倒计时广播

### 任务2: 自动推进
- [ ] 超时检测
- [ ] 自动进入下一阶段
- [ ] 通知所有玩家

### 任务3: 随机事件
- [ ] 事件触发器
- [ ] 事件效果应用
- [ ] 事件通知

---

## Phase 3: AI增强

### 任务1: AI决策逻辑
- [ ] AI CEO决策
- [ ] AI CTO决策
- [ ] AI CMO决策

### 任务2: AI参与
- [ ] AI发言逻辑
- [ ] AI投票逻辑

---

## Phase 4: Web界面

### 任务1: Dashboard
- [ ] 响应式设计
- [ ] 实时数据展示

### 任务2: 可视化
- [ ] 图表组件
- [ ] 排行榜

