import sqlite3

def upsert_property(db: sqlite3.Connection, property_id: str, geo_location: str, publication_date: str, source_url: str) -> None:
    """
    Insert or update a property record in the database.
    
    Args:
        db (sqlite3.Connection): The active database connection.
        property_id (str): The unique identifier for the property.
        geo_location (str): The coordinates or location string.
        publication_date (str): The date the property was published.
        source_url (str): The source URL of the property listing.
    """
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

def get_last_price(db: sqlite3.Connection, property_id: str) -> sqlite3.Row:
    """
    Retrieve the most recently recorded price for a property.
    
    Args:
        db (sqlite3.Connection): The database connection.
        property_id (str): The unique property identifier.
        
    Returns:
        sqlite3.Row: The database row representing the last price, or None if no price exists.
    """
    return db.execute(
        """
        SELECT id, price
        FROM price
        WHERE bien_id = ?
        ORDER BY recorded_at DESC, id DESC
        LIMIT 1
        """,
        (property_id,),
    ).fetchone()

def insert_price(db: sqlite3.Connection, property_id: str, user_uuid: str, client_ip: str, price: int) -> None:
    """
    Record a new price point for a property.
    
    Args:
        db (sqlite3.Connection): The database connection.
        property_id (str): The unique property identifier.
        user_uuid (str): The identifier of the user tracking the price.
        client_ip (str): The client IP address.
        price (int): The current price value.
    """
    db.execute(
        "INSERT INTO price (bien_id, user_uuid, client_ip, price) VALUES (?, ?, ?, ?)",
        (property_id, user_uuid, client_ip, price),
    )

def get_last_profitability(db: sqlite3.Connection, property_id: str, user_uuid: str) -> sqlite3.Row:
    """
    Retrieve the most recently recorded profitability configuration for a specific property and user.
    
    Args:
        db (sqlite3.Connection): The database connection.
        property_id (str): The property identifier.
        user_uuid (str): The user's UUID.
        
    Returns:
        sqlite3.Row: The profitability history row, or None.
    """
    return db.execute(
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

def insert_profitability(db: sqlite3.Connection, params: tuple) -> None:
    """
    Insert a new profitability snapshot into the history table.
    
    Args:
        db (sqlite3.Connection): The database connection.
        params (tuple): A tuple containing all required column values matching the INSERT schema.
    """
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
        params
    )

def get_property_price_history(db: sqlite3.Connection, property_id: str) -> list:
    """
    Retrieve the entire chronological price history for a given property.
    
    Args:
        db (sqlite3.Connection): The database connection.
        property_id (str): The property identifier.
        
    Returns:
        list[sqlite3.Row]: A list of price rows.
    """
    return db.execute(
        """
        SELECT id, price, recorded_at
        FROM price
        WHERE bien_id = ?
        ORDER BY recorded_at ASC, id ASC
        """,
        (property_id,),
    ).fetchall()
