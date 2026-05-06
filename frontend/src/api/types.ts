/** API response types aligned with the Flask JSON payloads. */

// ── What-If ───────────────────────────────────────────────────────────────────
export type WhatIfOptions = {
  store_ids: string[];
  categories: string[];
  weather_conditions: string[];
  seasonalities: string[];
  avg_price: number;
  avg_discount: number;
  avg_competitor_pricing: number;
};

export type WhatIfRequest = {
  store_id: string;
  category: string;
  weather_condition: string;
  seasonality: string;
  holiday_promotion: number;
  price: number;
  discount: number;
  competitor_pricing: number;
};

export type WhatIfSide = {
  total_units_sold: number;
  total_revenue: number;
  avg_price: number;
  avg_discount: number;
  avg_competitor_pricing: number;
  weather: string;
  seasonality: string;
  holiday: number;
};

export type WhatIfCategoryRow = {
  category: string;
  baseline_units: number;
  scenario_units: number;
  baseline_revenue: number;
  scenario_revenue: number;
  delta: number;
  delta_pct: number;
  revenue_delta: number;
  revenue_delta_pct: number;
};

export type WhatIfResponse = {
  baseline: WhatIfSide;
  scenario: WhatIfSide;
  delta: {
    units_sold: number;
    units_sold_pct: number;
    revenue: number;
    revenue_pct: number;
  };
  category_breakdown: WhatIfCategoryRow[];
  meta: {
    store_id: string;
    category: string;
    combinations_analyzed: number;
  };
};

export type Store = {
  id: string;
};

export type DailyRow = {
  date: string;
  revenue: number;
  units_sold: number;
};

export type MetricsResponse = {
  store_id: string;
  from: string;
  to: string;
  days: DailyRow[];
};

export type ForecastResponse = {
  store_id: string;
  horizon_days: number;
  predictions: { date: string; revenue: number }[];
  model: string;
  model_version: string;
  as_of_date: string | null;
  /** Daily samples used to fit Ridge; 0 or omitted when using fallback. */
  training_rows?: number;
};
