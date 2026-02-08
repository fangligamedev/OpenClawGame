import { v4 as uuidv4 } from 'uuid';
import { PoolClient } from 'pg';
import { query, getClient } from '../config/database';
import { 
  Session, 
  Participant, 
  AgendaItem, 
  Message, 
  CreateSessionRequest,
  JoinSessionRequest,
  SendMessageRequest,
  ExecutiveRole,
  MeetingPhase
} from '../models/types';

// 内存缓存（作为数据库的备份）
const sessionsCache: Map<string, Session> = new Map();
const subscribers: Map<string, Set<(update: any) => void>> = new Map();

export class DatabaseSessionService {
  // ========== 会话管理 ==========
  
  // 创建会话
  async createSession(request: CreateSessionRequest): Promise<Session> {
    const id = uuidv4();
    const now = Date.now();
    
    const session: Session = {
      id,
      companyName: request.companyName,
      quarter: request.quarter || 1,
      phase: 'waiting',
      phaseStartedAt: now,
      createdAt: now,
      participants: [],
      agenda: [],
      currentAgendaIndex: 0,
      messages: [],
      companyState: {
        cash: 1000000,
        valuation: 5000000,
        revenue: 0,
        employees: 10,
        marketShare: 5,
        morale: 80,
      },
      config: {
        maxParticipants: 3,
        phaseTimeoutMinutes: 10,
        autoStart: true,
      },
    };
    
    // 保存到数据库
    try {
      await query(
        `INSERT INTO sessions (id, company_name, quarter, phase, phase_started_at, company_state, config, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, to_timestamp($5 / 1000.0), $6, $7, $8, to_timestamp($9 / 1000.0), to_timestamp($10 / 1000.0))`,
        [
          id, 
          request.companyName, 
          session.quarter, 
          session.phase, 
          now,
          JSON.stringify(session.companyState),
          JSON.stringify(session.config),
          'active',
          now,
          now
        ]
      );
      
      // 同时缓存到内存
      sessionsCache.set(id, session);
      
      console.log(`✅ Session created: ${id}`);
      return session;
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      // 数据库失败时，仅使用内存
      sessionsCache.set(id, session);
      return session;
    }
  }
  
  // 获取会话
  async getSession(id: string): Promise<Session | null> {
    // 先检查内存缓存
    if (sessionsCache.has(id)) {
      return sessionsCache.get(id)!;
    }
    
    // 从数据库查询
    try {
      const result = await query(
        `SELECT * FROM sessions WHERE id = $1 AND status = 'active'`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      const session: Session = {
        id: row.id,
        companyName: row.company_name,
        quarter: row.quarter,
        phase: row.phase,
        phaseStartedAt: new Date(row.phase_started_at).getTime(),
        createdAt: new Date(row.created_at).getTime(),
        participants: [],
        agenda: [],
        currentAgendaIndex: 0,
        messages: [],
        companyState: row.company_state,
        config: row.config,
      };
      
      // 加载参与者
      session.participants = await this.getParticipants(id);
      
      // 加载消息（最近50条）
      session.messages = await this.getMessages(id, 50);
      
      // 加载议程
      session.agenda = await this.getAgendaItems(id);
      
      // 缓存到内存
      sessionsCache.set(id, session);
      
      return session;
    } catch (error) {
      console.error('❌ Failed to get session:', error);
      return null;
    }
  }
  
  // 获取所有会话
  async getAllSessions(): Promise<Session[]> {
    try {
      const result = await query(
        `SELECT id FROM sessions WHERE status = 'active' ORDER BY created_at DESC LIMIT 100`
      );
      
      const sessions: Session[] = [];
      for (const row of result.rows) {
        const session = await this.getSession(row.id);
        if (session) {
          sessions.push(session);
        }
      }
      
      return sessions;
    } catch (error) {
      console.error('❌ Failed to get all sessions:', error);
      // 返回内存中的会话
      return Array.from(sessionsCache.values());
    }
  }
  
  // ========== 参与者管理 ==========
  
  // 加入会话
  async joinSession(
    sessionId: string, 
    request: JoinSessionRequest
  ): Promise<{ success: boolean; session?: Session; error?: string }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    // 检查是否已满
    if (session.participants.length >= session.config.maxParticipants) {
      return { success: false, error: 'Session is full' };
    }
    
    // 检查角色是否已被占用
    const existingRole = session.participants.find(p => p.role === request.role);
    if (existingRole) {
      return { success: false, error: `Role ${request.role} is already taken` };
    }
    
    const participant: Participant = {
      id: uuidv4(),
      agentId: request.agentId,
      agentName: request.agentName,
      role: request.role,
      type: request.type || 'human',
      joinedAt: Date.now(),
      lastActive: Date.now(),
      status: 'online',
      hasVoted: false,
    };
    
    // 保存到数据库
    try {
      await query(
        `INSERT INTO participants (id, session_id, agent_id, agent_name, role, type, status, has_voted, joined_at, last_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9 / 1000.0), to_timestamp($10 / 1000.0))`,
        [
          participant.id,
          sessionId,
          participant.agentId,
          participant.agentName,
          participant.role,
          participant.type,
          participant.status,
          participant.hasVoted,
          participant.joinedAt,
          participant.lastActive
        ]
      );
      
      // 更新内存
      session.participants.push(participant);
      
      // 广播更新
      this.broadcast(sessionId, {
        type: 'participant_joined',
        participant,
        timestamp: Date.now(),
      });
      
      console.log(`✅ Participant joined: ${request.agentName} as ${request.role}`);
      return { success: true, session };
    } catch (error) {
      console.error('❌ Failed to join session:', error);
      // 仅更新内存
      session.participants.push(participant);
      return { success: true, session };
    }
  }
  
