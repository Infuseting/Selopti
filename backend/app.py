import os
from flask import Flask, g
from .database import init_db
from .routes import api_bp

def create_app() -> Flask:
    """
    Application factory that creates and configures the Flask application.
    
    Returns:
        Flask: The configured Flask application instance.
    """
    app = Flask(__name__)
    app.config["JSON_SORT_KEYS"] = False

    @app.after_request
    def add_cors_headers(response):
        """
        Add CORS headers to every response.
        """
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
        return response

    app.register_blueprint(api_bp)

    @app.teardown_appcontext
    def close_db(_exc):
        """
        Close the database connection at the end of the request.
        """
        db = g.pop("db", None)
        if db is not None:
            db.close()

    with app.app_context():
        init_db()

    return app

if __name__ == "__main__":
    app = create_app()
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "3000"))
    app.run(host=host, port=port, debug=True)
