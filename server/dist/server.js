"use strict";
// src/server.ts - Simplified version for Railway
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
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3004;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// Health check - MUST respond quickly for Railway
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '0.4.1',
        timestamp: new Date().toISOString(),
    });
});
// Static files
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
// Error handling
app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});
// Create HTTP server
const server = (0, http_1.createServer)(app);
// Create WebSocket server
const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
wss.on('connection', (ws, req) => {
    console.log('WebSocket client connected');
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
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
    });
});
// Start server immediately
server.listen(PORT, () => {
    console.log(`🚀 CorpSim Server v0.4.1 running on port ${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}/ws`);
});
//# sourceMappingURL=server.js.map