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

    payload = request.get_json(silent=True)
    if payload is None:
      return jsonify({"error": "request body is required"}), 400

    db = get_db()
    body, status = _handle_track_price_payload(db, payload, request)
    return jsonify(body), status

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
  _migrate_db(db)
  db.commit()


def _migrate_db(db):
  columns = {row[1] for row in db.execute("PRAGMA table_info(price)").fetchall()}

  if "user_uuid" not in columns:
    db.execute("ALTER TABLE price ADD COLUMN user_uuid TEXT")

  if "client_ip" not in columns:
    db.execute("ALTER TABLE price ADD COLUMN client_ip TEXT")


def _track_price_entry(db, payload, client_ip):
  if not isinstance(payload, dict):
    raise ValueError("request item must be an object")

  property_id = _resolve_property_id(payload)
  if not property_id:
    raise ValueError("propertyId is required")

  user_uuid = str(payload.get("userUuid") or "").strip()
  if not user_uuid:
    raise ValueError("userUuid is required")

  price = _to_int(payload.get("price"))
  if price is None or price <= 0:
    raise ValueError("price must be a positive integer")

  geo_location = payload.get("geoLocation")
  publication_date = payload.get("publicationDate")
  source_url = payload.get("url")

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
      "INSERT INTO price (bien_id, user_uuid, client_ip, price) VALUES (?, ?, ?, ?)",
      (property_id, user_uuid, client_ip, price),
    )
    inserted = True

  # --- Track profitability history if present in payload ---
  profitability = payload.get("profitability")
  if isinstance(profitability, dict):
    surf = profitability.get("surface")
    beds = profitability.get("bedrooms")
    charges = profitability.get("monthlyCharges")
    avg_rent = profitability.get("averageRentM2")
    dpe = profitability.get("dpe")

    config = profitability.get("config") or {}
    mortgage = config.get("mortgage") or {}
    roi_config = config.get("roi") or {}
    coloc = config.get("coloc") or {}

    m_rate = mortgage.get("annualRate")
    m_dur = mortgage.get("durationYears")
    m_dp = mortgage.get("downPaymentRatio")

    fn_pct = roi_config.get("fraisNotairePct")
    pno_pct = roi_config.get("pnoAnnualPct")
    ent_pct = roi_config.get("entretienAnnualPct")
    vac_class = roi_config.get("vacanceClassiqueMois")
    vac_coloc = roi_config.get("vacanceColocMois")
    tmi = roi_config.get("tmi")
    terr_pct = roi_config.get("terrainPct")

    coloc_sz = coloc.get("roomSizeM2")
    coloc_coef = coloc.get("appartCoef")

    r_brute = profitability.get("rentabilityBrute")
    r_nette = profitability.get("rentabilityNette")
    cf_mensuel = profitability.get("cashflowMensuel")
    score = profitability.get("score")
    v_signal = profitability.get("verdictSignal")

    # Fetch last recorded profitability entry for this property and user
    last_row = db.execute(
      """
      SELECT price, surface, bedrooms, monthly_charges, average_rent_m2, dpe,
             mortgage_annual_rate, mortgage_duration_years, mortgage_down_payment_ratio,
             frais_notaire_pct, pno_annual_pct, entretien_annual_pct,
             vacance_classique_mois, vacance_coloc_mois, tmi, terrain_pct,
             coloc_room_size_m2, coloc_appart_coef,
             rentability_brute, rentability_nette, cashflow_mensuel, score, verdict_signal
      FROM profitability_history
      WHERE bien_id = ? AND user_uuid = ?
      ORDER BY recorded_at DESC, id DESC
      LIMIT 1
      """,
      (property_id, user_uuid),
    ).fetchone()

    has_diff = True
    if last_row is not None:
      def approx_eq(a, b):
        if a is None and b is None: return True
        if a is None or b is None: return False
        try:
          return abs(float(a) - float(b)) < 1e-6
        except (ValueError, TypeError):
          return str(a) == str(b)

      has_diff = not (
        approx_eq(last_row["price"], price) and
        approx_eq(last_row["surface"], surf) and
        approx_eq(last_row["bedrooms"], beds) and
        approx_eq(last_row["monthly_charges"], charges) and
        approx_eq(last_row["average_rent_m2"], avg_rent) and
        approx_eq(last_row["dpe"], dpe) and
        approx_eq(last_row["mortgage_annual_rate"], m_rate) and
        approx_eq(last_row["mortgage_duration_years"], m_dur) and
        approx_eq(last_row["mortgage_down_payment_ratio"], m_dp) and
        approx_eq(last_row["frais_notaire_pct"], fn_pct) and
        approx_eq(last_row["pno_annual_pct"], pno_pct) and
        approx_eq(last_row["entretien_annual_pct"], ent_pct) and
        approx_eq(last_row["vacance_classique_mois"], vac_class) and
        approx_eq(last_row["vacance_coloc_mois"], vac_coloc) and
        approx_eq(last_row["tmi"], tmi) and
        approx_eq(last_row["terrain_pct"], terr_pct) and
        approx_eq(last_row["coloc_room_size_m2"], coloc_sz) and
        approx_eq(last_row["coloc_appart_coef"], coloc_coef) and
        approx_eq(last_row["rentability_brute"], r_brute) and
        approx_eq(last_row["rentability_nette"], r_nette) and
        approx_eq(last_row["cashflow_mensuel"], cf_mensuel) and
        approx_eq(last_row["score"], score) and
        approx_eq(last_row["verdict_signal"], v_signal)
      )

    if has_diff:
      db.execute(
        """
        INSERT INTO profitability_history (
          bien_id, user_uuid, price, surface, bedrooms, monthly_charges, average_rent_m2, dpe,
          mortgage_annual_rate, mortgage_duration_years, mortgage_down_payment_ratio,
          frais_notaire_pct, pno_annual_pct, entretien_annual_pct,
          vacance_classique_mois, vacance_coloc_mois, tmi, terrain_pct,
          coloc_room_size_m2, coloc_appart_coef,
          rentability_brute, rentability_nette, cashflow_mensuel, score, verdict_signal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
          property_id, user_uuid, price, surf, beds, charges, avg_rent, dpe,
          m_rate, m_dur, m_dp, fn_pct, pno_pct, ent_pct,
          vac_class, vac_coloc, tmi, terr_pct, coloc_sz, coloc_coef,
          r_brute, r_nette, cf_mensuel, score, v_signal
        )
      )

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

  return {
    "propertyId": property_id,
    "inserted": inserted,
    "history": history,
    "lastChange": _compute_last_change(history),
  }


def _handle_track_price_payload(db, payload, req):
  client_ip = _resolve_client_ip(req)

  if isinstance(payload, list):
    return _track_price_batch(db, payload, client_ip), 200

  if isinstance(payload, dict) and isinstance(payload.get("requests"), list):
    return _track_price_batch(db, payload["requests"], client_ip), 200

  if not isinstance(payload, dict):
    return {"error": "request body must be an object or an array"}, 400

  try:
    result = _track_price_entry(db, payload, client_ip)
    db.commit()
    return result, 200
  except ValueError as exc:
    db.rollback()
    return {"error": str(exc)}, 400
  except Exception:
    db.rollback()
    return {"error": "internal server error"}, 500


def _track_price_batch(db, requests, client_ip):
  results = []

  for item in requests:
    request_id = item.get("requestId") if isinstance(item, dict) else None
    try:
      data = _track_price_entry(db, item, client_ip)
      db.commit()
      results.append(
        {
          "requestId": request_id,
          "success": True,
          "data": data,
        }
      )
    except ValueError as exc:
      db.rollback()
      results.append(
        {
          "requestId": request_id,
          "success": False,
          "status": 400,
          "error": str(exc),
        }
      )
    except Exception:
      db.rollback()
      results.append(
        {
          "requestId": request_id,
          "success": False,
          "status": 500,
          "error": "internal server error",
        }
      )

  return {"results": results}


def _resolve_client_ip(req):
  forwarded_for = str(req.headers.get("X-Forwarded-For") or "").strip()
  if forwarded_for:
    return forwarded_for.split(",")[0].strip()

  real_ip = str(req.headers.get("X-Real-IP") or "").strip()
  if real_ip:
    return real_ip

  return str(req.remote_addr or "").strip() or None


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
