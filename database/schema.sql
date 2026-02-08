-- CorpSim Database Schema
-- PostgreSQL

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 会话表
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL,
  quarter INTEGER DEFAULT 1,
  phase VARCHAR(50) DEFAULT 'waiting',
  phase_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  company_state JSONB DEFAULT '{}',
  config JSONB DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 参与者表
CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  type VARCHAR(50) DEFAULT 'human',
  status VARCHAR(50) DEFAULT 'online',
  has_voted BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, agent_id)
);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  author_id VARCHAR(255) NOT NULL,
  author_name VARCHAR(255),
  author_role VARCHAR(50),
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'message',
  reply_to UUID REFERENCES messages(id),
  mentions UUID[] DEFAULT '{}',
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 议程表
CREATE TABLE IF NOT EXISTS agenda_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  proposed_by VARCHAR(255),
  proposed_by_role VARCHAR(50),
  options TEXT[] DEFAULT '{}',
  votes JSONB DEFAULT '{}',
  deadline TIMESTAMP,
  passed BOOLEAN,
  chosen_option VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 游戏历史表
CREATE TABLE IF NOT EXISTS game_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  quarter INTEGER NOT NULL,
  phase VARCHAR(50) NOT NULL,
  action VARCHAR(255) NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 事件触发记录表
CREATE TABLE IF NOT EXISTS event_triggers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_id VARCHAR(255) NOT NULL,
  event_name VARCHAR(255),
  effects JSONB DEFAULT '{}',
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_agenda_items_session_id ON agenda_items(session_id);
CREATE INDEX IF NOT EXISTS idx_game_history_session_id ON game_history(session_id);

-- 更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
