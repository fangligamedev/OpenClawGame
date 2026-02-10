"use strict";
// src/services/sessionService.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionService = exports.SessionService = void 0;
const uuid_1 = require("uuid");
const roleManager_1 = require("./roleManager");
const auth_1 = require("../middleware/auth");
class SessionService {
    sessions = new Map();
    updateCallbacks = new Map();
    // Create new session
    createSession(req) {
        const session = {
            id: (0, uuid_1.v4)(),
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
                maxParticipants: 3, // 3 lobsters to start
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
    getSession(id) {
        return this.sessions.get(id);
    }
    // List all active sessions
    listSessions() {
        return Array.from(this.sessions.values())
            .filter(s => s.phase !== 'finished')
            .sort((a, b) => b.createdAt - a.createdAt);
    }
    // Join session with role management and auth
    joinSession(sessionId, req) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, error: 'Session not found' };
        }
        if (session.phase !== 'waiting') {
            return { success: false, error: 'Session already started' };
        }
        // Use roleManager to assign role (enforces uniqueness)
        const roleResult = roleManager_1.roleManager.assignRole(sessionId, req.agentId, req.agentName, req.role);
        if (!roleResult.success) {
            return { success: false, error: roleResult.error };
        }
        // Check if agent already joined in session data
        const existingAgent = session.participants.find(p => p.agentId === req.agentId);
        if (existingAgent) {
            // Update existing participant
            existingAgent.agentName = req.agentName;
            existingAgent.role = req.role;
            existingAgent.status = 'online';
            existingAgent.lastActive = Date.now();
            // Generate auth token
            const token = (0, auth_1.generateToken)(req.agentId);
            // Notify listeners
            this.notifyUpdate(sessionId, {
                type: 'participant-rejoined',
                sessionId,
                timestamp: Date.now(),
                data: { participant: existingAgent },
            });
            return { success: true, participant: existingAgent, token };
        }
        const participant = {
            id: (0, uuid_1.v4)(),
            agentId: req.agentId,
            agentName: req.agentName,
            role: req.role,
            type: req.type || 'lobster',
            joinedAt: Date.now(),
            lastActive: Date.now(),
            status: 'online',
        };
        session.participants.push(participant);
        // Generate auth token
        const token = (0, auth_1.generateToken)(req.agentId);
        // Add join message
        this.addSystemMessage(sessionId, `${req.agentName} 加入董事会，担任 ${req.role.toUpperCase()}`);
        // Check if session should auto-start (only if all 3 roles are filled)
        if (session.config.autoStart && roleManager_1.roleManager.isSessionFull(sessionId)) {
            this.startSession(sessionId);
        }
        // Notify listeners
        this.notifyUpdate(sessionId, {
            type: 'participant-join',
            sessionId,
            timestamp: Date.now(),
            data: { participant },
        });
        return { success: true, participant, token };
    }
    // Start session (begin meeting)
    startSession(sessionId) {
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
    // Send message with enhanced logging and validation
    sendMessage(sessionId, req) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            console.error(`[sendMessage] Session not found: ${sessionId}`);
            return { success: false, error: 'Session not found' };
        }
        // Log all participants for debugging
        console.log(`[sendMessage] Looking for agentId: ${req.agentId}`);
        console.log(`[sendMessage] Available participants:`, session.participants.map(p => ({ agentId: p.agentId, name: p.agentName, role: p.role })));
        const participant = session.participants.find(p => p.agentId === req.agentId);
        if (!participant) {
            console.error(`[sendMessage] Agent not in session: ${req.agentId}`);
            return { success: false, error: `Agent ${req.agentId} not in session` };
        }
        const message = {
            id: (0, uuid_1.v4)(),
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
        // Ensure message is stored before broadcasting
        session.messages.push(message);
        participant.lastActive = Date.now();
        console.log(`[sendMessage] Message stored: ${message.id} from ${participant.agentName}`);
        // Notify listeners with confirmation
        try {
            this.notifyUpdate(sessionId, {
                type: 'new-message',
                sessionId,
                timestamp: Date.now(),
                data: { message },
            });
            console.log(`[sendMessage] Broadcast successful for message: ${message.id}`);
        }
        catch (error) {
            console.error(`[sendMessage] Broadcast failed:`, error);
        }
        return { success: true, message };
    }
    // Submit vote
    submitVote(sessionId, req) {
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
    addAgendaItem(sessionId, title, description, options, proposedBy) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return false;
        const participant = session.participants.find(p => p.agentId === proposedBy);
        if (!participant)
            return false;
        const agenda = {
            id: (0, uuid_1.v4)(),
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
    transitionPhase(sessionId, phase) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return false;
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
    subscribe(sessionId, callback) {
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
    addSystemMessage(sessionId, content) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const message = {
            id: (0, uuid_1.v4)(),
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
    extractMentions(content) {
        const mentionRegex = /@([\w\s]+?)(?=\s|$|[^\w\s])/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
            mentions.push(match[1].trim());
        }
        return mentions;
    }
    finalizeVoting(sessionId, agendaId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        const agenda = session.agenda.find(a => a.id === agendaId);
        if (!agenda)
            return;
        // Count votes
        const voteCounts = {};
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
    notifyUpdate(sessionId, update) {
        const callbacks = this.updateCallbacks.get(sessionId) || [];
        callbacks.forEach(cb => {
            try {
                cb(update);
            }
            catch (err) {
                console.error('Error in update callback:', err);
            }
        });
    }
}
exports.SessionService = SessionService;
exports.sessionService = new SessionService();
//# sourceMappingURL=sessionService.js.map