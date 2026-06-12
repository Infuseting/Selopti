import re
from flask import Request

PROPERTY_ID_REGEX = re.compile(r"(\d*)\.htm")

def resolve_client_ip(req: Request) -> str:
    """
    Resolve the client's IP address from the request headers or remote_addr.
    
    Args:
        req (flask.Request): The current Flask request.
        
    Returns:
        str: The resolved IP address, or None if it cannot be determined.
    """
    forwarded_for = str(req.headers.get("X-Forwarded-For") or "").strip()
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    real_ip = str(req.headers.get("X-Real-IP") or "").strip()
    if real_ip:
        return real_ip

    return str(req.remote_addr or "").strip() or None

def resolve_property_id(payload: dict) -> str:
    """
    Extract the property ID from the payload or parse it from the URL.
    
    Args:
        payload (dict): The incoming request payload containing property details.
        
    Returns:
        str: The extracted property ID, or None if not found.
    """
    property_id = str(payload.get("propertyId") or "").strip()
    if property_id:
        return property_id

    url = str(payload.get("url") or "")
    match = PROPERTY_ID_REGEX.search(url)
    if not match:
        return None

    extracted = match.group(1).strip()
    return extracted or None

def to_int(value: any) -> int:
    """
    Convert a given value to an integer safely.
    
    Args:
        value (any): The value to convert.
        
    Returns:
        int: The converted integer, or None if conversion fails.
    """
    try:
        return int(value)
    except (TypeError, ValueError):
        return None

def compute_last_change(history: list) -> dict:
    """
    Compute the difference and percentage change between the last two price points.
    
    Args:
        history (list): A list of price history dictionaries, ordered chronologically.
        
    Returns:
        dict: A dictionary containing the price delta and percentage change, or None if less than 2 entries.
    """
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

def approx_eq(a: any, b: any) -> bool:
    """
    Compare two values for approximate equality, handling floats and None types.
    
    Args:
        a (any): First value.
        b (any): Second value.
        
    Returns:
        bool: True if values are approximately equal, False otherwise.
    """
    if a is None and b is None: return True
    if a is None or b is None: return False
    try:
        return abs(float(a) - float(b)) < 1e-6
    except (ValueError, TypeError):
        return str(a) == str(b)
