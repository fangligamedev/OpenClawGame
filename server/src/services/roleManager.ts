// server/src/services/roleManager.ts
// 角色管理和唯一性控制

import { EventEmitter } from 'events';
import { UserRole, VALID_ROLES, RoleAssignment } from '../types/auth';

export interface RoleState {
  sessionId: string;
  role: UserRole;
  agentId: string;
  agentName: string;
  assignedAt: number;
  connected: boolean;
}

export class RoleManager extends EventEmitter {
  // sessionId -> role -> RoleState
  private sessionRoles: Map<string, Map<UserRole, RoleState>> = new Map();
  
  // agentId -> sessionId 映射（用于快速查找）
  private agentSessions: Map<string, string> = new Map();

  /**
   * 初始化会话角色
   */
  initializeSession(sessionId: string): void {
    if (!this.sessionRoles.has(sessionId)) {
      this.sessionRoles.set(sessionId, new Map());
      console.log(`[RoleManager] Session initialized: ${sessionId}`);
    }
  }

  /**
   * 分配角色
   */
  assignRole(
    sessionId: string,
    agentId: string,
    agentName: string,
    role: UserRole
  ): { success: boolean; error?: string; state?: RoleState } {
    // 验证角色有效性
    if (!VALID_ROLES.includes(role)) {
      return { success: false, error: `Invalid role: ${role}` };
    }

    // 初始化会话
    this.initializeSession(sessionId);
    const roles = this.sessionRoles.get(sessionId)!;

    // 检查角色是否已被占用
    const existingRole = roles.get(role);
    if (existingRole && existingRole.connected) {
      return { 
        success: false, 
        error: `Role ${role.toUpperCase()} is already taken by ${existingRole.agentName}` 
      };
    }

    // 检查该玩家是否已有其他角色
    const existingSession = this.agentSessions.get(agentId);
    if (existingSession && existingSession !== sessionId) {
      // 玩家在其他会话中有角色，先移除
      this.removeAgentFromSession(existingSession, agentId);
    }

    // 如果该玩家在当前会话中有其他角色，先移除
    roles.forEach((state, r) => {
      if (state.agentId === agentId) {
        roles.delete(r);
      }
    });

    // 创建新角色状态
    const state: RoleState = {
      sessionId,
      role,
      agentId,
      agentName,
      assignedAt: Date.now(),
      connected: true,
    };

    roles.set(role, state);
    this.agentSessions.set(agentId, sessionId);

    console.log(`[RoleManager] Role assigned: ${role.toUpperCase()} -> ${agentName} in session ${sessionId}`);
    
    this.emit('role-assigned', sessionId, state);
    
    return { success: true, state };
  }

  /**
   * 检查角色是否可用
   */
  isRoleAvailable(sessionId: string, role: UserRole): boolean {
    const roles = this.sessionRoles.get(sessionId);
    if (!roles) return true;
    
    const existing = roles.get(role);
    return !existing || !existing.connected;
  }

  /**
   * 获取可用角色列表
   */
  getAvailableRoles(sessionId: string): UserRole[] {
    const roles = this.sessionRoles.get(sessionId);
    if (!roles) return [...VALID_ROLES];
    
    return VALID_ROLES.filter(role => {
      const state = roles.get(role);
      return !state || !state.connected;
    });
  }

  /**
   * 获取已分配的角色
   */
  getAssignedRoles(sessionId: string): RoleState[] {
    const roles = this.sessionRoles.get(sessionId);
    if (!roles) return [];
    
    return Array.from(roles.values()).filter(state => state.connected);
  }

  /**
   * 检查会话是否已满（3个角色齐全）
   */
  isSessionFull(sessionId: string): boolean {
    const assigned = this.getAssignedRoles(sessionId);
    return assigned.length >= 3;
  }

  /**
   * 标记玩家断开连接
   */
  markDisconnected(sessionId: string, agentId: string): void {
    const roles = this.sessionRoles.get(sessionId);
    if (!roles) return;

    roles.forEach((state, role) => {
      if (state.agentId === agentId) {
        state.connected = false;
        console.log(`[RoleManager] Agent disconnected: ${agentId} from session ${sessionId}`);
        this.emit('agent-disconnected', sessionId, state);
      }
    });
  }

  /**
   * 标记玩家重新连接
   */
  markReconnected(sessionId: string, agentId: string): boolean {
    const roles = this.sessionRoles.get(sessionId);
    if (!roles) return false;

    let found = false;
    roles.forEach((state) => {
      if (state.agentId === agentId) {
        state.connected = true;
        found = true;
        console.log(`[RoleManager] Agent reconnected: ${agentId} to session ${sessionId}`);
        this.emit('agent-reconnected', sessionId, state);
      }
    });

    return found;
  }

  /**
   * 从会话中移除玩家
   */
  removeAgentFromSession(sessionId: string, agentId: string): void {
    const roles = this.sessionRoles.get(sessionId);
    if (!roles) return;

    roles.forEach((state, role) => {
      if (state.agentId === agentId) {
        roles.delete(role);
        this.agentSessions.delete(agentId);
        console.log(`[RoleManager] Agent removed: ${agentId} from session ${sessionId}`);
        this.emit('role-released', sessionId, role, state);
      }
    });
  }

  /**
   * 获取玩家角色
   */
  getAgentRole(sessionId: string, agentId: string): RoleState | undefined {
    const roles = this.sessionRoles.get(sessionId);
    if (!roles) return undefined;

    for (const state of roles.values()) {
      if (state.agentId === agentId) {
        return state;
      }
    }
    return undefined;
  }

  /**
   * 清理会话
   */
  cleanupSession(sessionId: string): void {
    const roles = this.sessionRoles.get(sessionId);
    if (roles) {
      roles.forEach((state) => {
        this.agentSessions.delete(state.agentId);
      });
    }
    this.sessionRoles.delete(sessionId);
    console.log(`[RoleManager] Session cleaned up: ${sessionId}`);
  }

  /**
   * 完全清理
   */
  cleanup(): void {
    this.sessionRoles.clear();
    this.agentSessions.clear();
    console.log('[RoleManager] All cleaned up');
  }
}

// 导出单例
export const roleManager = new RoleManager();
