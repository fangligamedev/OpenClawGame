// Database configuration for CorpSim v0.4.0
// Supports PostgreSQL for persistence

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

// Get database config from environment variables
export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'corpsim',
    user: process.env.DB_USER || 'corpsim',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
  };
}

// SQL Schema for CorpSim
export const DATABASE_SCHEMA = `
-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  quarter INTEGER DEFAULT 1,
  phase VARCHAR(50) DEFAULT 'waiting',
  phase_started_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  company_state JSONB DEFAULT '{}',
  config JSONB DEFAULT '{}'
);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  type VARCHAR(50) DEFAULT 'lobster',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'online',
  has_voted BOOLEAN DEFAULT FALSE
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  author_id VARCHAR(255) NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reply_to UUID REFERENCES messages(id),
  mentions JSONB DEFAULT '[]',
  type VARCHAR(50) DEFAULT 'message'
);

-- Agenda items table
CREATE TABLE IF NOT EXISTS agenda_items (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  proposed_by UUID REFERENCES participants(id),
  proposed_by_role VARCHAR(50),
  options JSONB NOT NULL,
  votes JSONB DEFAULT '{}',
  deadline TIMESTAMP,
  passed BOOLEAN,
  chosen_option VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_agenda_session_id ON agenda_items(session_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for sessions table
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`;

// Connection string builder
export function buildConnectionString(config: DatabaseConfig): string {
  let connStr = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
  if (config.ssl) {
    connStr += '?sslmode=require';
  }
  return connStr;
}

// Check if database is configured
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL || !!process.env.DB_HOST;
}
