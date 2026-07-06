import { describe, expect, it } from "vitest";
import { calculatePayback } from "./payback";

// Worked example from docs/payback-formula-spec.md section 7:
// Bachelor with Honours, DesignAndEngineering, ISOther (the only rate this
// calculator computes), AY2025/2026, single-degree, 0 bond years completed,
// full 8-semester nominal duration.
const baseInputs = {
  cohort: "AY2025/2026" as const,
  category: "DesignAndEngineering" as const,
  degree: "BachelorHonours" as const,
  semestersCompleted: 8,
};

const EPS = 0.01;

describe("calculatePayback — spec section 7 worked example", () => {
  it("matches the worked example at B=0, S=8 (full nominal BachelorHonours)", () => {
    const result = calculatePayback({ ...baseInputs, bondYearsCompleted: 0 });
    expect(result.nusAfterProRata).toBeCloseTo(148_359.98, 2);
    expect(result.moeAfterProRata).toBeCloseTo(89_107.2, 2);
    expect(result.total).toBeCloseTo(237_467.18, 2);
    expect(Math.abs(result.total - 237_467.18)).toBeLessThan(EPS * 100);
  });

  // Intermediate bond-year check: interest freezes at graduation (confirmed
  // via direct NUS/MOE correspondence — see docs/payback-formula-spec.md
  // section 2), so B only affects the linear pro-rata reduction, not the
  // compounding exponent. A test that only checked B=0 and B=6 would NOT
  // have caught a regression where B was mistakenly added back into the
  // compounding exponent, since B=0 and B=6 happen to produce the same
  // result either way — this assertion at B=3 closes that gap.
  it("matches the worked example at B=3 (MOE bond fully discharged)", () => {
    const result = calculatePayback({ ...baseInputs, bondYearsCompleted: 3 });
    expect(result.nusAfterProRata).toBeCloseTo(74_179.99, 2);
    expect(result.moeAfterProRata).toBe(0);
    expect(result.total).toBeCloseTo(74_179.99, 2);
  });

  it("both obligations are exactly 0 once the full 6-year bond is served (B=6)", () => {
    const result = calculatePayback({ ...baseInputs, bondYearsCompleted: 6 });
    expect(result.nusAfterProRata).toBe(0);
    expect(result.moeAfterProRata).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe("calculatePayback — semester-granularity early graduation", () => {
  it("S=7 (graduated one semester early): halves the final disbursement year", () => {
    const result = calculatePayback({ ...baseInputs, semestersCompleted: 7, bondYearsCompleted: 0 });
    expect(result.D).toBe(4);
    expect(result.nusAfterProRata).toBeCloseTo(132_655.98, 2);
    expect(result.moeAfterProRata).toBeCloseTo(79_507.2, 2);
    expect(result.total).toBeCloseTo(212_163.18, 2);
  });

  it("S=6 (graduated one full year early): no partial semester, D=3", () => {
    const result = calculatePayback({ ...baseInputs, semestersCompleted: 6, bondYearsCompleted: 0 });
    expect(result.D).toBe(3);
    expect(result.nusAfterProRata).toBeCloseTo(106_319.98, 2);
    expect(result.moeAfterProRata).toBeCloseTo(63_552.0, 2);
    expect(result.total).toBeCloseTo(169_871.98, 2);
  });

  it("S=9, DoubleDegreeSingleHonours (full nominal 4.5-year programme, computed exactly)", () => {
    const result = calculatePayback({
      cohort: "AY2025/2026",
      category: "DesignAndEngineering",
      degree: "DoubleDegreeSingleHonours",
      semestersCompleted: 9,
      bondYearsCompleted: 0,
    });
    expect(result.D).toBe(5);
    expect(result.nusAfterProRata).toBeCloseTo(178_899.98, 2);
    expect(result.moeAfterProRata).toBeCloseTo(107_617.92, 2);
    expect(result.total).toBeCloseTo(286_517.9, 2);
  });
});

describe("calculatePayback — Advanced toggle: exact bond dates", () => {
  // 2027-01-15 -> 2029-01-15: a whole 2-calendar-year gap. Hand-computed
  // (Gregorian calendar, 2028 is a leap year and falls inside this window):
  // daysServed = 731 (365 + 366, since 2028 is a leap year), totalBondDays
  // (bond start + 6 years, 2027-01-15..2033-01-15) = 2192 (includes both
  // 2028 and 2032 leap days). monthsServed = 24 exactly (same day-of-month,
  // no partial-month adjustment).
  it("exact-dates path for a whole 2-year gap: hand-computed day/month counts", () => {
    const dateResult = calculatePayback({
      ...baseInputs,
      bondYearsCompleted: 0, // ignored — exactBondDates takes over
      exactBondDates: {
        bondStartDate: new Date(2027, 0, 15),
        asOfDate: new Date(2029, 0, 15),
      },
    });

    expect(dateResult.exactDateBreakdown?.daysServed).toBe(731);
    expect(dateResult.exactDateBreakdown?.totalBondDays).toBe(2192);
    expect(dateResult.exactDateBreakdown?.monthsServed).toBe(24);
    expect(dateResult.exactDateBreakdown?.totalBondMonths).toBe(36);

    // MOE side: months served / total (24/36) is EXACTLY 2/3, matching the
    // integer slider's B=2 ratio precisely — the two entry points must agree.
    const sliderResult = calculatePayback({ ...baseInputs, bondYearsCompleted: 2 });
    expect(dateResult.moeAfterProRata).toBeCloseTo(sliderResult.moeAfterProRata, 2);

    // NUS side: 731/2192 is close to but not exactly 2/6 (leap-year skew is
    // real and expected — the whole point of using actual calendar dates
    // instead of a 365.25 approximation), so it should be near, not equal to,
    // the slider's B=2 NUS figure.
    expect(dateResult.nusAfterProRata).toBeCloseTo(sliderResult.nusAfterProRata, -3);
  });

  it("falls back to the integer slider when Advanced is on but bondStartDate is unset", () => {
    const result = calculatePayback({
      ...baseInputs,
      bondYearsCompleted: 3,
      exactBondDates: undefined,
    });
    const expected = calculatePayback({ ...baseInputs, bondYearsCompleted: 3 });
    expect(result.total).toBeCloseTo(expected.total, 2);
    expect(result.exactDateBreakdown).toBeUndefined();
  });

  // Bond start 2030-01-01, as-of 2031-05-01: hand-computed as 16 completed
  // months (Jan->May across a year boundary = 12 + 4 = 16, same day-of-month
  // so no partial-month adjustment) and 485 days served (2030 is not a leap
  // year: Jan 31 + rest of the days through May 1, 2031 — verified below via
  // the same millisecond-difference definition the spec itself defines,
  // independent of the implementation's own daysBetween/monthsBetween).
  it("hand-computed: partial-year day/month gap produces the documented ratios", () => {
    const bondStartDate = new Date(2030, 0, 1);
    const asOfDate = new Date(2031, 4, 1);
    const expectedDays = Math.floor((asOfDate.getTime() - bondStartDate.getTime()) / 86_400_000);
    const bondEndDate = new Date(2036, 0, 1);
    const expectedTotalDays = Math.floor((bondEndDate.getTime() - bondStartDate.getTime()) / 86_400_000);

    const result = calculatePayback({
      ...baseInputs,
      bondYearsCompleted: 0,
      exactBondDates: { bondStartDate, asOfDate },
    });

    expect(expectedDays).toBe(485);
    expect(result.exactDateBreakdown?.daysServed).toBe(485);
    expect(result.exactDateBreakdown?.totalBondDays).toBe(expectedTotalDays);
    expect(result.exactDateBreakdown?.monthsServed).toBe(16);
    expect(result.exactDateBreakdown?.totalBondMonths).toBe(36);
    expect(result.nusAfterProRata).toBeCloseTo(
      result.nusAfterCap * (1 - Math.min(expectedDays, expectedTotalDays) / expectedTotalDays),
      2,
    );
    expect(result.moeAfterProRata).toBeCloseTo(result.moeBeforeProRata * (1 - 16 / 36), 2);
  });
});
