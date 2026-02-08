import { Session, Participant, Message, CreateSessionRequest, JoinSessionRequest, SendMessageRequest, VoteRequest, MeetingPhase, SessionUpdate } from '../models/types';
export declare class SessionService {
    private sessions;
    private updateCallbacks;
    createSession(req: CreateSessionRequest): Session;
    getSession(id: string): Session | undefined;
    listSessions(): Session[];
    joinSession(sessionId: string, req: JoinSessionRequest): {
        success: boolean;
        error?: string;
        participant?: Participant;
    };
    startSession(sessionId: string): boolean;
    sendMessage(sessionId: string, req: SendMessageRequest): {
        success: boolean;
        error?: string;
        message?: Message;
    };
    submitVote(sessionId: string, req: VoteRequest): {
        success: boolean;
        error?: string;
    };
    addAgendaItem(sessionId: string, title: string, description: string, options: string[], proposedBy: string): boolean;
    transitionPhase(sessionId: string, phase: MeetingPhase): boolean;
    subscribe(sessionId: string, callback: (update: SessionUpdate) => void): () => void;
    private addSystemMessage;
    private extractMentions;
    private finalizeVoting;
    private notifyUpdate;
}
export declare const sessionService: SessionService;
//# sourceMappingURL=sessionService.d.ts.map