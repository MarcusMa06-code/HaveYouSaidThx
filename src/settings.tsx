/**
 * One small combined settings context: language + currency + live FX rates.
 * Both selectors persist to localStorage. Rates are fetched once on load
 * (background, non-blocking) so switching currency is instant; a failed fetch
 * never affects the default SGD experience.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translations, type Lang, type TKey } from "./i18n";
import { loadRates, FALLBACK_RATES, type Currency, type RatesState } from "./currency";

const LANG_KEY = "hyst.lang";
const CURRENCY_KEY = "hyst.currency";

function initLang(): Lang {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === "zh-Hans" || saved === "zh-Hant" || saved === "en" ? saved : "en";
}

function initCurrency(): Currency {
  const saved = localStorage.getItem(CURRENCY_KEY);
  return saved === "USD" || saved === "CNY" || saved === "HKD" || saved === "SGD" ? saved : "SGD";
}

interface Settings {
  lang: Lang;
  setLang: (l: Lang) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  ratesState: RatesState;
  /** Translated string for a key; forwards interpolation args to fn values. */
  t: <K extends TKey>(
    key: K,
    ...args: (typeof translations)["en"][K] extends (...a: infer A) => string ? A : []
  ) => string;
}

const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initLang);
  const [currency, setCurrencyState] = useState<Currency>(initCurrency);
  const [ratesState, setRatesState] = useState<RatesState>({ rates: FALLBACK_RATES });

  useEffect(() => {
    loadRates().then(setRatesState);
  }, []);

  const setLang = (l: Lang) => {
    localStorage.setItem(LANG_KEY, l);
    setLangState(l);
  };
  const setCurrency = (c: Currency) => {
    localStorage.setItem(CURRENCY_KEY, c);
    setCurrencyState(c);
  };

  const t = ((key: TKey, ...args: unknown[]) => {
    const value = translations[lang][key];
    return typeof value === "function" ? (value as (...a: unknown[]) => string)(...args) : value;
  }) as Settings["t"];

  return (
    <SettingsContext.Provider value={{ lang, setLang, currency, setCurrency, ratesState, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
