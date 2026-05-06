"""
Bundled dashboard payload: recent daily metrics plus forecast and KPI snapshot.
"""

from __future__ import annotations

from datetime import timedelta

import pandas as pd

from app.services.forecast_service import forecast_store_revenue
from app.services.metrics_service import daily_metrics


def build_dashboard(
    df: pd.DataFrame,
    store_id: str,
    days: int = 7,
    forecast_horizon_days: int = 1,
) -> dict:
    """Build a single JSON-ready structure for the store overview page.

    Args:
        df: Output of ``retail_data.load_retail_csv``.
        store_id: Store identifier.
        days: Number of past calendar days to include in ``daily_series`` (>= 1).
        forecast_horizon_days: Forward days for revenue forecast (>= 1).

    Returns:
        Dict with ``store_id``, ``daily_series``, ``forecast``, and ``kpis``.
    """
    # End the window on the latest date available for this store in the CSV.
    mask = df["Store ID"].astype(str) == store_id
    end = df.loc[mask, "Date"].max().date()
    start = end - timedelta(days=days - 1)
    series = daily_metrics(df, store_id, start, end)
    fc = forecast_store_revenue(df, store_id, horizon_days=forecast_horizon_days)

    last_rev = 0.0
    last_units = 0
    last_day: str | None = None
    if series:
        last = series[-1]
        last_rev = float(last["revenue"])
        last_units = int(last["units_sold"])
        last_day = last["date"]

    kpis = {
        "last_day": last_day,
        "last_day_revenue": last_rev,
        "last_day_units_sold": last_units,
        "series_days_returned": len(series),
    }

    return {
        "store_id": store_id,
        "daily_series": series,
        "forecast": fc,
        "kpis": kpis,
    }
