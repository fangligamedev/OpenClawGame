// src/services/sessionService.ts

import { v4 as uuidv4 } from 'uuid';
import { 
  Session, Participant, Message, AgendaItem, 
  CreateSessionRequest, JoinSessionRequest, 
  SendMessageRequest, VoteRequest, MeetingPhase, 
  SessionUpdate, ExecutiveRole 
} from '../models/types';

export class SessionService {
  private sessions: Map<string, Session> = new Map();
  private updateCallbacks: Map<string, ((update: SessionUpdate) => void)[]> = new Map();

  // Create new session
  createSession(req: CreateSessionRequest): Session {
    const session: Session = {
      id: uuidv4(),
      companyName: req.companyName,
      quarter: req.quarter || 1,
      phase: 'waiting',
      phaseStartedAt: Date.now(),
      createdAt: Date.now(),
      participants: [],
      agenda: [],
      currentAgendaIndex: 0,
      messages: [],
      companyState: {
        cash: 1000000,
        valuation: 5000000,
        revenue: 500000,
        employees: 10,
        marketShare: 15,
        morale: 80,
      },
      config: {
        maxParticipants: 3,  // 3 lobsters to start
        phaseTimeoutMinutes: 5,
        autoStart: true,
      },
    };

    this.sessions.set(session.id, session);
    this.updateCallbacks.set(session.id, []);

    // Add system message
    this.addSystemMessage(session.id, `董事会已创建：${req.companyName} Q${session.quarter}`);

    return session;
  }

  // Get session by ID
  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  // List all active sessions
  listSessions(): Session[] {
    return Array.from(this.sessions.values())
      .filter(s => s.phase !== 'finished')
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  // Join session
  joinSession(sessionId: string, req: JoinSessionRequest): { success: boolean; error?: string; participant?: Participant } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.phase !== 'waiting') {
      return { success: false, error: 'Session already started' };
    }

    // Check if role is available
    const existingParticipant = session.participants.find(p => p.role === req.role);
    if (existingParticipant) {
      return { success: false, error: `Role ${req.role} already taken` };
    }

    // Check if agent already joined
    const existingAgent = session.participants.find(p => p.agentId === req.agentId);
    if (existingAgent) {
      return { success: false, error: 'Agent already in session' };
    }

    const participant: Participant = {
      id: uuidv4(),
      agentId: req.agentId,
      agentName: req.agentName,
      role: req.role,
      type: req.type || 'lobster',
      joinedAt: Date.now(),
      lastActive: Date.now(),
      status: 'online',
    };

    session.participants.push(participant);

    // Add join message
    this.addSystemMessage(sessionId, `${req.agentName} 加入董事会，担任 ${req.role.toUpperCase()}`);

    // Check if session should auto-start
    if (session.config.autoStart && session.participants.length >= session.config.maxParticipants) {
      this.startSession(sessionId);
    }

    // Notify listeners
    this.notifyUpdate(sessionId, {
      type: 'participant-join',
      sessionId,
      timestamp: Date.now(),
      data: { participant },
    });

