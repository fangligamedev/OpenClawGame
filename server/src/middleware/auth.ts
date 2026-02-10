// server/src/middleware/auth.ts
// 鉴权中间件

import { Request, Response, NextFunction } from 'express';
import { rateLimiter } from '../services/rateLimiter';
import { roleManager } from '../services/roleManager';

// Token 存储（简单实现，生产环境应使用 Redis）
const tokenStore: Map<string, { agentId: string; createdAt: number }> = new Map();

/**
 * 生成 Token
 */
export function generateToken(agentId: string): string {
  const token = `token_${agentId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  tokenStore.set(token, { agentId, createdAt: Date.now() });
  return token;
}

/**
 * 验证 Token
 */
export function verifyToken(token: string): { valid: boolean; agentId?: string } {
  const data = tokenStore.get(token);
  if (!data) return { valid: false };
  
  // Token 24小时过期
  if (Date.now() - data.createdAt > 24 * 60 * 60 * 1000) {
    tokenStore.delete(token);
    return { valid: false };
  }
  
  return { valid: true, agentId: data.agentId };
}

/**
 * 鉴权中间件
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.body.token;
  
  if (!token) {
    res.status(401).json({ success: false, error: 'Authorization token required' });
    return;
  }
  
  const verification = verifyToken(token);
  if (!verification.valid) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }
  
  // 将 agentId 添加到请求对象
  (req as any).agentId = verification.agentId;
  
  next();
}

/**
 * 频率限制中间件
 */
export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const agentId = req.body.agentId || (req as any).agentId || req.params.agentId;
  
  if (!agentId) {
    res.status(400).json({ success: false, error: 'Agent ID required' });
    return;
  }
  
  const result = rateLimiter.canMakeRequest(agentId);
  
  if (!result.allowed) {
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded',
      retryAfter: result.retryAfter,
    });
    return;
  }
  
  // 添加剩余请求数到响应头
  res.setHeader('X-RateLimit-Remaining', rateLimiter.getRemainingRequests(agentId));
  
  next();
}

/**
 * 角色检查中间件
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const sessionId = req.params.id;
    const agentId = req.body.agentId || (req as any).agentId;
    
    if (!sessionId || !agentId) {
      res.status(400).json({ success: false, error: 'Session ID and Agent ID required' });
      return;
    }
    
    const roleState = roleManager.getAgentRole(sessionId, agentId);
    
    if (!roleState) {
      res.status(403).json({ success: false, error: 'You are not a participant in this session' });
      return;
    }
    
    if (!roleState.connected) {
      res.status(403).json({ success: false, error: 'You are disconnected from this session' });
      return;
    }
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(roleState.role)) {
      res.status(403).json({ 
        success: false, 
        error: `This action requires one of these roles: ${allowedRoles.join(', ')}` 
      });
      return;
    }
    
    // 将角色信息添加到请求对象
    (req as any).userRole = roleState.role;
    
    next();
  };
}

/**
 * WebSocket 鉴权
 */
export function wsAuthMiddleware(token: string): { valid: boolean; agentId?: string } {
  return verifyToken(token);
}

/**
 * 清理过期 Token
 */
export function cleanupExpiredTokens(): void {
  const now = Date.now();
  tokenStore.forEach((data, token) => {
    if (now - data.createdAt > 24 * 60 * 60 * 1000) {
      tokenStore.delete(token);
    }
  });
}

// 每小时清理一次过期 Token
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
