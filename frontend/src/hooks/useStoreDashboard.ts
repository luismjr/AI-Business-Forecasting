import { useCallback, useEffect, useState } from "react";
import {
  fetchLastSevenDayMetrics,
  fetchRevenueForecast,
  fetchStores,
} from "@/api/client";
import type { ForecastResponse, MetricsResponse, Store } from "@/api/types";

export function useStoreDashboard() {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [storesReady, setStoresReady] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const list = await fetchStores();
        if (cancelled) return;
        setStores(list);
        setStoreId((prev) => {
          if (prev && list.some((s) => s.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load stores.");
          setStores([]);
          setStoreId(null);
        }
      } finally {
        if (!cancelled) setStoresReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMetricsAndForecast = useCallback(async (id: string) => {
    setDataLoading(true);
    setMetrics(null);
    setForecast(null);
    setError(null);
    try {
      const [m, f] = await Promise.all([
        fetchLastSevenDayMetrics(id),
        fetchRevenueForecast(id, "1d"),
      ]);
      setMetrics(m);
      setForecast(f);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to load dashboard data.",
      );
      setMetrics(null);
      setForecast(null);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!storeId) return;
    void loadMetricsAndForecast(storeId);
  }, [storeId, loadMetricsAndForecast]);

  const loading =
    !storesReady || (Boolean(storeId) && dataLoading && metrics === null);

  return {
    stores,
    storeId,
    setStoreId,
    metrics,
    forecast,
    loading,
    error,
    refreshForStore: loadMetricsAndForecast,
  };
}
