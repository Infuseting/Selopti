import sqlite3
from pathlib import Path
from flask import g

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "selopti.db"
SCHEMA_PATH = BASE_DIR / "schema.sql"

def get_db() -> sqlite3.Connection:
    """
    Retrieve or create a SQLite database connection for the current Flask context.
    
    Returns:
        sqlite3.Connection: The active SQLite connection.
    """
    if "db" not in g:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        g.db = conn
    return g.db

def init_db() -> None:
    """
    Initialize the database by executing the schema.sql script and applying migrations.
    """
    schema = SCHEMA_PATH.read_text(encoding="utf-8")
    db = get_db()
    db.executescript(schema)
    _migrate_db(db)
    db.commit()

def _migrate_db(db: sqlite3.Connection) -> None:
    """
    Apply any necessary database schema migrations.
    
    Args:
        db (sqlite3.Connection): The SQLite database connection.
    """
    columns = {row[1] for row in db.execute("PRAGMA table_info(price)").fetchall()}

    if "user_uuid" not in columns:
        db.execute("ALTER TABLE price ADD COLUMN user_uuid TEXT")

    if "client_ip" not in columns:
        db.execute("ALTER TABLE price ADD COLUMN client_ip TEXT")

def close_db(_exc=None) -> None:
    """
    Close the database connection at the end of the request.
    
    Args:
        _exc (Exception, optional): An unhandled exception, if any.
    """
    db = g.pop("db", None)
    if db is not None:
        db.close()
