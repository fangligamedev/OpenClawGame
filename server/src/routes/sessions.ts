// src/routes/sessions.ts

import { Router, Request, Response } from 'express';
import { sessionService } from '../services/sessionService';
import { Session, Participant } from '../models/types';

const router = Router();

// GET /api/sessions - List all active sessions
router.get('/', (req: Request, res: Response) => {
  try {
    const sessions = sessionService.listSessions();
    res.json({
      success: true,
      data: sessions.map((s: Session) => ({
        id: s.id,
        companyName: s.companyName,
        quarter: s.quarter,
        phase: s.phase,
        participantCount: s.participants.length,
        createdAt: s.createdAt,
        availableRoles: ['ceo', 'cto', 'cmo'].filter(
          (role: string) => !s.participants.some((p: Participant) => p.role === role)
        ),
      })),
    });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ success: false, error: 'Failed to list sessions' });
  }
});

// POST /api/sessions - Create new session
router.post('/', (req: Request, res: Response) => {
  try {
    const { companyName, quarter, createdBy } = req.body;
    
    if (!companyName || !createdBy) {
      return res.status(400).json({ 
        success: false, 
        error: 'companyName and createdBy are required' 
      });
    }

    const session = sessionService.createSession({
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
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

// GET /api/sessions/:id - Get session details
router.get('/:id', (req: Request, res: Response) => {
  try {
    const session = sessionService.getSession(req.params.id);
    
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
        participants: session.participants.map((p: Participant) => ({
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
        availableRoles: ['ceo', 'cto', 'cmo'].filter(
          (role: string) => !session.participants.some((p: Participant) => p.role === role)
        ),
      },
    });
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ success: false, error: 'Failed to get session' });
  }
});

// POST /api/sessions/:id/join - Join session
router.post('/:id/join', (req: Request, res: Response) => {
  try {
    const { agentId, agentName, role, type } = req.body;
    
    if (!agentId || !agentName || !role) {
      return res.status(400).json({ 
        success: false, 
        error: 'agentId, agentName, and role are required' 
      });
    }

    const result = sessionService.joinSession(req.params.id, {
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
  } catch (error) {
    console.error('Error joining session:', error);
    res.status(500).json({ success: false, error: 'Failed to join session' });
  }
});

// POST /api/sessions/:id/messages - Send message
router.post('/:id/messages', (req: Request, res: Response) => {
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

    const result = sessionService.sendMessage(sessionId, {
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
  } catch (error) {
    console.error('[API /messages] Exception:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// GET /api/sessions/:id/messages - Get messages
router.get('/:id/messages', (req: Request, res: Response) => {
  try {
    const session = sessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = session.messages.slice(-limit);
    
    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ success: false, error: 'Failed to get messages' });
  }
});

// POST /api/sessions/:id/vote - Submit vote
router.post('/:id/vote', (req: Request, res: Response) => {
  try {
    const { agentId, agendaId, option, reasoning } = req.body;
    
    if (!agentId || !agendaId || option === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'agentId, agendaId, and option are required' 
      });
    }

    const result = sessionService.submitVote(req.params.id, {
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
  } catch (error) {
    console.error('Error submitting vote:', error);
    res.status(500).json({ success: false, error: 'Failed to submit vote' });
  }
});

// POST /api/sessions/:id/agenda - Add agenda item
router.post('/:id/agenda', (req: Request, res: Response) => {
  try {
    const { title, description, options, proposedBy } = req.body;
    
    if (!title || !description || !options || !proposedBy) {
      return res.status(400).json({ 
        success: false, 
        error: 'title, description, options, and proposedBy are required' 
      });
    }

    const success = sessionService.addAgendaItem(
      req.params.id,
      title,
      description,
      options,
      proposedBy
    );

    if (!success) {
      return res.status(400).json({ success: false, error: 'Failed to add agenda' });
    }

    res.status(201).json({
      success: true,
      data: { message: 'Agenda item added' },
    });
  } catch (error) {
    console.error('Error adding agenda:', error);
    res.status(500).json({ success: false, error: 'Failed to add agenda' });
  }
});

// POST /api/sessions/:id/phase - Transition phase
router.post('/:id/phase', (req: Request, res: Response) => {
  try {
    const { phase } = req.body;
    
    if (!phase) {
      return res.status(400).json({ success: false, error: 'phase is required' });
    }

    const success = sessionService.transitionPhase(req.params.id, phase);

    if (!success) {
      return res.status(400).json({ success: false, error: 'Failed to transition phase' });
    }

    res.json({
      success: true,
      data: { message: `Phase transitioned to ${phase}` },
    });
  } catch (error) {
    console.error('Error transitioning phase:', error);
    res.status(500).json({ success: false, error: 'Failed to transition phase' });
  }
});

export default router;
