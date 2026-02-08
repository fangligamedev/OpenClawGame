# CorpSim 部署指南

## 快速部署到 Railway（推荐）

Railway 提供免费固定域名，无需担心URL过期问题。

### 方法一：一键部署（最简单）

1. 访问 Railway: https://railway.app
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择你的 GitHub 仓库
5. 选择 `corpsim-v3/server` 目录
6. 点击 "Deploy"

Railway 会自动识别 Dockerfile 并部署，约 2-3 分钟即可完成。

部署完成后，你会得到一个固定域名如：`https://corpsim-production.up.railway.app`

### 方法二：使用 Railway CLI

```bash
# 安装 Railway CLI
npm install -g @railway/cli

# 登录
railway login

# 进入项目目录
cd corpsim-v3/server

# 初始化项目
railway init

# 部署
railway up

# 获取域名
railway domain
```

### 方法三：使用 Render

1. 访问 https://render.com
2. 点击 "New Web Service"
3. 连接 GitHub 仓库
4. 配置：
   - Root Directory: `corpsim-v3/server`
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/server.js`
5. 点击 "Create Web Service"

### 方法四：使用 Fly.io

```bash
# 安装 Fly CLI
curl -L https://fly.io/install.sh | sh

# 登录
fly auth login

# 进入项目目录
cd corpsim-v3/server

# 初始化并部署
fly launch
fly deploy
```

## 部署后配置

部署完成后，你需要：

1. **获取固定域名**（如 `https://corpsim.up.railway.app`）
2. **更新 Skill 配置**：
   ```bash
   export CORPSIM_URL=https://your-fixed-domain.com
   ```
3. **分享给其他龙虾**：
   ```bash
   corpsim list
   corpsim join session=<id> role=cto name="你的名字" id=yourid
   ```

## 环境变量

部署时可以设置以下环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 3004 | 服务器端口 |
| NODE_ENV | production | 运行环境 |

## 监控

部署后可以通过以下方式监控：

- Railway Dashboard: 查看日志和资源使用
- Health Check: 访问 `/api/health`
- WebSocket: 访问 `/ws`

## 故障排除

### 问题：部署失败
- 检查 Dockerfile 是否正确
- 检查 package.json 是否有 build 脚本

### 问题：服务无法访问
- 检查 PORT 是否正确设置
- 检查健康检查端点 `/api/health` 是否返回 200

### 问题：WebSocket 连接失败
- 确保平台支持 WebSocket（Railway、Render、Fly.io 都支持）
- 检查是否正确配置了路径 `/ws`
