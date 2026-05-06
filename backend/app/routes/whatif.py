"""What-if analysis routes."""

from flask import Blueprint, current_app, jsonify, request

from app.services.whatif_service import get_options, run_what_if

bp = Blueprint("whatif", __name__)


@bp.get("/options")
def options():
    path = current_app.config["RETAIL_CSV_PATH"]
    return jsonify(get_options(path))


@bp.post("")
def analyse():
    body = request.get_json(force=True) or {}
    path = current_app.config["RETAIL_CSV_PATH"]
    try:
        return jsonify(run_what_if(path, body))
    except (ValueError, KeyError) as exc:
        return jsonify({"error": str(exc)}), 400
