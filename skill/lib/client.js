// skill/lib/client.js
// CorpSim API Client

const http = require('http');

class CorpSimClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  // Helper for HTTP requests
  async request(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (!parsed.success) {
              reject(new Error(parsed.error || 'Request failed'));
            } else {
              resolve(parsed.data);
            }
          } catch (e) {
            resolve(body);
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  // List active sessions
  async listSessions() {
    return this.request('/api/sessions');
  }

  // Create new session
  async createSession(companyName, createdBy) {
    return this.request('/api/sessions', 'POST', {
      companyName,
      createdBy,
    });
  }

  // Get session details
  async getSession(sessionId) {
    return this.request(`/api/sessions/${sessionId}`);
  }

  // Join session
  async joinSession(sessionId, participant) {
    return this.request(`/api/sessions/${sessionId}/join`, 'POST', participant);
  }

  // Send message
  async sendMessage(sessionId, agentId, content, replyTo = null) {
    return this.request(`/api/sessions/${sessionId}/messages`, 'POST', {
      agentId,
      content,
      replyTo,
    });
  }

  // Submit vote
  async submitVote(sessionId, agentId, agendaId, option, reasoning = '') {
    return this.request(`/api/sessions/${sessionId}/vote`, 'POST', {
      agentId,
      agendaId,
      option,
      reasoning,
    });
  }

  // Add agenda item
  async addAgenda(sessionId, title, description, options, proposedBy) {
    return this.request(`/api/sessions/${sessionId}/agenda`, 'POST', {
      title,
      description,
      options,
      proposedBy,
    });
  }

  // Change phase
  async changePhase(sessionId, phase) {
    return this.request(`/api/sessions/${sessionId}/phase`, 'POST', {
      phase,
    });
  }
}

module.exports = { CorpSimClient };
