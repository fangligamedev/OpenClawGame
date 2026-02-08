"use strict";
// src/server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ws_1 = require("ws");
const http_1 = require("http");
const path_1 = __importDefault(require("path"));
const sessions_1 = __importDefault(require("./routes/sessions"));
const databaseSessionService_1 = require("./services/databaseSessionService");
const database_1 = require("./config/database");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3004;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Request timeout middleware
app.use((req, res, next) => {
    res.setTimeout(30000, () => {
        console.error('Request timeout:', req.method, req.url);
        res.status(504).json({ success: false, error: 'Request timeout' });
    });
    next();
});
// Static files (observer web page)
const webPath = path_1.default.join(__dirname, '../../web');
app.use(express_1.default.static(webPath));
// Routes
app.use('/api/sessions', sessions_1.default);
// Serve pages
app.get('/', (req, res) => {
    res.sendFile(path_1.default.join(webPath, 'observer.html'));
});
app.get('/dashboard', (req, res) => {
    res.sendFile(path_1.default.join(webPath, 'dashboard.html'));
});
// Health check
app.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        const dbConnected = await (0, database_1.testConnection)();
        res.json({
            status: 'ok',
            version: '0.3.0',
            database: dbConnected ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        res.json({
            status: 'ok',
            version: '0.3.0',
            database: 'error',
            timestamp: new Date().toISOString(),
        });
    }
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    });
});
// Create HTTP server
const server = (0, http_1.createServer)(app);
// Create WebSocket server
const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    let sessionId = null;
    let unsubscribe = null;
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message.toString());
            if (data.type === 'subscribe' && data.sessionId) {
                // Unsubscribe from previous session if any
                if (unsubscribe) {
                    unsubscribe();
                }
                sessionId = data.sessionId;
                // Subscribe to session updates
                if (sessionId) {
                    unsubscribe = databaseSessionService_1.dbSessionService.subscribe(sessionId, (update) => {
                        if (ws.readyState === ws.OPEN) {
                            try {
                                ws.send(JSON.stringify(update));
                            }
                            catch (err) {
                                console.error('Error sending WebSocket message:', err);
                            }
                        }
                    });
                }
                // Send initial session state
                try {
                    const session = sessionId ? await databaseSessionService_1.dbSessionService.getSession(sessionId) : null;
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
                }
                catch (err) {
                    console.error('Error getting session for WebSocket:', err);
                }
            }
            if (data.type === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
        }
        catch (err) {
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
    // Initialize database (non-blocking)
    console.log('🔌 Connecting to database...');
    const dbConnected = await (0, database_1.initializeTables)();
    if (dbConnected) {
        console.log('✅ Database initialized');
    }
    else {
        console.log('⚠️ Database not available, using in-memory storage');
    }
    // Start server (always)
    server.listen(PORT, () => {
        if (dbConnected) {
            console.log(`🚀 CorpSim Server v0.4.0 running on port ${PORT}`);
        }
        else {
            console.log(`🚀 CorpSim Server v0.4.0 running on port ${PORT} (in-memory mode)`);
        }
        console.log(`📊 API: http://localhost:${PORT}/api`);
        console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
    });
}
startServer();
//# sourceMappingURL=server.js.map