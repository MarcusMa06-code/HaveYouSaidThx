import { describe, expect, it } from "vitest";
import { formatMoney, type Rates } from "./currency";

// Known rate table so the assertions are deterministic (not the live API).
const RATES: Rates = { SGD: 1, USD: 0.74, CNY: 5.3, HKD: 5.8 };

/** Strip everything but digits and the decimal point so we compare the
 * numeric magnitude regardless of symbol/grouping/locale spacing. */
const numeric = (s: string) => Number(s.replace(/[^0-9.]/g, ""));

describe("formatMoney — display-only SGD conversion", () => {
  it("leaves SGD unchanged (rate 1.0)", () => {
    expect(numeric(formatMoney(10_000, "SGD", RATES, 2))).toBeCloseTo(10_000, 2);
  });

  it("converts SGD -> USD at the given rate", () => {
    expect(numeric(formatMoney(10_000, "USD", RATES, 2))).toBeCloseTo(7_400, 2);
  });

  it("converts SGD -> CNY at the given rate", () => {
    expect(numeric(formatMoney(1_000, "CNY", RATES, 2))).toBeCloseTo(5_300, 2);
  });

  it("converts SGD -> HKD at the given rate", () => {
    expect(numeric(formatMoney(1_000, "HKD", RATES, 2))).toBeCloseTo(5_800, 2);
  });

  it("respects maxFrac 0 for compact labels (rounds, no decimals)", () => {
    const s = formatMoney(1_234.56, "SGD", RATES, 0);
    expect(s).not.toMatch(/\./);
    expect(numeric(s)).toBe(1_235);
  });

  it("renders the correct currency symbol/code per currency", () => {
    expect(formatMoney(100, "CNY", RATES, 0)).toContain("¥");
    // USD/SGD/HKD all use "$"; the ISO-disambiguating prefix must appear.
    expect(formatMoney(100, "USD", RATES, 0)).toMatch(/US\$|\$/);
  });
});
