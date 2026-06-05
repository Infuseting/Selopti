PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bien (
  id TEXT PRIMARY KEY,
  geo_location TEXT,
  publication_date TEXT,
  source_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS price (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bien_id TEXT NOT NULL,
  price INTEGER NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (bien_id) REFERENCES bien(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_price_bien_recorded_at
  ON price(bien_id, recorded_at DESC, id DESC);
