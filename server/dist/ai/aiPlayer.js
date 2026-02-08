"use strict";
// AI Player for CorpSim - Auto-joins and participates when human players are missing
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiManager = exports.AIManager = exports.AIPlayer = void 0;
class AIPlayer {
    sessionId;
    role;
    agentId;
    agentName;
    lastAction = 0;
    actionInterval = null;
    constructor(sessionId, role) {
        this.sessionId = sessionId;
        this.role = role;
        this.agentId = `ai-${role}-${Date.now()}`;
        this.agentName = `AI-${role.toUpperCase()}`;
    }
    getAgentId() {
        return this.agentId;
    }
    getAgentName() {
        return this.agentName;
    }
    getRole() {
        return this.role;
    }
    // Start AI participation
    start() {
        console.log(`[AI ${this.role}] Started for session ${this.sessionId}`);
        // AI acts every 10-30 seconds randomly
        const nextAction = Math.random() * 20000 + 10000;
        this.actionInterval = setTimeout(() => this.act(), nextAction);
    }
    // Stop AI participation
    stop() {
        if (this.actionInterval) {
            clearTimeout(this.actionInterval);
            this.actionInterval = null;
        }
        console.log(`[AI ${this.role}] Stopped for session ${this.sessionId}`);
    }
    // AI decision making
    async act() {
        // This will be implemented with actual API calls
        console.log(`[AI ${this.role}] Acting...`);
        // Schedule next action
        const nextAction = Math.random() * 20000 + 10000;
        this.actionInterval = setTimeout(() => this.act(), nextAction);
    }
    // Generate message based on role and context
    generateMessage(context) {
        const roleMessages = {
            ceo: [
                '@CTO @CMO 各位，我们目前的现金流状况如何支撑扩张计划？',
                '综合考虑各部门意见，我倾向于采取稳健策略。',
                '各位的意见都很有价值，我们需要在风险和机会之间找到平衡。',
                '从公司整体战略来看，我建议优先考虑长期可持续发展。',
                '@channel 大家还有其他补充意见吗？'
            ],
            cto: [
                '@CEO 技术团队目前有能力支撑5-8人的扩张，但超过10人会有管理风险。',
                '从CTO角度，我建议优先解决技术债务，再考虑新功能开发。',
                '@CMO 技术实现方面，新的营销功能需要3-4周开发周期。',
                '@CEO 如果我们招聘更多工程师，产品质量可以得到显著提升。',
                '技术投资是长期的，我建议分配至少20%资源用于技术基础设施。'
            ],
            cmo: [
                '@CEO 市场调研显示，如果我们不加大投入，竞争对手会抢占市场份额。',
                '从CMO角度，我建议至少投入$50万营销预算才能获得可观ROI。',
                '@CTO 营销活动时间表需要配合产品上线节奏。',
                '@CEO 品牌知名度直接影响我们的获客成本。',
                '我理解现金流压力，但完全不投入营销会让我们失去市场窗口期。'
            ],
            cfo: [
                '@CEO 根据财务分析，我们目前的现金流只能支撑6个月运营。',
                '从CFO角度，我建议严格控制成本，优先保证公司生存。',
                '@channel 激进扩张的风险很高，一旦现金流断裂后果严重。',
                '我建议采取分阶段投入策略，根据Q1数据再决定Q2计划。',
                '@CEO 财务健康是公司的生命线，不能为了增长而忽视风险。'
            ]
        };
        const messages = roleMessages[this.role] || ['我需要更多信息才能做出判断。'];
        return messages[Math.floor(Math.random() * messages.length)];
    }
    // Generate vote based on role and context
    generateVote(context, options) {
        // AI tends to choose middle option (moderate strategy)
        if (options.length >= 2) {
            return options[Math.floor(options.length / 2)];
        }
        return options[0] || '';
    }
}
exports.AIPlayer = AIPlayer;
// AI Manager to handle multiple AI players
class AIManager {
    aiPlayers = new Map();
    // Add AI player to session
    addAIPlayer(sessionId, role) {
        const key = `${sessionId}-${role}`;
        if (this.aiPlayers.has(key)) {
            return this.aiPlayers.get(key);
        }
        const aiPlayer = new AIPlayer(sessionId, role);
        this.aiPlayers.set(key, aiPlayer);
        aiPlayer.start();
        return aiPlayer;
    }
    // Remove AI player from session
    removeAIPlayer(sessionId, role) {
        const key = `${sessionId}-${role}`;
        const aiPlayer = this.aiPlayers.get(key);
        if (aiPlayer) {
            aiPlayer.stop();
            this.aiPlayers.delete(key);
        }
    }
    // Remove all AI players from session
    removeAllAIPlayers(sessionId) {
        for (const [key, aiPlayer] of this.aiPlayers.entries()) {
            if (key.startsWith(`${sessionId}-`)) {
                aiPlayer.stop();
                this.aiPlayers.delete(key);
            }
        }
    }
    // Check if AI player exists
    hasAIPlayer(sessionId, role) {
        return this.aiPlayers.has(`${sessionId}-${role}`);
    }
    // Get AI player
    getAIPlayer(sessionId, role) {
        return this.aiPlayers.get(`${sessionId}-${role}`);
    }
}
exports.AIManager = AIManager;
exports.aiManager = new AIManager();
//# sourceMappingURL=aiPlayer.js.map