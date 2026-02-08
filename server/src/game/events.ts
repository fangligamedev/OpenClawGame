// Random Events System for CorpSim
// Adds unpredictability and depth to the game

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  probability: number; // 0-1
  conditions?: EventConditions;
  effects: EventEffects;
  duration?: number; // rounds, undefined = permanent
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
  phases?: string[]; // Only trigger in these phases
}

export interface EventEffects {
  cash?: number;
  valuation?: number;
  revenue?: number;
  employees?: number;
  marketShare?: number;
  morale?: number;
  brandPower?: number;
}

// Predefined random events
export const RANDOM_EVENTS: GameEvent[] = [
  {
    id: 'competitor_launch',
    name: '竞品发布重磅功能',
    description: '主要竞争对手发布了革命性功能，市场受到冲击，用户开始流失',
    probability: 0.25,
    effects: {
      marketShare: -5,
      brandPower: -3,
    },
    duration: 1,
  },
  {
    id: 'key_employee_quit',
    name: '核心员工离职',
    description: '一位关键技术骨干突然离职，带走了部分技术方案和团队士气',
    probability: 0.2,
    conditions: {
      minEmployees: 5,
    },
    effects: {
      employees: -1,
      morale: -15,
    },
    duration: 2,
  },
  {
    id: 'investor_attention',
    name: '知名投资机构关注',
    description: '一家顶级VC公开表示对贵公司的兴趣，市场信心大增',
    probability: 0.1,
    conditions: {
      minValuation: 3000000,
    },
    effects: {
      valuation: 15,
      brandPower: 5,
    },
    duration: 1,
  },
  {
    id: 'tech_outage',
    name: '重大技术故障',
    description: '核心服务器宕机4小时，用户大量投诉，品牌声誉受损',
    probability: 0.15,
    effects: {
      userSatisfaction: -20,
      reputation: -10,
      brandPower: -5,
    },
    duration: 1,
  },
  {
    id: 'viral_marketing',
    name: '营销活动意外爆火',
    description: '你们的营销内容在社交媒体上病毒式传播，获客成本大幅降低',
    probability: 0.1,
    conditions: {
      phases: ['executing', 'feedback'],
    },
    effects: {
      marketShare: 3,
      brandPower: 10,
    },
    duration: 1,
  },
  {
    id: 'talent_poaching',
    name: '人才争夺战',
    description: '竞品开出高薪挖角，多位员工收到offer，团队人心浮动',
    probability: 0.2,
    conditions: {
      minEmployees: 8,
    },
    effects: {
      morale: -10,
    },
    duration: 1,
  },
  {
    id: 'regulatory_change',
    name: '监管政策变化',
    description: '新的行业监管政策出台，合规成本上升，部分业务模式受影响',
    probability: 0.12,
    effects: {
      cash: -200000,
      revenue: -50000,
    },
    duration: 2,
  },
  {
    id: 'partnership_opportunity',
    name: '战略合作机会',
    description: '一家大公司提出战略合作意向，可能带来大量客户资源',
    probability: 0.15,
    effects: {
      valuation: 8,
      marketShare: 2,
    },
    duration: 1,
  },
  {
    id: 'economic_downturn',
    name: '经济下行影响',
    description: '整体经济环境恶化，客户预算缩减，融资难度增加',
    probability: 0.1,
    effects: {
      revenue: -100000,
      valuation: -5,
    },
    duration: 2,
  },
  {
    id: 'product_breakthrough',
    name: '产品技术突破',
    description: '研发团队攻克关键技术难题，产品性能大幅提升',
    probability: 0.15,
    conditions: {
      minEmployees: 3,
    },
    effects: {
      valuation: 10,
      brandPower: 5,
    },
    duration: 1,
  },
];

export class EventEngine {
  private activeEvents: Map<string, { event: GameEvent; remainingRounds: number }> = new Map();

  // Trigger random event based on current state
  triggerEvent(phase: string): GameEvent | null {
    const eligibleEvents = RANDOM_EVENTS.filter(e => {
      // Check phase condition
      if (e.conditions?.phases && !e.conditions.phases.includes(phase)) {
        return false;
      }
      return Math.random() < e.probability;
    });

    if (eligibleEvents.length === 0) {
      return null;
    }

    // Select one random event
    const event = eligibleEvents[Math.floor(Math.random() * eligibleEvents.length)];
    
    // Add to active events
    this.activeEvents.set(event.id, {
      event,
      remainingRounds: event.duration || 1,
    });

    return event;
  }

  // Apply event effects to company state
  applyEffects(state: any, event: GameEvent): any {
    const newState = { ...state };
    
    if (event.effects.cash) {
      newState.cash = (newState.cash || 0) + event.effects.cash;
    }
    if (event.effects.valuation) {
      newState.valuation = (newState.valuation || 0) * (1 + event.effects.valuation / 100);
    }
    if (event.effects.revenue) {
      newState.revenue = (newState.revenue || 0) + event.effects.revenue;
    }
    if (event.effects.employees) {
      newState.employees = (newState.employees || 0) + event.effects.employees;
    }
    if (event.effects.marketShare) {
      newState.marketShare = Math.max(0, (newState.marketShare || 0) + event.effects.marketShare);
    }
    if (event.effects.morale) {
      newState.morale = Math.max(0, Math.min(100, (newState.morale || 80) + event.effects.morale));
    }

    return newState;
  }

  // Progress to next round, update active events
  nextRound(): GameEvent[] {
    const expiredEvents: GameEvent[] = [];
    
    for (const [id, data] of this.activeEvents.entries()) {
      data.remainingRounds--;
      if (data.remainingRounds <= 0) {
        expiredEvents.push(data.event);
        this.activeEvents.delete(id);
      }
    }

    return expiredEvents;
  }

  // Get currently active events
  getActiveEvents(): GameEvent[] {
    return Array.from(this.activeEvents.values()).map(data => data.event);
  }

  // Clear all events
  clear(): void {
    this.activeEvents.clear();
  }
}

export const eventEngine = new EventEngine();
