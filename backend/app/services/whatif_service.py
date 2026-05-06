"""
What-if analysis service.

Trains a Random Forest on the full retail CSV to predict Units Sold,
then exposes run_what_if() and get_options() for the API layer.
The model is trained lazily on the first request and cached in memory.
"""

from __future__ import annotations

import threading
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder

# ── Schema ────────────────────────────────────────────────────────────────────
CAT_COLS = ["Store ID", "Category", "Region", "Weather Condition", "Seasonality"]
NUM_COLS = ["Price", "Discount", "Competitor Pricing", "Inventory Level", "Holiday/Promotion"]
TARGET = "Units Sold"
FEATURE_COLS = [c + "_enc" for c in CAT_COLS] + NUM_COLS
ALL_COLS = CAT_COLS + NUM_COLS + [TARGET]

# ── Lazy singleton ─────────────────────────────────────────────────────────────
_lock = threading.Lock()
_df: pd.DataFrame | None = None
_model: RandomForestRegressor | None = None
_encoders: dict[str, LabelEncoder] | None = None


def _train(csv_path: str) -> tuple:
    print("What-if: training Random Forest — takes ~20 s on first request…")
    df = pd.read_csv(csv_path, usecols=ALL_COLS)

    encoders: dict[str, LabelEncoder] = {}
    df_enc = df.copy()
    for col in CAT_COLS:
        le = LabelEncoder()
        df_enc[col + "_enc"] = le.fit_transform(df[col].astype(str))
        encoders[col] = le

    rf = RandomForestRegressor(
        n_estimators=100, min_samples_leaf=5, random_state=42, n_jobs=-1
    )
    rf.fit(df_enc[FEATURE_COLS].values, df_enc[TARGET].values)
    print("What-if: model ready.")
    return df, rf, encoders


def _get(csv_path: str) -> tuple:
    global _df, _model, _encoders
    if _model is None:
        with _lock:
            if _model is None:
                _df, _model, _encoders = _train(csv_path)
    return _df, _model, _encoders


def _encode(rows: list[dict], encoders: dict) -> list[list[float]]:
    result = []
    for row in rows:
        vec: list[float] = []
        for col in CAT_COLS:
            le = encoders[col]
            val = str(row.get(col, ""))
            vec.append(
                int(le.transform([val])[0])
                if val in le.classes_
                else int(le.transform([le.classes_[0]])[0])
            )
        for col in NUM_COLS:
            vec.append(float(row.get(col, 0)))
        result.append(vec)
    return result


# ── Public API ─────────────────────────────────────────────────────────────────

def get_options(csv_path: str) -> dict[str, Any]:
    df, _, _ = _get(csv_path)
    return {
        "store_ids": ["All"] + sorted(df["Store ID"].unique().tolist()),
        "categories": ["All"] + sorted(df["Category"].unique().tolist()),
        "weather_conditions": sorted(df["Weather Condition"].unique().tolist()),
        "seasonalities": sorted(df["Seasonality"].unique().tolist()),
        "avg_price": round(float(df["Price"].mean()), 2),
        "avg_discount": round(float(df["Discount"].mean()), 1),
        "avg_competitor_pricing": round(float(df["Competitor Pricing"].mean()), 2),
    }


