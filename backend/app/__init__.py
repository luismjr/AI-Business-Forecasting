"""
Create a Flask app instance.

"""
# Standard library imports
from flask import Flask

# Local imports
from app.config import Config
from app.routes.stores import bp as stores_bp
from app.routes.whatif import bp as whatif_bp

# Register additional routes on the same ``stores`` blueprint (side-effect imports).
import app.routes.dashboard  # noqa: F401
import app.routes.forecasts  # noqa: F401
import app.routes.metrics  # noqa: F401


def create_app(config_class: type = Config) -> Flask:
    """Create a Flask app instance.
    Args:
        config_class: The configuration class to use for the app.
    Returns:
        A Flask app instance.
    """
    # Create a Flask app instance.
    app = Flask(__name__)
    # Load the configuration.
    app.config.from_object(config_class)
    # Mount store routes at ``/api/stores/...`` (pass the full prefix here — Flask does not merge
    # ``register_blueprint(url_prefix=...)`` with ``Blueprint(..., url_prefix=...)``).
    app.register_blueprint(stores_bp, url_prefix="/api/stores")
    app.register_blueprint(whatif_bp, url_prefix="/api/what-if")

    # Allow browsers to call the API from another origin (e.g. hosted frontend). Tighten origins in production.
    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response

    # Define a home route.
    @app.route("/")
    def home():
        return {"message": "AI Business Forecasting API is running"}

    return app
