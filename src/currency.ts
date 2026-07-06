/**
 * Display-only currency conversion. The calculation engine (calc/payback.ts)
 * stays entirely in SGD — this only converts figures at render time.
 *
 * Live rates come from frankfurter.app (free, no key, CORS-ok), cached in
 * localStorage for ~12h. On fetch failure we fall back to a hardcoded
 * approximate table and flag it so the user knows the figure isn't live.
 * SGD (rate 1.0) always works with no fetch.
 */

export type Currency = "SGD" | "USD" | "CNY" | "HKD";

export const CURRENCIES: Currency[] = ["SGD", "USD", "CNY", "HKD"];

/** Rates are SGD -> currency multipliers. SGD is always exactly 1. */
export type Rates = Record<Currency, number>;

// ponytail: approximate fallback rates. Only used when the live fetch fails.
// Sanity-check these against real SGD rates periodically — they will drift.
export const FALLBACK_RATES: Rates = {
  SGD: 1,
  USD: 0.74,
  CNY: 5.3,
  HKD: 5.8,
};

/** Locale + code shown alongside the "$" so USD/HKD/SGD (all "$") aren't
 * ambiguous. Intl already prints "US$" / "HK$" via currencyDisplay:"narrowSymbol"
 * fallback, but we force a clear prefix ourselves for consistency. */
const LOCALE: Record<Currency, string> = {
  SGD: "en-SG",
  USD: "en-US",
  CNY: "zh-CN",
  HKD: "en-HK",
};

/** Convert an SGD amount and format it in the target currency. `maxFrac` 0 for
 * the compact chart labels, 2 for full figures. */
export function formatMoney(
  sgdAmount: number,
  currency: Currency,
  rates: Rates,
  maxFrac = 2,
): string {
  const converted = sgdAmount * (rates[currency] ?? 1);
  return converted.toLocaleString(LOCALE[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: maxFrac,
  });
}

const CACHE_KEY = "hyst.fxRates";
const MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12h

export interface RatesState {
  rates: Rates;
  /** ISO date string of the rate quote when live; undefined => fallback. */
  date?: string;
}

interface Cached {
  rates: Rates;
  date: string;
  fetchedAt: number;
}

/** Load rates: fresh cache -> live fetch -> stale cache -> fallback. Never
 * throws; SGD always resolves. */
export async function loadRates(): Promise<RatesState> {
  const cached = readCache();
  if (cached && Date.now() - cached.fetchedAt < MAX_AGE_MS) {
    return { rates: cached.rates, date: cached.date };
  }

  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?base=SGD&symbols=USD,CNY,HKD",
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { date: string; rates: Record<string, number> };
    const rates: Rates = {
      SGD: 1,
      USD: json.rates.USD,
      CNY: json.rates.CNY,
      HKD: json.rates.HKD,
    };
    // Guard against a malformed payload leaving a NaN in the table.
    if (CURRENCIES.some((c) => typeof rates[c] !== "number" || Number.isNaN(rates[c]))) {
      throw new Error("malformed rates payload");
    }
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ rates, date: json.date, fetchedAt: Date.now() } satisfies Cached),
    );
    return { rates, date: json.date };
  } catch {
    // Prefer a stale cache over the hardcoded table if we have one.
    if (cached) return { rates: cached.rates, date: cached.date };
    return { rates: FALLBACK_RATES };
  }
}

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed?.rates || typeof parsed.fetchedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}
