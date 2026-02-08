"use strict";
// src/routes/sessions.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const databaseSessionService_1 = require("../services/databaseSessionService");
const router = (0, express_1.Router)();
// GET /api/sessions - List all active sessions
router.get('/', async (req, res) => {
    try {
        const sessions = await databaseSessionService_1.dbSessionService.listSessions();
        res.json({
            success: true,
            data: sessions.map((s) => ({
                id: s.id,
                companyName: s.companyName,
                quarter: s.quarter,
                phase: s.phase,
                participantCount: s.participants.length,
                createdAt: s.createdAt,
                availableRoles: ['ceo', 'cto', 'cmo'].filter((role) => !s.participants.some((p) => p.role === role)),
            })),
        });
    }
    catch (error) {
        console.error('Error listing sessions:', error);
        res.status(500).json({ success: false, error: 'Failed to list sessions' });
    }
});
// POST /api/sessions - Create new session
router.post('/', async (req, res) => {
    try {
        const { companyName, quarter, createdBy } = req.body;
        if (!companyName || !createdBy) {
            return res.status(400).json({
                success: false,
                error: 'companyName and createdBy are required'
            });
        }
        const session = await databaseSessionService_1.dbSessionService.createSession({
            companyName,
            quarter,
            createdBy,
        });
        res.status(201).json({
            success: true,
            data: {
                id: session.id,
                companyName: session.companyName,
                quarter: session.quarter,
                phase: session.phase,
                joinUrl: `/api/sessions/${session.id}/join`,
            },
        });
    }
    catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ success: false, error: 'Failed to create session' });
    }
});
// GET /api/sessions/:id - Get session details
router.get('/:id', async (req, res) => {
    try {
        const session = await databaseSessionService_1.dbSessionService.getSession(req.params.id);
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }
        res.json({
            success: true,
            data: {
                id: session.id,
                companyName: session.companyName,
                quarter: session.quarter,
                phase: session.phase,
                phaseStartedAt: session.phaseStartedAt,
                createdAt: session.createdAt,
                participants: session.participants.map((p) => ({
                    id: p.id,
                    agentId: p.agentId,
                    agentName: p.agentName,
                    role: p.role,
                    status: p.status,
                    hasVoted: p.hasVoted,
                })),
                currentAgenda: session.agenda[session.currentAgendaIndex] || null,
                agendaCount: session.agenda.length,
                messages: session.messages.slice(-50), // Last 50 messages
                companyState: session.companyState,
                availableRoles: ['ceo', 'cto', 'cmo'].filter((role) => !session.participants.some((p) => p.role === role)),
            },
        });
    }
    catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ success: false, error: 'Failed to get session' });
    }
});
// POST /api/sessions/:id/join - Join session
router.post('/:id/join', async (req, res) => {
    try {
        const { agentId, agentName, role, type } = req.body;
        if (!agentId || !agentName || !role) {
            return res.status(400).json({
                success: false,
                error: 'agentId, agentName, and role are required'
            });
        }
        const result = await databaseSessionService_1.dbSessionService.joinSession(req.params.id, {
            agentId,
            agentName,
            role,
            type,
        });
        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }
        res.json({
            success: true,
            data: {
                participant: result.participant,
                message: `Joined as ${role.toUpperCase()}`,
            },
        });
    }
    catch (error) {
        console.error('Error joining session:', error);
        res.status(500).json({ success: false, error: 'Failed to join session' });
    }
});
// POST /api/sessions/:id/messages - Send message
router.post('/:id/messages', async (req, res) => {
    try {
        const { agentId, content, replyTo } = req.body;
        if (!agentId || !content) {
            return res.status(400).json({
                success: false,
                error: 'agentId and content are required'
            });
        }
        const result = await databaseSessionService_1.dbSessionService.sendMessage(req.params.id, {
            agentId,
            content,
            replyTo,
        });
        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }
        res.status(201).json({
            success: true,
            data: { message: result.message },
        });
    }
    catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});
// GET /api/sessions/:id/messages - Get messages
router.get('/:id/messages', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const messages = await databaseSessionService_1.dbSessionService.getMessages(req.params.id, limit);
        res.json({
            success: true,
            data: messages,
        });
    }
    catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({ success: false, error: 'Failed to get messages' });
    }
});
// POST /api/sessions/:id/vote - Submit vote
router.post('/:id/vote', async (req, res) => {
    try {
        const { agentId, agendaId, option, reasoning } = req.body;
        if (!agentId || !agendaId || option === undefined) {
            return res.status(400).json({
                success: false,
                error: 'agentId, agendaId, and option are required'
            });
        }
        const result = await databaseSessionService_1.dbSessionService.submitVote(req.params.id, {
            agentId,
            agendaId,
            option,
            reasoning,
        });
        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }
        res.json({
            success: true,
            data: { message: 'Vote recorded' },
        });
    }
    catch (error) {
        console.error('Error submitting vote:', error);
        res.status(500).json({ success: false, error: 'Failed to submit vote' });
    }
});
// POST /api/sessions/:id/agenda - Add agenda item (for testing)
router.post('/:id/agenda', async (req, res) => {
    try {
        const { title, description, options, proposedBy } = req.body;
        if (!title || !description || !options || !proposedBy) {
            return res.status(400).json({
                success: false,
                error: 'title, description, options, and proposedBy are required'
            });
        }
        const success = await databaseSessionService_1.dbSessionService.addAgendaItem(req.params.id, title, description, options, proposedBy);
        if (!success) {
            return res.status(400).json({ success: false, error: 'Failed to add agenda' });
        }
        res.status(201).json({
            success: true,
            data: { message: 'Agenda item added' },
        });
    }
    catch (error) {
        console.error('Error adding agenda:', error);
        res.status(500).json({ success: false, error: 'Failed to add agenda' });
    }
});
// POST /api/sessions/:id/phase - Transition phase (for testing)
router.post('/:id/phase', async (req, res) => {
    try {
        const { phase } = req.body;
        if (!phase) {
            return res.status(400).json({ success: false, error: 'phase is required' });
        }
        const success = await databaseSessionService_1.dbSessionService.transitionPhase(req.params.id, phase);
        if (!success) {
            return res.status(400).json({ success: false, error: 'Failed to transition phase' });
        }
        res.json({
            success: true,
            data: { message: `Phase transitioned to ${phase}` },
        });
    }
    catch (error) {
        console.error('Error transitioning phase:', error);
        res.status(500).json({ success: false, error: 'Failed to transition phase' });
    }
});
exports.default = router;
//# sourceMappingURL=sessions.js.map