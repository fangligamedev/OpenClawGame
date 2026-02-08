// src/models/types.ts

export type ExecutiveRole = 'ceo' | 'cto' | 'cmo' | 'cfo';

export type MeetingPhase = 
  | 'waiting'     // 等待参与者
  | 'agenda'      // 议题提出
  | 'debate'      // 辩论阶段
  | 'voting'      // 投票阶段
  | 'executing'   // 执行阶段
  | 'feedback'    // 结果反馈
  | 'finished';   // 已结束

export type AgentType = 'lobster' | 'human' | 'ai';

export interface Participant {
  id: string;
  agentId: string;
  agentName: string;
  role: ExecutiveRole;
  type: AgentType;
  joinedAt: number;
  lastActive: number;
  status: 'online' | 'offline' | 'idle';
  hasVoted?: boolean;
}

export interface AgendaItem {
  id: string;
  title: string;
  description: string;
  proposedBy: string;
  proposedByRole: ExecutiveRole;
  options: string[];
  votes: { [participantId: string]: string };
  deadline: number;
  passed?: boolean;
  chosenOption?: string;
}

export interface Message {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  authorRole: ExecutiveRole;
  content: string;
  timestamp: number;
  replyTo?: string;
  mentions: string[];
  type: 'message' | 'system' | 'vote' | 'join' | 'leave';
}

export interface CompanyState {
  cash: number;
  valuation: number;
  revenue: number;
  employees: number;
  marketShare: number;
  morale: number;
}

export interface Session {
  id: string;
  companyName: string;
  quarter: number;
  phase: MeetingPhase;
  phaseStartedAt: number;
  createdAt: number;
  participants: Participant[];
  agenda: AgendaItem[];
  currentAgendaIndex: number;
  messages: Message[];
  companyState: CompanyState;
  config: {
    maxParticipants: number;
    phaseTimeoutMinutes: number;
    autoStart: boolean;
  };
}

export interface CreateSessionRequest {
  companyName: string;
  quarter?: number;
  createdBy: string;
}

export interface JoinSessionRequest {
  agentId: string;
  agentName: string;
  role: ExecutiveRole;
  type?: AgentType;
}

export interface SendMessageRequest {
  agentId: string;
  content: string;
  replyTo?: string;
}

export interface VoteRequest {
  agentId: string;
  agendaId: string;
  option: string;
  reasoning?: string;
}

export interface SessionUpdate {
  type: 'phase-change' | 'new-message' | 'vote-update' | 'participant-join' | 'participant-leave' | 'vote-request' | 'session-ended';
  sessionId: string;
  timestamp: number;
  data: any;
}
