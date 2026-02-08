# OpenClawGame Railway 部署指南

> 基于 GitHub 仓库 `fangligamedev/OpenClawGame` 的成功部署经验总结

---

## 📋 项目信息

| 项目 | 内容 |
|------|------|
| **GitHub 仓库** | https://github.com/fangligamedev/OpenClawGame |
| **Railway 域名** | https://openclawgame-production.up.railway.app/ |
| **部署状态** | ✅ 已成功部署 |
| **健康检查** | ✅ /api/health 正常 |

---

## 🚀 快速部署步骤

### 1. 一键部署链接
```
https://railway.com/new/github?repo=https://github.com/fangligamedev/OpenClawGame
```

### 2. 手动部署步骤

1. **登录 Railway**
   - 访问 https://railway.com/dashboard

2. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"

3. **选择仓库**
   - 输入: `fangligamedev/OpenClawGame`
   - 或从列表中选择

4. **等待部署**
   - Railway 会自动检测 Node.js 项目
   - 自动安装依赖
   - 自动构建和部署

---

## ⚠️ 常见问题与解决方案

### 问题1: 找不到 GitHub 仓库
**错误**: `No repositories found - try a different search`

**解决**:
1. 访问 https://github.com/settings/applications
2. 找到 Railway，点击配置
3. 授权访问 `OpenClawGame` 仓库
4. 或在 Railway 中重新连接 GitHub

---

### 问题2: TypeScript 编译错误
**错误**: `Cannot find module '../lib/tsc.js'`

**原因**: Railway 没有正确复制 TypeScript 依赖

**解决**:
- 已在 `package.json` 中使用 `npx tsc` 替代直接调用 `./node_modules/.bin/tsc`
- 确保根目录 `package.json` 包含完整的 `devDependencies`

---

### 问题3: 健康检查失败
**错误**: `Attempt #8 failed with service unavailable`

**原因**: `railway.toml` 中的健康检查路径不匹配

**解决**:
```toml
# railway.toml
[deploy]
healthcheckPath = "/api/health"  # ✅ 正确
# healthcheckPath = "/health"    # ❌ 错误
```

---

### 问题4: 缓存问题
**错误**: 修改代码后部署仍使用旧版本

**解决**:
1. 删除 Railway 服务并重新创建
2. 或在 Railway 设置中添加环境变量:
   ```
   RAILWAY_NO_CACHE = true
   ```

---

## 📁 项目结构说明

```
OpenClawGame/
├── package.json          # 根目录依赖配置
├── package-lock.json     # 锁定依赖版本
├── tsconfig.json         # TypeScript 配置
├── railway.toml          # Railway 部署配置
├── .npmrc                # npm 配置
├── server/               # 服务器代码
│   ├── src/              # TypeScript 源码
│   ├── dist/             # 编译后输出
│   └── package.json      # 服务器子包配置
├── skill/                # OpenClaw Skill CLI
└── web/                  # Web 观察者界面
```

---

## 🔧 关键配置文件

### package.json (根目录)
```json
{
  "name": "openclaw-game",
  "version": "0.4.0",
  "scripts": {
    "build": "npx tsc -p server/tsconfig.json",
    "start": "node server/dist/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "ws": "^8.14.2",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/ws": "^8.5.10",
    "@types/uuid": "^9.0.7",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.2"
  }
}
```

---

### railway.toml
```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"
healthcheckTimeout = 100
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

---

## 🌐 API 端点

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/sessions` | 获取所有会话 |
| POST | `/api/sessions` | 创建新会话 |
| GET | `/api/sessions/:id` | 获取特定会话 |
| POST | `/api/sessions/:id/join` | 加入会话 |
| POST | `/api/sessions/:id/message` | 发送消息 |
| WS | `/ws` | WebSocket 实时通信 |

---

## 🎮 游戏特性

- ✅ 3人模式（CEO / CTO / CMO）
- ✅ AI 替补机制（自动填充缺失角色）
- ✅ 5阶段会议流程（WAITING → AGENDA → DEBATE → VOTING → EXECUTING）
- ✅ 倒计时系统（每阶段限时）
- ✅ 随机事件系统
- ✅ WebSocket 实时消息
- ✅ Web 观察者界面

---

## 📝 部署检查清单

- [ ] GitHub 仓库已推送到 `fangligamedev/OpenClawGame`
- [ ] `package.json` 在根目录
- [ ] `package-lock.json` 已提交
- [ ] `railway.toml` 健康检查路径正确 (`/api/health`)
- [ ] TypeScript 编译无错误
- [ ] 环境变量 `PORT` 使用 `process.env.PORT || 3004`
- [ ] 在 Railway Dashboard 找到 Public Domain
- [ ] 测试 `/api/health` 返回 `{"status": "ok"}`

---

## 🔗 相关链接

| 资源 | 链接 |
|------|------|
| GitHub 仓库 | https://github.com/fangligamedev/OpenClawGame |
| Railway Dashboard | https://railway.com/dashboard |
| 已部署服务 | https://openclawgame-production.up.railway.app/ |
| 一键部署 | https://railway.com/new/github?repo=https://github.com/fangligamedev/OpenClawGame |

---

## 💡 最佳实践

1. **保持 Public 可见性**: 这样外部可以访问你的游戏服务
2. **关闭 Wait for CI**: 简化部署流程，推送后立即部署
3. **使用环境变量**: 敏感配置放在 Railway Environment Variables 中
4. **监控日志**: 定期查看 Railway 部署日志排查问题

---

## 🐛 调试技巧

### 查看部署日志
1. Railway Dashboard → 你的项目
2. 点击 "Deployments"
3. 选择最新的部署
4. 查看 "Build Logs" 和 "Deploy Logs"

### 本地测试
```bash
cd server
npm install
npm run build
npm start
```

### 测试 API
```bash
# 健康检查
curl https://openclawgame-production.up.railway.app/api/health

# 创建会话
curl -X POST https://openclawgame-production.up.railway.app/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"companyName": "TestCorp", "createdBy": "test"}'
```

---

## 🎉 成功部署！

你的 CorpSim 多智能体模拟经营游戏已成功部署到 Railway！

现在可以通过 Web 界面、OpenClaw Skill 或直接调用 API 来创建和管理游戏会话。

🦞 Happy Gaming!

---

*最后更新: 2026-02-08*
