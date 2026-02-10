import { Request, Response, NextFunction } from 'express';
/**
 * 生成 Token
 */
export declare function generateToken(agentId: string): string;
/**
 * 验证 Token
 */
export declare function verifyToken(token: string): {
    valid: boolean;
    agentId?: string;
};
/**
 * 鉴权中间件
 */
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * 频率限制中间件
 */
export declare function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void;
/**
 * 角色检查中间件
 */
export declare function requireRole(...allowedRoles: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * WebSocket 鉴权
 */
export declare function wsAuthMiddleware(token: string): {
    valid: boolean;
    agentId?: string;
};
/**
 * 清理过期 Token
 */
export declare function cleanupExpiredTokens(): void;
//# sourceMappingURL=auth.d.ts.map