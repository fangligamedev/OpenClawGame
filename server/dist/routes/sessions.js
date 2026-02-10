"use strict";
// src/routes/sessions.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sessionService_1 = require("../services/sessionService");
const roleManager_1 = require("../services/roleManager");
const rateLimiter_1 = require("../services/rateLimiter");
const router = (0, express_1.Router)();
// GET /api/sessions - List all active sessions
router.get('/', (req, res) => {
    try {
        const sessions = sessionService_1.sessionService.listSessions();
        res.json({
            success: true,
            data: sessions.map((s) => ({
                id: s.id,
                companyName: s.companyName,
                quarter: s.quarter,
                phase: s.phase,
                participantCount: s.participants.length,
                createdAt: s.createdAt,
                availableRoles: roleManager_1.roleManager.getAvailableRoles(s.id),
                isFull: roleManager_1.roleManager.isSessionFull(s.id),
            })),
        });
    }
    catch (error) {
        console.error('Error listing sessions:', error);
        res.status(500).json({ success: false, error: 'Failed to list sessions' });
    }
});
// POST /api/sessions - Create new session
router.post('/', (req, res) => {
    try {
        const { companyName, quarter, createdBy } = req.body;
        if (!companyName || !createdBy) {
            return res.status(400).json({
                success: false,
                error: 'companyName and createdBy are required'
            });
        }
        const session = sessionService_1.sessionService.createSession({
            companyName,
            quarter,
            createdBy,
        });
        // Initialize role manager for this session
        roleManager_1.roleManager.initializeSession(session.id);
        res.status(201).json({
            success: true,
            data: {
                id: session.id,
                companyName: session.companyName,
                quarter: session.quarter,
                phase: session.phase,
                joinUrl: `/api/sessions/${session.id}/join`,
                availableRoles: ['ceo', 'cto', 'cmo'],
            },
        });
    }
    catch (error) {
        console.error('Error creating session:', error);
        res.status(500).json({ success: false, error: 'Failed to create session' });
    }
});
// GET /api/sessions/:id - Get session details
router.get('/:id', (req, res) => {
    try {
        const session = sessionService_1.sessionService.getSession(req.params.id);
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
                messages: session.messages.slice(-50),
                companyState: session.companyState,
                availableRoles: roleManager_1.roleManager.getAvailableRoles(session.id),
                isFull: roleManager_1.roleManager.isSessionFull(session.id),
            },
        });
    }
    catch (error) {
        console.error('Error getting session:', error);
        res.status(500).json({ success: false, error: 'Failed to get session' });
    }
});
// POST /api/sessions/:id/join - Join session
router.post('/:id/join', (req, res) => {
    try {
        const { agentId, agentName, role, type } = req.body;
        if (!agentId || !agentName || !role) {
            return res.status(400).json({
                success: false,
                error: 'agentId, agentName, and role are required'
            });
        }
        const result = sessionService_1.sessionService.joinSession(req.params.id, {
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
                token: result.token,
                message: `Joined as ${role.toUpperCase()}`,
                availableRoles: roleManager_1.roleManager.getAvailableRoles(req.params.id),
                isSessionFull: roleManager_1.roleManager.isSessionFull(req.params.id),
            },
        });
    }
    catch (error) {
        console.error('Error joining session:', error);
        res.status(500).json({ success: false, error: 'Failed to join session' });
    }
});
// POST /api/sessions/:id/messages - Send message (with rate limiting)
router.post('/:id/messages', (req, res) => {
    try {
        const { agentId, content, replyTo } = req.body;
        const sessionId = req.params.id;
        console.log(`[API /messages] Received request: sessionId=${sessionId}, agentId=${agentId}`);
        if (!agentId || !content) {
            console.error('[API /messages] Missing required fields');
            return res.status(400).json({
                success: false,
                error: 'agentId and content are required'
            });
        }
        // Check rate limit
        const rateLimitResult = rateLimiter_1.rateLimiter.canMakeRequest(agentId);
        if (!rateLimitResult.allowed) {
            console.error(`[API /messages] Rate limit exceeded for agent: ${agentId}`);
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded. Please wait before sending more messages.',
                retryAfter: rateLimitResult.retryAfter,
            });
        }
        const result = sessionService_1.sessionService.sendMessage(sessionId, {
            agentId,
            content,
            replyTo,
        });
        if (!result.success) {
            console.error(`[API /messages] Failed: ${result.error}`);
            return res.status(400).json({ success: false, error: result.error });
        }
        console.log(`[API /messages] Success: messageId=${result.message?.id}`);
        res.status(201).json({
            success: true,
            data: { message: result.message },
        });
    }
    catch (error) {
        console.error('[API /messages] Exception:', error);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});
// GET /api/sessions/:id/messages - Get messages
router.get('/:id/messages', (req, res) => {
    try {
        const session = sessionService_1.sessionService.getSession(req.params.id);
        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }
        const limit = parseInt(req.query.limit) || 50;
        const messages = session.messages.slice(-limit);
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
router.post('/:id/vote', (req, res) => {
    try {
        const { agentId, agendaId, option, reasoning } = req.body;
        if (!agentId || !agendaId || option === undefined) {
            return res.status(400).json({
                success: false,
                error: 'agentId, agendaId, and option are required'
            });
        }
        const result = sessionService_1.sessionService.submitVote(req.params.id, {
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
// POST /api/sessions/:id/agenda - Add agenda item
router.post('/:id/agenda', (req, res) => {
    try {
        const { title, description, options, proposedBy } = req.body;
        if (!title || !description || !options || !proposedBy) {
            return res.status(400).json({
                success: false,
                error: 'title, description, options, and proposedBy are required'
            });
        }
        const success = sessionService_1.sessionService.addAgendaItem(req.params.id, title, description, options, proposedBy);
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
// POST /api/sessions/:id/phase - Transition phase
router.post('/:id/phase', (req, res) => {
    try {
        const { phase } = req.body;
        if (!phase) {
            return res.status(400).json({ success: false, error: 'phase is required' });
        }
        const success = sessionService_1.sessionService.transitionPhase(req.params.id, phase);
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