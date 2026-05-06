"""
HTTP route for a bundled dashboard payload (series + forecast + KPIs).
"""

# Third-party imports
from flask import abort, current_app, jsonify, request

# Local imports
from app.routes.stores import bp
from app.services.dashboard_service import build_dashboard
from app.services.retail_data import load_retail_csv


@bp.get("/<store_id>/dashboard")
def get_store_dashboard(store_id: str):
    """Return recent daily metrics, revenue forecast, and summary KPIs for one store.

    Query parameters:
        days: Length of the trailing daily series (default ``7``).
        forecast_horizon_days: Forward days for revenue prediction (default ``1``).

    Returns:
        JSON object suitable for the main dashboard view.

    Raises:
        HTTP 404: Store id is not in the dataset.
        HTTP 400: Invalid query parameters.
    """
    csv_path = current_app.config["RETAIL_CSV_PATH"]
    df = load_retail_csv(csv_path)

    if store_id not in set(df["Store ID"].astype(str).unique()):
        abort(404, description="Unknown store_id")

    days = request.args.get("days", default=7, type=int)
    fc_horizon = request.args.get("forecast_horizon_days", default=1, type=int)

    if days is None or days < 1:
        abort(400, description="days must be >= 1")
    if fc_horizon is None or fc_horizon < 1:
        abort(400, description="forecast_horizon_days must be >= 1")

    payload = build_dashboard(
        df,
        store_id,
        days=days,
        forecast_horizon_days=fc_horizon,
    )
    return jsonify(payload)
