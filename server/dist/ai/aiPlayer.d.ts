import { ExecutiveRole, Message, Session } from '../models/types';
interface AIContext {
    session: Session;
    role: ExecutiveRole;
    messages: Message[];
}
export declare class AIPlayer {
    private sessionId;
    private role;
    private agentId;
    private agentName;
    private lastAction;
    private actionInterval;
    constructor(sessionId: string, role: ExecutiveRole);
    getAgentId(): string;
    getAgentName(): string;
    getRole(): ExecutiveRole;
    start(): void;
    stop(): void;
    private act;
    generateMessage(context: AIContext): string;
    generateVote(context: AIContext, options: string[]): string;
}
export declare class AIManager {
    private aiPlayers;
    addAIPlayer(sessionId: string, role: ExecutiveRole): AIPlayer;
    removeAIPlayer(sessionId: string, role: ExecutiveRole): void;
    removeAllAIPlayers(sessionId: string): void;
    hasAIPlayer(sessionId: string, role: ExecutiveRole): boolean;
    getAIPlayer(sessionId: string, role: ExecutiveRole): AIPlayer | undefined;
}
export declare const aiManager: AIManager;
export {};
//# sourceMappingURL=aiPlayer.d.ts.map