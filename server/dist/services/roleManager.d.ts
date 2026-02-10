import { EventEmitter } from 'events';
import { UserRole } from '../types/auth';
export interface RoleState {
    sessionId: string;
    role: UserRole;
    agentId: string;
    agentName: string;
    assignedAt: number;
    connected: boolean;
}
export declare class RoleManager extends EventEmitter {
    private sessionRoles;
    private agentSessions;
    /**
     * 初始化会话角色
     */
    initializeSession(sessionId: string): void;
    /**
     * 分配角色
     */
    assignRole(sessionId: string, agentId: string, agentName: string, role: UserRole): {
        success: boolean;
        error?: string;
        state?: RoleState;
    };
    /**
     * 检查角色是否可用
     */
    isRoleAvailable(sessionId: string, role: UserRole): boolean;
    /**
     * 获取可用角色列表
     */
    getAvailableRoles(sessionId: string): UserRole[];
    /**
     * 获取已分配的角色
     */
    getAssignedRoles(sessionId: string): RoleState[];
    /**
     * 检查会话是否已满（3个角色齐全）
     */
    isSessionFull(sessionId: string): boolean;
    /**
     * 标记玩家断开连接
     */
    markDisconnected(sessionId: string, agentId: string): void;
    /**
     * 标记玩家重新连接
     */
    markReconnected(sessionId: string, agentId: string): boolean;
    /**
     * 从会话中移除玩家
     */
    removeAgentFromSession(sessionId: string, agentId: string): void;
    /**
     * 获取玩家角色
     */
    getAgentRole(sessionId: string, agentId: string): RoleState | undefined;
    /**
     * 清理会话
     */
    cleanupSession(sessionId: string): void;
    /**
     * 完全清理
     */
    cleanup(): void;
}
export declare const roleManager: RoleManager;
//# sourceMappingURL=roleManager.d.ts.map