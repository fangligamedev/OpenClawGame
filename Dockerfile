# 使用 Node.js 官方镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制所有文件
COPY . .

# 安装依赖并编译
RUN npm ci && npm run build

# 暴露端口
EXPOSE 3004

# 启动命令
CMD ["node", "server/dist/server.js"]
