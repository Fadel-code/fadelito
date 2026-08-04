-- Assistente Fadelito — estrutura portátil para SQLite/D1
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS protocols (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  area TEXT NOT NULL,
  category TEXT NOT NULL,
  keywords_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL CHECK (status IN ('validado', 'revisao')),
  summary TEXT NOT NULL,
  actions_json TEXT NOT NULL DEFAULT '[]',
  family_message TEXT NOT NULL DEFAULT '',
  attention TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1)),
  source TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS protocols_title_idx ON protocols(title);
CREATE INDEX IF NOT EXISTS protocols_area_idx ON protocols(area);
CREATE INDEX IF NOT EXISTS protocols_category_idx ON protocols(category);
CREATE INDEX IF NOT EXISTS protocols_published_idx ON protocols(published);

CREATE TABLE IF NOT EXISTS consultation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  protocol_id TEXT,
  found INTEGER NOT NULL DEFAULT 1 CHECK (found IN (0, 1)),
  consulted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (protocol_id) REFERENCES protocols(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS consultation_events_protocol_idx ON consultation_events(protocol_id);
CREATE INDEX IF NOT EXISTS consultation_events_date_idx ON consultation_events(consulted_at);
