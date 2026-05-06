"""
Helpers to load the retail CSV and derive consistent metrics (e.g. revenue).

Keeping CSV parsing in one place avoids duplicating column names and formulas
across metrics and forecast services.
"""

from __future__ import annotations

import pandas as pd


def load_retail_csv(csv_path: str) -> pd.DataFrame:
    """Load retail rows and add a per-line revenue column.

    Revenue is computed as units sold times effective unit price after discount,
    where Discount is treated as a percentage (e.g. 20 means 20% off).

    Args:
        csv_path: Absolute or relative path to retail_store_inventory.csv.

    Returns:
        DataFrame including parsed dates and a ``revenue_line`` column.
    """
    # Read only columns needed for aggregations to reduce memory use.
    usecols = [
        "Date",
        "Store ID",
        "Units Sold",
        "Price",
        "Discount",
    ]
    df = pd.read_csv(csv_path, usecols=usecols, parse_dates=["Date"])
    # Effective revenue per product-day row.
    df["revenue_line"] = (
        df["Units Sold"].astype(float)
        * df["Price"].astype(float)
        * (1.0 - df["Discount"].astype(float) / 100.0)
    )
    return df
