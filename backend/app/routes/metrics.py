"""
HTTP routes for per-store daily metrics (revenue, units sold).
"""

# Standard library imports
from datetime import date, timedelta

# Third-party imports
from flask import abort, current_app, jsonify, request

# Local imports
from app.routes.stores import bp
from app.services.metrics_service import daily_metrics, parse_iso_date
from app.services.retail_data import load_retail_csv


@bp.get("/<store_id>/metrics/daily")
def get_daily_metrics(store_id: str):
    """Return daily aggregates for one store between ``from`` and ``to`` (inclusive).

    Query parameters:
        from: ISO date ``YYYY-MM-DD`` (optional; defaults with ``to`` to last 7 days).
        to: ISO date ``YYYY-MM-DD`` (optional).

    Returns:
        JSON object with ``store_id``, ``from``, ``to``, and ``days`` (list of daily rows).

    Raises:
        HTTP 404: Store id is not present in the dataset.
        HTTP 400: Invalid or partial date range.
    """
    csv_path = current_app.config["RETAIL_CSV_PATH"]
    df = load_retail_csv(csv_path)

    if store_id not in set(df["Store ID"].astype(str).unique()):
        abort(404, description="Unknown store_id")

    from_raw = request.args.get("from")
    to_raw = request.args.get("to")

    if from_raw and to_raw:
        try:
            start = parse_iso_date(from_raw)
            end = parse_iso_date(to_raw)
        except ValueError:
            abort(400, description="Invalid date format; use YYYY-MM-DD")
    elif not from_raw and not to_raw:
        # Anchor defaults on the latest observation for this store (not wall-clock
        # "today") so historical CSVs still return a useful window.
        sub_dates = df.loc[df["Store ID"].astype(str) == store_id, "Date"]
        end = sub_dates.max().date()
        start = end - timedelta(days=6)
    else:
        abort(400, description="Provide both from and to, or neither for default range")

    if start > end:
        abort(400, description="from must be on or before to")

    days_payload = daily_metrics(df, store_id, start, end)
    return jsonify(
        {
            "store_id": store_id,
            "from": start.isoformat(),
            "to": end.isoformat(),
            "days": days_payload,
        }
    )
