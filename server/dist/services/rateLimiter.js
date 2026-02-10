"use strict";
// server/src/services/rateLimiter.ts
// API 请求频率限制服务
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = exports.RateLimiter = void 0;
// 默认配置
const DEFAULT_RATE_LIMIT = {
    maxRequests: 10, // 每分钟最多10个请求
    windowMs: 60 * 1000, // 1分钟窗口
    blockDuration: 5 * 60 * 1000, // 违规后封禁5分钟
};
class RateLimiter {
    states = new Map();
    config;
    constructor(config = DEFAULT_RATE_LIMIT) {
        this.config = config;
    }
    /**
     * 检查是否允许请求
     */
    canMakeRequest(agentId) {
        const now = Date.now();
        const state = this.states.get(agentId);
        // 如果没有记录，创建新记录
        if (!state) {
            this.states.set(agentId, {
                agentId,
                requestCount: 1,
                windowStart: now,
                blocked: false,
            });
            return { allowed: true };
        }
        // 检查是否被封禁
        if (state.blocked) {
            if (state.blockExpires && now < state.blockExpires) {
                const retryAfter = Math.ceil((state.blockExpires - now) / 1000);
                return { allowed: false, retryAfter };
            }
            // 封禁过期，解除封禁
            state.blocked = false;
            state.requestCount = 0;
        }
        // 检查时间窗口
        if (now - state.windowStart > this.config.windowMs) {
            // 新窗口
            state.windowStart = now;
            state.requestCount = 1;
            return { allowed: true };
        }
        // 检查请求数
        if (state.requestCount >= this.config.maxRequests) {
            // 超过限制，封禁
            state.blocked = true;
            state.blockExpires = now + (this.config.blockDuration || 5 * 60 * 1000);
            console.log(`[RateLimiter] Agent ${agentId} blocked for excessive requests`);
            return {
                allowed: false,
                retryAfter: Math.ceil((this.config.blockDuration || 5 * 60 * 1000) / 1000)
            };
        }
        // 允许请求
        state.requestCount++;
        return { allowed: true };
    }
    /**
     * 获取剩余请求数
     */
    getRemainingRequests(agentId) {
        const state = this.states.get(agentId);
        if (!state)
            return this.config.maxRequests;
        const now = Date.now();
        if (now - state.windowStart > this.config.windowMs) {
            return this.config.maxRequests;
        }
        return Math.max(0, this.config.maxRequests - state.requestCount);
    }
    /**
     * 重置限制
     */
    resetLimit(agentId) {
        this.states.delete(agentId);
    }
    /**
     * 清理过期状态
     */
    cleanup() {
        const now = Date.now();
        this.states.forEach((state, agentId) => {
            if (now - state.windowStart > this.config.windowMs * 2) {
                this.states.delete(agentId);
            }
        });
    }
}
exports.RateLimiter = RateLimiter;
// 导出单例
exports.rateLimiter = new RateLimiter();
//# sourceMappingURL=rateLimiter.js.map