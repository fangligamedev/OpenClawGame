"use strict";
// server/src/middleware/auth.ts
// 鉴权中间件
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.authMiddleware = authMiddleware;
exports.rateLimitMiddleware = rateLimitMiddleware;
exports.requireRole = requireRole;
exports.wsAuthMiddleware = wsAuthMiddleware;
exports.cleanupExpiredTokens = cleanupExpiredTokens;
const rateLimiter_1 = require("../services/rateLimiter");
const roleManager_1 = require("../services/roleManager");
// Token 存储（简单实现，生产环境应使用 Redis）
const tokenStore = new Map();
/**
 * 生成 Token
 */
function generateToken(agentId) {
    const token = `token_${agentId}_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    tokenStore.set(token, { agentId, createdAt: Date.now() });
    return token;
}
/**
 * 验证 Token
 */
function verifyToken(token) {
    const data = tokenStore.get(token);
    if (!data)
        return { valid: false };
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
function authMiddleware(req, res, next) {
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
    req.agentId = verification.agentId;
    next();
}
/**
 * 频率限制中间件
 */
function rateLimitMiddleware(req, res, next) {
    const agentId = req.body.agentId || req.agentId || req.params.agentId;
    if (!agentId) {
        res.status(400).json({ success: false, error: 'Agent ID required' });
        return;
    }
    const result = rateLimiter_1.rateLimiter.canMakeRequest(agentId);
    if (!result.allowed) {
        res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            retryAfter: result.retryAfter,
        });
        return;
    }
    // 添加剩余请求数到响应头
    res.setHeader('X-RateLimit-Remaining', rateLimiter_1.rateLimiter.getRemainingRequests(agentId));
    next();
}
/**
 * 角色检查中间件
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        const sessionId = req.params.id;
        const agentId = req.body.agentId || req.agentId;
        if (!sessionId || !agentId) {
            res.status(400).json({ success: false, error: 'Session ID and Agent ID required' });
            return;
        }
        const roleState = roleManager_1.roleManager.getAgentRole(sessionId, agentId);
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
        req.userRole = roleState.role;
        next();
    };
}
/**
 * WebSocket 鉴权
 */
function wsAuthMiddleware(token) {
    return verifyToken(token);
}
/**
 * 清理过期 Token
 */
function cleanupExpiredTokens() {
    const now = Date.now();
    tokenStore.forEach((data, token) => {
        if (now - data.createdAt > 24 * 60 * 60 * 1000) {
            tokenStore.delete(token);
        }
    });
}
// 每小时清理一次过期 Token
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
//# sourceMappingURL=auth.js.map