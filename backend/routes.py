from flask import Blueprint, jsonify, request
from .database import get_db
from .services import handle_track_price_payload
from .utils import resolve_client_ip, compute_last_change

api_bp = Blueprint("api", __name__)

@api_bp.route("/health", methods=["GET"])
def health():
    """
    Health check endpoint to ensure the API is running.
    
    Returns:
        tuple: JSON response indicating ok status.
    """
    return jsonify({"ok": True})

@api_bp.route("/api/prices/track", methods=["POST", "OPTIONS"])
def track_price():
    """
    Endpoint for tracking a property price and profitability metrics.
    
    Returns:
        tuple: JSON response with tracking results and HTTP status code.
    """
    if request.method == "OPTIONS":
        return ("", 204)

    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "request body is required"}), 400

    db = get_db()
    client_ip = resolve_client_ip(request)
    body, status = handle_track_price_payload(db, payload, client_ip)
    return jsonify(body), status

@api_bp.route("/api/properties/<property_id>/prices", methods=["GET"])
def get_property_prices(property_id: str):
    """
    Endpoint for retrieving the price history of a specific property.
    
    Args:
        property_id (str): The unique identifier of the property.
        
    Returns:
        tuple: JSON response containing the property price history.
    """
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
            "lastChange": compute_last_change(history),
        }
    )
