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
  user_uuid TEXT,
  client_ip TEXT,
  price INTEGER NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (bien_id) REFERENCES bien(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_price_bien_recorded_at
  ON price(bien_id, recorded_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS profitability_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bien_id TEXT NOT NULL,
  user_uuid TEXT NOT NULL,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- Raw Metrics (objective characteristics)
  price INTEGER NOT NULL,
  surface REAL,
  bedrooms INTEGER,
  monthly_charges REAL,
  average_rent_m2 REAL,
  dpe TEXT,
  
  -- Configuration parameters (the user-specific config used)
  mortgage_annual_rate REAL,
  mortgage_duration_years INTEGER,
  mortgage_down_payment_ratio REAL,
  frais_notaire_pct REAL,
  pno_annual_pct REAL,
  entretien_annual_pct REAL,
  vacance_classique_mois REAL,
  vacance_coloc_mois REAL,
  tmi REAL,
  terrain_pct REAL,
  coloc_room_size_m2 REAL,
  coloc_appart_coef REAL,
  
  -- Calculated Metrics (outputs)
  rentability_brute REAL,
  rentability_nette REAL,
  cashflow_mensuel REAL,
  score REAL,
  verdict_signal TEXT,
  
  FOREIGN KEY (bien_id) REFERENCES bien(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_profitability_bien_user_recorded_at
  ON profitability_history(bien_id, user_uuid, recorded_at DESC, id DESC);

