import sqlite3
from .utils import resolve_property_id, to_int, compute_last_change, approx_eq
from .repository import (
    upsert_property, get_last_price, insert_price, get_last_profitability, 
    insert_profitability, get_property_price_history
)

def track_price_entry(db: sqlite3.Connection, payload: dict, client_ip: str) -> dict:
    """
    Process a single price tracking request, updating property, price, and profitability history.
    
    Args:
        db (sqlite3.Connection): Database connection.
        payload (dict): The request payload containing property details.
        client_ip (str): The client IP address.
        
    Returns:
        dict: A response dictionary containing the property history and update status.
        
    Raises:
        ValueError: If mandatory parameters are missing or invalid.
    """
    if not isinstance(payload, dict):
        raise ValueError("request item must be an object")

    property_id = resolve_property_id(payload)
    if not property_id:
        raise ValueError("propertyId is required")

    user_uuid = str(payload.get("userUuid") or "").strip()
    if not user_uuid:
        raise ValueError("userUuid is required")

    price = to_int(payload.get("price"))
    if price is None or price <= 0:
        raise ValueError("price must be a positive integer")

    geo_location = payload.get("geoLocation")
    publication_date = payload.get("publicationDate")
    source_url = payload.get("url")

    upsert_property(db, property_id, geo_location, publication_date, source_url)

    row = get_last_price(db, property_id)

    inserted = False
    if row is None or int(row["price"]) != price:
        insert_price(db, property_id, user_uuid, client_ip, price)
        inserted = True

    # --- Track profitability history if present in payload ---
    profitability = payload.get("profitability")
    if isinstance(profitability, dict):
        _process_profitability(db, property_id, user_uuid, price, profitability)

    history_rows = get_property_price_history(db, property_id)

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
        "lastChange": compute_last_change(history),
    }

def _process_profitability(db: sqlite3.Connection, property_id: str, user_uuid: str, price: int, profitability: dict) -> None:
    """
    Process and record the profitability metrics if they have changed.
    
    Args:
        db (sqlite3.Connection): Active database connection.
        property_id (str): Property identifier.
        user_uuid (str): User identifier.
        price (int): Current property price.
        profitability (dict): Profitability configuration dictionary.
    """
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

    last_row = get_last_profitability(db, property_id, user_uuid)

    has_diff = True
    if last_row is not None:
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
        params = (
            property_id, user_uuid, price, surf, beds, charges, avg_rent, dpe,
            m_rate, m_dur, m_dp, fn_pct, pno_pct, ent_pct,
            vac_class, vac_coloc, tmi, terr_pct, coloc_sz, coloc_coef,
            r_brute, r_nette, cf_mensuel, score, v_signal
        )
        insert_profitability(db, params)

def track_price_batch(db: sqlite3.Connection, requests: list, client_ip: str) -> dict:
    """
    Process multiple price tracking entries sequentially.
    
    Args:
        db (sqlite3.Connection): Active database connection.
        requests (list): A list of price entry payloads.
        client_ip (str): Client IP address.
        
    Returns:
        dict: A dictionary containing the processing results for each request.
    """
    results = []

    for item in requests:
        request_id = item.get("requestId") if isinstance(item, dict) else None
        try:
            data = track_price_entry(db, item, client_ip)
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
        except Exception as exc:
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

def handle_track_price_payload(db: sqlite3.Connection, payload: any, client_ip: str) -> tuple:
    """
    Determine if the payload represents a single entry or a batch and process it.
    
    Args:
        db (sqlite3.Connection): Active database connection.
        payload (any): The incoming request JSON payload.
        client_ip (str): The IP address of the client making the request.
        
    Returns:
        tuple: A tuple containing the JSON response dict and the HTTP status code.
    """
    if isinstance(payload, list):
        return track_price_batch(db, payload, client_ip), 200

    if isinstance(payload, dict) and isinstance(payload.get("requests"), list):
        return track_price_batch(db, payload["requests"], client_ip), 200

    if not isinstance(payload, dict):
        return {"error": "request body must be an object or an array"}, 400

    try:
        result = track_price_entry(db, payload, client_ip)
        db.commit()
        return result, 200
    except ValueError as exc:
        db.rollback()
        return {"error": str(exc)}, 400
    except Exception:
        db.rollback()
        return {"error": "internal server error"}, 500
