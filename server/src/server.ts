// src/server.ts

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import sessionRoutes from './routes/sessions';
import { dbSessionService as sessionService } from './services/databaseSessionService';
import { initializeTables } from './config/database';

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request timeout middleware
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    console.error('Request timeout:', req.method, req.url);
    res.status(504).json({ success: false, error: 'Request timeout' });
  });
  next();
});

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
app.get('/api/health', async (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '0.4.0',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
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

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message.toString());
      
      if (data.type === 'subscribe' && data.sessionId) {
        if (unsubscribe) {
          unsubscribe();
        }
        
        sessionId = data.sessionId;
        
        if (sessionId) {
          unsubscribe = sessionService.subscribe(sessionId, (update: any) => {
            if (ws.readyState === ws.OPEN) {
              try {
                ws.send(JSON.stringify(update));
              } catch (err) {
                console.error('Error sending WebSocket message:', err);
              }
            }
          });
        }
        
        try {
          const session = sessionId ? await sessionService.getSession(sessionId) : null;
          if (session && ws.readyState === ws.OPEN) {
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
        } catch (err) {
          console.error('Error getting session for WebSocket:', err);
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

// Initialize database and start server
async function startServer() {
  console.log('🔌 Connecting to database...');
  const dbConnected = await initializeTables();
  
  if (dbConnected) {
    console.log('✅ Database initialized');
  } else {
    console.log('⚠️ Database not available, using in-memory storage');
  }
  
  server.listen(PORT, () => {
    if (dbConnected) {
      console.log(`🚀 CorpSim Server v0.4.0 running on port ${PORT}`);
    } else {
      console.log(`🚀 CorpSim Server v0.4.0 running on port ${PORT} (in-memory mode)`);
    }
    console.log(`📊 API: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
  });
}

startServer();