    return { success: true, participant };
  }

  // Start session (begin meeting)
  startSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.phase !== 'waiting') {
      return false;
    }

    session.phase = 'agenda';
    session.phaseStartedAt = Date.now();

    this.addSystemMessage(sessionId, '董事会会议开始！Q1战略讨论');
    this.addSystemMessage(sessionId, `参与者：${session.participants.map(p => `${p.agentName}(${p.role.toUpperCase()})`).join(', ')}`);

    // Notify listeners
    this.notifyUpdate(sessionId, {
      type: 'phase-change',
      sessionId,
      timestamp: Date.now(),
      data: { phase: 'agenda' },
    });

    return true;
  }

  // Send message
  sendMessage(sessionId: string, req: SendMessageRequest): { success: boolean; error?: string; message?: Message } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    const participant = session.participants.find(p => p.agentId === req.agentId);
    if (!participant) {
      return { success: false, error: 'Agent not in session' };
    }

    const message: Message = {
      id: uuidv4(),
      sessionId,
      authorId: participant.id,
      authorName: participant.agentName,
      authorRole: participant.role,
      content: req.content,
      timestamp: Date.now(),
      replyTo: req.replyTo,
      mentions: this.extractMentions(req.content),
      type: 'message',
    };

    session.messages.push(message);
    participant.lastActive = Date.now();

    // Notify listeners
    this.notifyUpdate(sessionId, {
      type: 'new-message',
      sessionId,
      timestamp: Date.now(),
      data: { message },
    });

    return { success: true, message };
  }

  // Submit vote
  submitVote(sessionId: string, req: VoteRequest): { success: boolean; error?: string } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.phase !== 'voting') {
      return { success: false, error: 'Not in voting phase' };
    }

    const participant = session.participants.find(p => p.agentId === req.agentId);
    if (!participant) {
      return { success: false, error: 'Agent not in session' };
    }

    const agenda = session.agenda.find(a => a.id === req.agendaId);
    if (!agenda) {
      return { success: false, error: 'Agenda item not found' };
    }

    if (!agenda.options.includes(req.option)) {
      return { success: false, error: 'Invalid option' };
    }

    // Record vote
    agenda.votes[participant.id] = req.option;
    participant.hasVoted = true;
    participant.lastActive = Date.now();

    this.addSystemMessage(sessionId, `${participant.agentName}(${participant.role.toUpperCase()}) 已投票`);

    // Check if all voted
    const allVoted = session.participants.every(p => agenda.votes[p.id]);
    if (allVoted) {
      this.finalizeVoting(sessionId, agenda.id);
    }

    // Notify listeners
    this.notifyUpdate(sessionId, {
      type: 'vote-update',
      sessionId,
      timestamp: Date.now(),
      data: { 
        agendaId: req.agendaId, 
        votes: agenda.votes,
        allVoted 
      },
    });

    return { success: true };
  }

  // Add agenda item
  addAgendaItem(sessionId: string, title: string, description: string, options: string[], proposedBy: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const participant = session.participants.find(p => p.agentId === proposedBy);
    if (!participant) return false;

    const agenda: AgendaItem = {
      id: uuidv4(),
      title,
      description,
      proposedBy: participant.id,
      proposedByRole: participant.role,
      options,
      votes: {},
      deadline: Date.now() + 5 * 60 * 1000, // 5 minutes
    };

    session.agenda.push(agenda);
    return true;
  }

  // Transition to next phase
  transitionPhase(sessionId: string, phase: MeetingPhase): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.phase = phase;
    session.phaseStartedAt = Date.now();

    // Reset vote flags
    session.participants.forEach(p => p.hasVoted = false);

    this.addSystemMessage(sessionId, `进入阶段：${phase.toUpperCase()}`);

    // Notify listeners
    this.notifyUpdate(sessionId, {
      type: 'phase-change',
      sessionId,
      timestamp: Date.now(),
      data: { phase },
    });

    return true;
  }

  // Subscribe to updates
  subscribe(sessionId: string, callback: (update: SessionUpdate) => void): () => void {
    const callbacks = this.updateCallbacks.get(sessionId) || [];
    callbacks.push(callback);
    this.updateCallbacks.set(sessionId, callbacks);

    return () => {
      const updatedCallbacks = this.updateCallbacks.get(sessionId) || [];
      const index = updatedCallbacks.indexOf(callback);
      if (index > -1) {
        updatedCallbacks.splice(index, 1);
      }
    };
  }

  // Private helpers
  private addSystemMessage(sessionId: string, content: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const message: Message = {
      id: uuidv4(),
      sessionId,
      authorId: 'system',
      authorName: 'System',
      authorRole: 'ceo',
      content,
      timestamp: Date.now(),
      mentions: [],
      type: 'system',
    };

    session.messages.push(message);
  }

  private extractMentions(content: string): string[] {
    const mentionRegex = /@([\w\s]+?)(?=\s|$|[^\w\s])/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1].trim());
    }
    return mentions;
  }

  private finalizeVoting(sessionId: string, agendaId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const agenda = session.agenda.find(a => a.id === agendaId);
    if (!agenda) return;

    // Count votes
    const voteCounts: { [key: string]: number } = {};
    Object.values(agenda.votes).forEach(vote => {
      voteCounts[vote] = (voteCounts[vote] || 0) + 1;
    });

    const winner = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0];
    if (winner) {
      agenda.chosenOption = winner[0];
      // Majority: 2 out of 3, or all votes if less than 3 participants
      const totalVotes = Object.keys(agenda.votes).length;
      const majorityThreshold = Math.ceil(totalVotes / 2);
      agenda.passed = winner[1] >= majorityThreshold;

      this.addSystemMessage(sessionId, `投票结果：${winner[0]} (${winner[1]}票)`);
    }
  }

  private notifyUpdate(sessionId: string, update: SessionUpdate) {
    const callbacks = this.updateCallbacks.get(sessionId) || [];
    callbacks.forEach(cb => {
      try {
        cb(update);
      } catch (err) {
        console.error('Error in update callback:', err);
      }
    });
  }
}

export const sessionService = new SessionService();