def run_what_if(csv_path: str, params: dict) -> dict:
    df, model, encoders = _get(csv_path)

    store_id    = params.get("store_id", "All")
    category    = params.get("category", "All")
    weather     = params["weather_condition"]
    seasonality = params["seasonality"]
    holiday     = int(params.get("holiday_promotion", 0))
    price       = float(params["price"])
    discount    = float(params["discount"])
    comp_price  = float(params["competitor_pricing"])

    # Historical context for baseline
    mask = pd.Series([True] * len(df), index=df.index)
    if store_id != "All":
        mask &= df["Store ID"] == store_id
    if category != "All":
        mask &= df["Category"] == category
    hist = df[mask]

    if hist.empty:
        raise ValueError("No historical data for the selected filters.")

    base = {
        "Weather Condition": hist["Weather Condition"].mode()[0],
        "Seasonality": hist["Seasonality"].mode()[0],
        "Price": float(hist["Price"].mean()),
        "Discount": float(hist["Discount"].mean()),
        "Competitor Pricing": float(hist["Competitor Pricing"].mean()),
        "Holiday/Promotion": int(round(hist["Holiday/Promotion"].mean())),
    }
    scen = {
        "Weather Condition": weather,
        "Seasonality": seasonality,
        "Price": price,
        "Discount": discount,
        "Competitor Pricing": comp_price,
        "Holiday/Promotion": holiday,
    }

    stores_list = df["Store ID"].unique() if store_id == "All" else [store_id]
    cats_list   = df["Category"].unique() if category == "All" else [category]

    base_rows: list[dict] = []
    scen_rows: list[dict] = []
    combos: list[tuple[str, str]] = []

    for s in stores_list:
        for c in cats_list:
            sub = df[(df["Store ID"] == s) & (df["Category"] == c)]
            if sub.empty:
                continue
            common = {
                "Store ID": s,
                "Category": c,
                "Region": sub["Region"].mode()[0],
                "Inventory Level": float(sub["Inventory Level"].mean()),
            }
            base_rows.append({**common, **base})
            scen_rows.append({**common, **scen})
            combos.append((s, c))

    if not combos:
        raise ValueError("No store/category combinations found.")

    b_preds = np.array(model.predict(_encode(base_rows, encoders)))
    s_preds = np.array(model.predict(_encode(scen_rows, encoders)))

    total_b = float(np.sum(b_preds))
    total_s = float(np.sum(s_preds))
    rev_b   = total_b * base["Price"]
    rev_s   = total_s * price

    units_delta   = total_s - total_b
    revenue_delta = rev_s - rev_b
    units_pct     = (units_delta / total_b * 100) if total_b else 0
    revenue_pct   = (revenue_delta / rev_b * 100) if rev_b else 0

    cat_breakdown = []
    for c in sorted({cat for _, cat in combos}):
        idx  = [i for i, (_, cat) in enumerate(combos) if cat == c]
        cb   = float(np.sum(b_preds[idx]))
        cs   = float(np.sum(s_preds[idx]))
        rev_cb = cb * base["Price"]
        rev_cs = cs * price
        cat_breakdown.append({
            "category": c,
            "baseline_units":  round(cb, 1),
            "scenario_units":  round(cs, 1),
            "baseline_revenue": round(rev_cb, 2),
            "scenario_revenue": round(rev_cs, 2),
            "delta":           round(cs - cb, 1),
            "delta_pct":       round((cs - cb) / cb * 100, 1) if cb else 0,
            "revenue_delta":   round(rev_cs - rev_cb, 2),
            "revenue_delta_pct": round((rev_cs - rev_cb) / rev_cb * 100, 1) if rev_cb else 0,
        })

    return {
        "baseline": {
            "total_units_sold": round(total_b, 1),
            "total_revenue":    round(rev_b, 2),
            "avg_price":        round(base["Price"], 2),
            "avg_discount":     round(base["Discount"], 1),
            "avg_competitor_pricing": round(base["Competitor Pricing"], 2),
            "weather":    base["Weather Condition"],
            "seasonality": base["Seasonality"],
            "holiday":    base["Holiday/Promotion"],
        },
        "scenario": {
            "total_units_sold": round(total_s, 1),
            "total_revenue":    round(rev_s, 2),
            "avg_price":        price,
            "avg_discount":     discount,
            "avg_competitor_pricing": comp_price,
            "weather":    weather,
            "seasonality": seasonality,
            "holiday":    holiday,
        },
        "delta": {
            "units_sold":     round(units_delta, 1),
            "units_sold_pct": round(units_pct, 1),
            "revenue":        round(revenue_delta, 2),
            "revenue_pct":    round(revenue_pct, 1),
        },
        "category_breakdown": cat_breakdown,
        "meta": {
            "store_id": store_id,
            "category": category,
            "combinations_analyzed": len(combos),
        },
    }
