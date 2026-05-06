"""
Store collection routes (list all stores).

Other store-scoped routes live in ``metrics``, ``forecasts``, and ``dashboard``
modules that import the same ``bp`` object so all paths share the ``/stores`` URL prefix.
"""

# Third-party imports
from flask import Blueprint, current_app, jsonify

# Local imports
from app.services.store_service import list_stores

# Blueprint: route paths are relative; the app mounts this at ``/api/stores`` (see ``create_app``).
bp = Blueprint("stores", __name__)


@bp.get("")
def get_stores():
    """List distinct store ids from the retail dataset.

    Returns:
        JSON array of objects with an ``id`` field per store.
    """
    # Resolve CSV path from application config.
    path = current_app.config["RETAIL_CSV_PATH"]
    return jsonify(list_stores(path))
