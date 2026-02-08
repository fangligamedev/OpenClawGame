import { Session, Participant, AgendaItem, Message, CreateSessionRequest, JoinSessionRequest, SendMessageRequest, MeetingPhase } from '../models/types';
export declare class DatabaseSessionService {
    createSession(request: CreateSessionRequest): Promise<Session>;
    getSession(id: string): Promise<Session | null>;
    getAllSessions(): Promise<Session[]>;
    joinSession(sessionId: string, request: JoinSessionRequest): Promise<{
        success: boolean;
        participant?: Participant;
        error?: string;
    }>;
    getParticipants(sessionId: string): Promise<Participant[]>;
    sendMessage(sessionId: string, request: SendMessageRequest): Promise<{
        success: boolean;
        message?: Message;
        error?: string;
    }>;
    getMessages(sessionId: string, limit?: number): Promise<Message[]>;
    getAgendaItems(sessionId: string): Promise<AgendaItem[]>;
    subscribe(sessionId: string, callback: (update: any) => void): () => void;
    broadcast(sessionId: string, data: any): void;
    listSessions(): Promise<Session[]>;
    addAgendaItem(sessionId: string, title: string, description: string, options: string[], proposedBy: string): Promise<boolean>;
    transitionPhase(sessionId: string, phase: MeetingPhase): Promise<boolean>;
    submitVote(sessionId: string, request: {
        agentId: string;
        agendaId: string;
        option: number;
        reasoning?: string;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
}
export declare const dbSessionService: DatabaseSessionService;
//# sourceMappingURL=databaseSessionService.d.ts.map