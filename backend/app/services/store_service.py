"""
Store listing from the retail dataset (distinct store identifiers).
"""

from __future__ import annotations

import pandas as pd


def list_stores(csv_path: str) -> list[dict[str, str]]:
    """Return distinct store identifiers as a list of objects for JSON responses.

    Args:
        csv_path: Path to the retail CSV on disk.

    Returns:
        A list of dicts, each with a single key ``id`` and the store code as value.
    """
    # Only load the store column to keep the read small.
    df = pd.read_csv(csv_path, usecols=["Store ID"])
    ids = sorted(df["Store ID"].astype(str).unique().tolist())
    return [{"id": sid} for sid in ids]
