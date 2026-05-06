"""
HTTP routes for revenue forecasts for a single store.
"""

# Third-party imports
from flask import abort, current_app, jsonify, request

# Local imports
from app.routes.stores import bp
from app.services.forecast_service import forecast_store_revenue
from app.services.retail_data import load_retail_csv


def _parse_horizon(value: str | None) -> int:
    """Parse a horizon like ``1d`` or ``7d`` into a number of days.

    Args:
        value: Raw query string or None.

    Returns:
        Positive integer number of days.

    Raises:
        ValueError: If the format is not supported.
    """
    if value is None or value.strip() == "":
        return 1
    v = value.strip().lower()
    if v.endswith("d"):
        n = int(v[:-1])
        if n < 1:
            raise ValueError
        return n
    n = int(v)
    if n < 1:
        raise ValueError
    return n


@bp.get("/<store_id>/forecasts/revenue")
def get_revenue_forecast(store_id: str):
    """Return predicted store revenue for upcoming days.

    Query parameters:
        horizon: Such as ``1d`` or ``7d`` (default ``1d``).

    Returns:
        JSON object including ``store_id``, ``horizon_days``, and forecast details.

    Raises:
        HTTP 404: Store id is not in the dataset.
        HTTP 400: Invalid ``horizon`` format.
    """
    csv_path = current_app.config["RETAIL_CSV_PATH"]
    df = load_retail_csv(csv_path)

    if store_id not in set(df["Store ID"].astype(str).unique()):
        abort(404, description="Unknown store_id")

    raw_h = request.args.get("horizon", default="1d")
    try:
        horizon_days = _parse_horizon(raw_h)
    except ValueError:
        abort(400, description="Invalid horizon; use e.g. 1d or 7d")

    payload = forecast_store_revenue(df, store_id, horizon_days=horizon_days)
    return jsonify(
        {
            "store_id": store_id,
            "horizon_days": horizon_days,
            **payload,
        }
    )
