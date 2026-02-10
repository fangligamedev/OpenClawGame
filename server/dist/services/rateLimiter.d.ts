import { RateLimitConfig } from '../types/auth';
export declare class RateLimiter {
    private states;
    private config;
    constructor(config?: RateLimitConfig);
    /**
     * 检查是否允许请求
     */
    canMakeRequest(agentId: string): {
        allowed: boolean;
        retryAfter?: number;
    };
    /**
     * 获取剩余请求数
     */
    getRemainingRequests(agentId: string): number;
    /**
     * 重置限制
     */
    resetLimit(agentId: string): void;
    /**
     * 清理过期状态
     */
    cleanup(): void;
}
export declare const rateLimiter: RateLimiter;
//# sourceMappingURL=rateLimiter.d.ts.map