  // 获取参与者
  async getParticipants(sessionId: string): Promise<Participant[]> {
    try {
      const result = await query(
        `SELECT * FROM participants WHERE session_id = $1 ORDER BY joined_at`,
        [sessionId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        agentId: row.agent_id,
        agentName: row.agent_name,
        role: row.role,
        type: row.type,
        status: row.status,
        hasVoted: row.has_voted,
        joinedAt: new Date(row.joined_at).getTime(),
        lastActive: new Date(row.last_active).getTime(),
      }));
    } catch (error) {
      console.error('❌ Failed to get participants:', error);
      return [];
    }
  }
  
  // ========== 消息管理 ==========
  
  // 发送消息
  async sendMessage(
    sessionId: string,
    request: SendMessageRequest
  ): Promise<{ success: boolean; error?: string }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }
    
    const participant = session.participants.find(p => p.agentId === request.agentId);
    if (!participant) {
      return { success: false, error: 'Participant not found' };
    }
    
    const message: Message = {
      id: uuidv4(),
      sessionId,
      authorId: request.agentId,
      authorName: participant.agentName,
      authorRole: participant.role,
      content: request.content,
      timestamp: Date.now(),
      replyTo: request.replyTo,
      mentions: [],
      type: 'message',
    };
    
    // 保存到数据库
    try {
      await query(
        `INSERT INTO messages (id, session_id, author_id, author_name, author_role, content, type, reply_to, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9 / 1000.0))`,
        [
          message.id,
          sessionId,
          message.authorId,
          message.authorName,
          message.authorRole,
          message.content,
          message.type,
          message.replyTo || null,
          message.timestamp
        ]
      );
      
      // 更新内存
      session.messages.push(message);
      
      // 广播消息
      this.broadcast(sessionId, {
        type: 'new_message',
        message,
        timestamp: Date.now(),
      });
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      // 仅更新内存
      session.messages.push(message);
      return { success: true };
    }
  }
  
  // 获取消息
  async getMessages(sessionId: string, limit: number = 50): Promise<Message[]> {
    try {
      const result = await query(
        `SELECT * FROM messages WHERE session_id = $1 ORDER BY timestamp DESC LIMIT $2`,
        [sessionId, limit]
      );
      
      return result.rows.reverse().map(row => ({
        id: row.id,
        sessionId: row.session_id,
        authorId: row.author_id,
        authorName: row.author_name,
        authorRole: row.author_role,
        content: row.content,
        type: row.type,
        replyTo: row.reply_to,
        mentions: row.mentions || [],
        timestamp: new Date(row.timestamp).getTime(),
      }));
    } catch (error) {
      console.error('❌ Failed to get messages:', error);
      return [];
    }
  }
  
  // ========== 议程管理 ==========
  
  // 获取议程
  async getAgendaItems(sessionId: string): Promise<AgendaItem[]> {
    try {
      const result = await query(
        `SELECT * FROM agenda_items WHERE session_id = $1 ORDER BY created_at`,
        [sessionId]
      );
      
      return result.rows.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        title: row.title,
        description: row.description,
        proposedBy: row.proposed_by,
        proposedByRole: row.proposed_by_role,
        options: row.options || [],
        votes: row.votes || {},
        deadline: row.deadline ? new Date(row.deadline).getTime() : undefined,
        passed: row.passed,
        chosenOption: row.chosen_option,
      }));
    } catch (error) {
      console.error('❌ Failed to get agenda items:', error);
      return [];
    }
  }
  
  // ========== WebSocket 订阅 ==========
  
  subscribe(sessionId: string, callback: (update: any) => void): () => void {
    if (!subscribers.has(sessionId)) {
      subscribers.set(sessionId, new Set());
    }
    
    const sessionSubscribers = subscribers.get(sessionId)!;
    sessionSubscribers.add(callback);
    
    console.log(`👥 New subscriber for session ${sessionId}, total: ${sessionSubscribers.size}`);
    
    return () => {
      sessionSubscribers.delete(callback);
      console.log(`👤 Subscriber left for session ${sessionId}, remaining: ${sessionSubscribers.size}`);
    };
  }
  
  broadcast(sessionId: string, data: any): void {
    const sessionSubscribers = subscribers.get(sessionId);
    if (sessionSubscribers) {
      sessionSubscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('❌ Error broadcasting to subscriber:', error);
        }
      });
    }
  }
}

// 导出单例
export const dbSessionService = new DatabaseSessionService();
