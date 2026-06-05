import os
import re
import sqlite3
from pathlib import Path

from flask import Flask, g, jsonify, request

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "selopti.db"
SCHEMA_PATH = BASE_DIR / "schema.sql"
PROPERTY_ID_REGEX = re.compile(r"(\d*)\.htm")


def create_app():
  app = Flask(__name__)
  app.config["JSON_SORT_KEYS"] = False

  @app.after_request
  def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
    return response

  @app.route("/health", methods=["GET"])
  def health():
    return jsonify({"ok": True})

  @app.route("/api/prices/track", methods=["POST", "OPTIONS"])
  def track_price():
    if request.method == "OPTIONS":
      return ("", 204)

    payload = request.get_json(silent=True) or {}

    property_id = _resolve_property_id(payload)
    if not property_id:
      return jsonify({"error": "propertyId is required"}), 400

    price = _to_int(payload.get("price"))
    if price is None or price <= 0:
      return jsonify({"error": "price must be a positive integer"}), 400

    geo_location = payload.get("geoLocation")
    publication_date = payload.get("publicationDate")
    source_url = payload.get("url")

    db = get_db()

    db.execute(
      """
      INSERT INTO bien (id, geo_location, publication_date, source_url)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        geo_location = COALESCE(excluded.geo_location, bien.geo_location),
        publication_date = COALESCE(excluded.publication_date, bien.publication_date),
        source_url = COALESCE(excluded.source_url, bien.source_url),
        updated_at = datetime('now')
      """,
      (property_id, geo_location, publication_date, source_url),
    )

    row = db.execute(
      """
      SELECT id, price
      FROM price
      WHERE bien_id = ?
      ORDER BY recorded_at DESC, id DESC
      LIMIT 1
      """,
      (property_id,),
    ).fetchone()

    inserted = False
    if row is None or int(row["price"]) != price:
      db.execute(
        "INSERT INTO price (bien_id, price) VALUES (?, ?)",
        (property_id, price),
      )
      inserted = True

    db.commit()

    history_rows = db.execute(
      """
      SELECT id, price, recorded_at
      FROM price
      WHERE bien_id = ?
      ORDER BY recorded_at ASC, id ASC
      """,
      (property_id,),
    ).fetchall()

    history = [
      {
        "id": item["id"],
        "price": int(item["price"]),
        "capturedAt": item["recorded_at"],
      }
      for item in history_rows
    ]

    last_change = _compute_last_change(history)

    return jsonify(
      {
        "propertyId": property_id,
        "inserted": inserted,
        "history": history,
        "lastChange": last_change,
      }
    )

  @app.route("/api/properties/<property_id>/prices", methods=["GET"])
  def get_property_prices(property_id):
    db = get_db()
    history_rows = db.execute(
      """
      SELECT id, price, recorded_at
      FROM price
      WHERE bien_id = ?
      ORDER BY recorded_at ASC, id ASC
      """,
      (property_id,),
    ).fetchall()

    history = [
      {
        "id": item["id"],
        "price": int(item["price"]),
        "capturedAt": item["recorded_at"],
      }
      for item in history_rows
    ]

    return jsonify(
      {
        "propertyId": property_id,
        "history": history,
        "lastChange": _compute_last_change(history),
      }
    )

  @app.teardown_appcontext
  def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
      db.close()

  with app.app_context():
    init_db()

  return app


def get_db():
  if "db" not in g:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    g.db = conn
  return g.db


def init_db():
  schema = SCHEMA_PATH.read_text(encoding="utf-8")
  db = get_db()
  db.executescript(schema)
  db.commit()


def _resolve_property_id(payload):
  property_id = str(payload.get("propertyId") or "").strip()
  if property_id:
    return property_id

  url = str(payload.get("url") or "")
  match = PROPERTY_ID_REGEX.search(url)
  if not match:
    return None

  extracted = match.group(1).strip()
  return extracted or None


def _to_int(value):
  try:
    return int(value)
  except (TypeError, ValueError):
    return None


def _compute_last_change(history):
  if len(history) < 2:
    return None

  prev_price = history[-2]["price"]
  last_price = history[-1]["price"]
  if prev_price <= 0:
    pct = None
  else:
    pct = ((last_price - prev_price) / prev_price) * 100

  return {
    "delta": last_price - prev_price,
    "percent": pct,
  }


app = create_app()

if __name__ == "__main__":
  host = os.getenv("HOST", "0.0.0.0")
  port = int(os.getenv("PORT", "3000"))
  app.run(host=host, port=port, debug=True)
