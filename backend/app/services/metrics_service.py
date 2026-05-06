"""
Daily and roll-up metrics for a single store from the retail dataset.
"""

from __future__ import annotations

from datetime import date, datetime

import pandas as pd


def daily_metrics(
    df: pd.DataFrame,
    store_id: str,
    start: date,
    end: date,
) -> list[dict]:
    """Aggregate per-day revenue and units sold for a store in a date range.

    Args:
        df: Output of ``retail_data.load_retail_csv`` (must include ``revenue_line``).
        store_id: Store identifier (e.g. ``S001``).
        start: Inclusive start calendar date.
        end: Inclusive end calendar date.

    Returns:
        List of dicts, one per calendar day with data, sorted by date ascending.
        Each dict has ``date`` (ISO ``YYYY-MM-DD``), ``revenue``, ``units_sold``.
    """
    mask = (df["Store ID"].astype(str) == store_id) & (
        df["Date"].dt.normalize() >= pd.Timestamp(start)
    ) & (df["Date"].dt.normalize() <= pd.Timestamp(end))
    sub = df.loc[mask].copy()
    if sub.empty:
        return []
    # One row per product per day; sum to store-day totals.
    grouped = sub.groupby(sub["Date"].dt.normalize(), as_index=False).agg(
        revenue=("revenue_line", "sum"),
        units_sold=("Units Sold", "sum"),
    )
    grouped["date"] = grouped["Date"].dt.strftime("%Y-%m-%d")
    out: list[dict] = []
    for _, row in grouped.iterrows():
        out.append(
            {
                "date": row["date"],
                "revenue": round(float(row["revenue"]), 2),
                "units_sold": int(row["units_sold"]),
            }
        )
    return sorted(out, key=lambda x: x["date"])


def parse_iso_date(value: str) -> date:
    """Parse an ISO date string ``YYYY-MM-DD`` into a ``date``.

    Args:
        value: Date string from the query string.

    Returns:
        A ``date`` instance.

    Raises:
        ValueError: If the string is not a valid ISO date.
    """
    return datetime.strptime(value.strip(), "%Y-%m-%d").date()
