// src/server.ts - Simplified version for Railway

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import path from 'path';
import sessionRoutes from './routes/sessions';

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check - MUST respond quickly for Railway
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '0.4.1',
    timestamp: new Date().toISOString(),
  });
});

// Static files
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

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Start server immediately
server.listen(PORT, () => {
  console.log(`🚀 CorpSim Server v0.4.1 running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
});
