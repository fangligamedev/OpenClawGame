// src/server.ts

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import sessionRoutes from './routes/sessions';
import { sessionService } from './services/sessionService';

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json());

// Static files (observer web page)
const webPath = path.join(__dirname, '../../web');
app.use(express.static(webPath));

// Routes
app.use('/api/sessions', sessionRoutes);

// Serve pages
app.get('/', (req, res) => {
  res.sendFile(path.join(webPath, 'observer.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(webPath, 'dashboard.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '0.3.0',
    timestamp: new Date().toISOString(),
  });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');
  
  let sessionId: string | null = null;
  let unsubscribe: (() => void) | null = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'subscribe' && data.sessionId) {
        // Unsubscribe from previous session if any
        if (unsubscribe) {
          unsubscribe();
        }
        
        sessionId = data.sessionId;
        
        // Subscribe to session updates
        unsubscribe = sessionService.subscribe(sessionId, (update) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(update));
          }
        });
        
        // Send initial session state
        const session = sessionService.getSession(sessionId);
        if (session) {
          ws.send(JSON.stringify({
            type: 'connected',
            sessionId,
            timestamp: Date.now(),
            data: {
              companyName: session.companyName,
              phase: session.phase,
              participants: session.participants,
            },
          }));
        }
      }
      
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    if (unsubscribe) {
      unsubscribe();
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 CorpSim Server v0.3.0 running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
});
