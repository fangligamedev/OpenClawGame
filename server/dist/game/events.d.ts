export interface GameEvent {
    id: string;
    name: string;
    description: string;
    probability: number;
    conditions?: EventConditions;
    effects: EventEffects;
    duration?: number;
}
export interface EventConditions {
    minCash?: number;
    maxCash?: number;
    minValuation?: number;
    maxValuation?: number;
    minEmployees?: number;
    maxEmployees?: number;
    minMarketShare?: number;
    maxMarketShare?: number;
    phases?: string[];
}
export interface EventEffects {
    cash?: number;
    valuation?: number;
    revenue?: number;
    employees?: number;
    marketShare?: number;
    morale?: number;
    brandPower?: number;
    userSatisfaction?: number;
    reputation?: number;
}
export declare const RANDOM_EVENTS: GameEvent[];
export declare class EventEngine {
    private activeEvents;
    triggerEvent(phase: string): GameEvent | null;
    applyEffects(state: any, event: GameEvent): any;
    nextRound(): GameEvent[];
    getActiveEvents(): GameEvent[];
    clear(): void;
}
export declare const eventEngine: EventEngine;
//# sourceMappingURL=events.d.ts.map