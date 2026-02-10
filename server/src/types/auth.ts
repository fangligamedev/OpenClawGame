// server/src/types/auth.ts
// 鉴权相关类型定义

export interface AuthToken {
  token: string;
  agentId: string;
  sessionId?: string;
  role?: string;
  createdAt: number;
  expiresAt: number;
}

export interface AuthRequest {
  agentId: string;
  sessionId?: string;
  token: string;
}

export interface AuthResponse {
  success: boolean;
  agentId?: string;
  role?: string;
  error?: string;
}

export interface RateLimitConfig {
  maxRequests: number;      // 最大请求数
  windowMs: number;         // 时间窗口（毫秒）
  blockDuration?: number;   // 封禁时长（毫秒）
}

export interface RateLimitState {
  agentId: string;
  requestCount: number;
  windowStart: number;
  blocked: boolean;
  blockExpires?: number;
}

export interface RoleAssignment {
  sessionId: string;
  role: string;
  agentId: string;
  assignedAt: number;
}

export type UserRole = 'ceo' | 'cto' | 'cmo';

export const VALID_ROLES: UserRole[] = ['ceo', 'cto', 'cmo'];
