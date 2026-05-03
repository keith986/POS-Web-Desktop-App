"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

/* ── Types ── */
export interface StoreConfig {
  currency:    string;
  timezone:    string;
  tax_rate:    number;
  tax_enabled: boolean;
  tax_name:    string;
  tax_inclusive: boolean;
  store_name:  string;
}

interface StoreContextValue {
  config:         StoreConfig;
  loading:        boolean;
  refresh:        () => void;
  formatCurrency: (n: number) => string;
  formatDate:     (d: string) => string;
  formatDateTime: (d: string) => string;
}

/* ── Defaults — KES + Nairobi ── */
const DEFAULTS: StoreConfig = {
  currency:     "KES",
  timezone:     "Africa/Nairobi",
  tax_rate:     16,
  tax_enabled:  true,
  tax_name:     "VAT",
  tax_inclusive: false,
  store_name:   "POStore",
};

const StoreContext = createContext<StoreContextValue>({
  config:         DEFAULTS,
  loading:        true,
  refresh:        () => {},
  formatCurrency: (n) => `KES ${Number(n ?? 0).toFixed(2)}`,
  formatDate:     (d) => d,
  formatDateTime: (d) => d,
});

/* ── Currency symbol map ── */
const CURRENCY_LOCALE: Record<string, string> = {
  KES: "en-KE",
  USD: "en-US",
  EUR: "de-DE",
  GBP: "en-GB",
  UGX: "en-UG",
  TZS: "sw-TZ",
  NGN: "en-NG",
};

/* ── Provider ── */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [config,  setConfig]  = useState<StoreConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      /* Read admin_id from localStorage — context runs client-side only */
      let admin_id = "";
      try {
        const raw = localStorage.getItem("user");
        admin_id  = raw ? (JSON.parse(raw)?.id ?? "") : "";
      } catch { /* ignore */ }

      const res  = await fetch(`/api/settings${admin_id ? `?admin_id=${admin_id}` : ""}`);
      const data = await res.json();
      if (res.ok) {
        setConfig({
          currency:      data.currency      ?? DEFAULTS.currency,
          timezone:      data.timezone      ?? DEFAULTS.timezone,
          tax_rate:      Number(data.tax_rate ?? DEFAULTS.tax_rate),
          tax_enabled:   !!data.tax_enabled,
          tax_name:      data.tax_name      ?? DEFAULTS.tax_name,
          tax_inclusive: !!data.tax_inclusive,
          store_name:    data.store_name    ?? DEFAULTS.store_name,
        });
      }
    } catch {
      /* Silently fall back to defaults */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  /* ── Formatters derived from config ── */
  const formatCurrency = useCallback((n: number): string => {
    const safe = Number(n ?? 0);
    if (isNaN(safe)) return `${config.currency} 0.00`;
    try {
      const locale = CURRENCY_LOCALE[config.currency] ?? "en-US";
      return new Intl.NumberFormat(locale, {
        style:    "currency",
        currency: config.currency,
      }).format(safe);
    } catch {
      return `${config.currency} ${safe.toFixed(2)}`;
    }
  }, [config.currency]);

  const formatDate = useCallback((d: string): string => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("en-GB", {
        day:      "numeric",
        month:    "short",
        year:     "numeric",
        timeZone: config.timezone,
      });
    } catch { return "—"; }
  }, [config.timezone]);

  const formatDateTime = useCallback((d: string): string => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString("en-GB", {
        day:      "numeric",
        month:    "short",
        year:     "numeric",
        hour:     "2-digit",
        minute:   "2-digit",
        timeZone: config.timezone,
      });
    } catch { return "—"; }
  }, [config.timezone]);

  return (
    <StoreContext.Provider value={{ config, loading, refresh: fetchConfig, formatCurrency, formatDate, formatDateTime }}>
      {children}
    </StoreContext.Provider>
  );
}

/* ── Hook ── */
export function useStore(): StoreContextValue {
  return useContext(StoreContext);
}

/* ── Standalone helper for pages that can't use hooks (server-compatible) ── */
export function makeCurrencyFormatter(currency: string): (n: number) => string {
  const locale = CURRENCY_LOCALE[currency] ?? "en-US";
  return (n: number) => {
    const safe = Number(n ?? 0);
    if (isNaN(safe)) return `${currency} 0.00`;
    try {
      return new Intl.NumberFormat(locale, { style: "currency", currency }).format(safe);
    } catch {
      return `${currency} ${safe.toFixed(2)}`;
    }
  };
}