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
    maxRequests: number;
    windowMs: number;
    blockDuration?: number;
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
export declare const VALID_ROLES: UserRole[];
//# sourceMappingURL=auth.d.ts.map