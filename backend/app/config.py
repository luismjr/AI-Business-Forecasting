"""
Application configuration defaults.

Environment variables override defaults so deployments can point at different
data files without code changes.
"""

import os
from pathlib import Path


class Config:
    """Default Flask configuration object loaded via ``app.config.from_object``.

    Attributes:
        RETAIL_CSV_PATH: Absolute path to the retail inventory CSV used by the API.
    """

    RETAIL_CSV_PATH = os.environ.get(
        "RETAIL_CSV_PATH",
        str(
            Path(__file__).resolve().parents[2]
            / "data"
            / "retail_store_inventory.csv"
        ),
    )
