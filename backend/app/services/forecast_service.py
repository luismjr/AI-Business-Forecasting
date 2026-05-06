"""
Store revenue forecasts from daily totals.

Primary model: sklearn Ridge regression on lag features (yesterday, week-ago,
7-day trailing mean, day-of-week). Falls back to a simple rolling mean when
history is too short or training fails.
"""

from __future__ import annotations

from datetime import date, timedelta

import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

MODEL_VERSION_RIDGE = "ridge_lags_v2"
MODEL_VERSION_FALLBACK = "rolling_mean_v1"


def _store_daily_series(
    df: pd.DataFrame,
    store_id: str,
    history_days: int,
) -> pd.Series | None:
    """Return continuous calendar daily revenue for one store (missing days = 0)."""
    mask = df["Store ID"].astype(str) == store_id
    sub = df.loc[mask].copy()
    if sub.empty:
        return None

    last_ts = sub["Date"].max()
    start_hist = last_ts - pd.Timedelta(days=history_days)
    sub = sub.loc[sub["Date"] >= start_hist]
    daily = sub.groupby(sub["Date"].dt.normalize(), as_index=False)["revenue_line"].sum()
    daily = daily.rename(columns={"revenue_line": "revenue"})
    if daily.empty:
        return None

    daily = daily.sort_values("Date")
    idx = pd.date_range(daily["Date"].min(), daily["Date"].max(), freq="D")
    s = (
        daily.set_index(pd.to_datetime(daily["Date"]).dt.normalize())["revenue"]
        .astype(float)
        .reindex(idx.normalize(), fill_value=0.0)
    )
    s.index = pd.DatetimeIndex(s.index).normalize()
    return s


def _build_training_matrix(s: pd.Series) -> tuple[np.ndarray, np.ndarray] | None:
    """Stack supervised examples: predict revenue on day t from pre-t features."""
    lag_1 = s.shift(1)
    lag_7 = s.shift(7)
    roll_7 = s.shift(1).rolling(window=7, min_periods=7).mean()
    dow = pd.Series(s.index.dayofweek, index=s.index, dtype=float)

    frame = pd.DataFrame(
        {
            "y": s,
            "lag_1": lag_1,
            "lag_7": lag_7,
            "roll_7": roll_7,
            "dow": dow,
        }
    )
    frame = frame.dropna()
    if len(frame) < 21:
        return None

    X = frame[["lag_1", "lag_7", "roll_7", "dow"]].to_numpy(dtype=float)
    y = frame["y"].to_numpy(dtype=float)
    return X, y


def _features_for_next_day(series: pd.Series, target: pd.Timestamp) -> np.ndarray:
    """Feature vector to predict revenue on ``target`` using known history through target - 1 day."""
    t = pd.Timestamp(target).normalize()
    one = pd.Timedelta(days=1)
    seven = pd.Timedelta(days=7)
    lag_1 = float(series.get(t - one, 0.0))
    lag_7 = float(series.get(t - seven, 0.0))
    start_w = t - seven
    end_w = t - one
    window = series.loc[start_w:end_w]
    roll_7 = float(window.mean()) if len(window) > 0 else 0.0
    dow = float(t.dayofweek)
    return np.array([[lag_1, lag_7, roll_7, dow]], dtype=float)


def _rolling_mean_baseline(s: pd.Series, window_days: int) -> float:
    vals = s.astype(float).tolist()
    win = vals[-window_days:] if len(vals) >= window_days else vals
    return float(sum(win) / len(win)) if win else 0.0


def forecast_store_revenue(
    df: pd.DataFrame,
    store_id: str,
    horizon_days: int,
    history_days: int = 120,
    window_days: int = 7,
) -> dict:
    """Predict total store revenue for upcoming calendar days.

    Trains a Ridge model on lag features when enough history exists; otherwise
    uses the previous rolling-mean baseline.

    Args:
        df: Output of ``retail_data.load_retail_csv``.
        store_id: Store identifier.
        horizon_days: Number of future days to predict (>= 1).
        history_days: Days of history used to fit (after building daily series).
        window_days: Rolling window for the fallback mean.

    Returns:
        Dict with ``predictions``, ``model``, ``model_version``, ``as_of_date``,
        and optional ``training_rows``.
    """
    s = _store_daily_series(df, store_id, history_days)
    if s is None or len(s) == 0:
        return {
            "predictions": [],
            "model": "none",
            "model_version": MODEL_VERSION_FALLBACK,
            "as_of_date": None,
            "training_rows": 0,
        }

    last_observed: date = s.index.max().date()
    train_result = _build_training_matrix(s)
    model_kind = "ridge_regression"
    model_version = MODEL_VERSION_RIDGE
    training_rows = 0
    pipe: Pipeline | None = None

    if train_result is not None:
        X_train, y_train = train_result
        training_rows = len(y_train)
        pipe = Pipeline(
            [
                ("scaler", StandardScaler()),
                ("ridge", Ridge(alpha=5.0, random_state=42)),
            ]
        )
        pipe.fit(X_train, y_train)
    else:
        model_kind = "rolling_mean"
        model_version = MODEL_VERSION_FALLBACK

    predictions: list[dict] = []
    extended = s.copy()

    for h in range(horizon_days):
        target_ts = pd.Timestamp(last_observed + timedelta(days=h + 1))

        if pipe is not None:
            X_next = _features_for_next_day(extended, target_ts)
            pred = float(pipe.predict(X_next)[0])
            pred = max(pred, 0.0)
        else:
            pred = _rolling_mean_baseline(extended, window_days)

        predictions.append(
            {"date": target_ts.date().isoformat(), "revenue": round(pred, 2)}
        )
        extended = extended.copy()
        extended.loc[target_ts.normalize()] = pred

    return {
        "predictions": predictions,
        "model": model_kind,
        "model_version": model_version,
        "as_of_date": last_observed.isoformat(),
        "training_rows": training_rows,
    }
