import { describe, expect, it } from "vitest";
import { calculatePayback } from "./payback";

// Worked example from docs/payback-formula-spec.md section 7:
// Bachelor with Honours, DesignAndEngineering, ISOther, AY2025/2026,
// single-degree, 0 bond years completed.
const baseInputs = {
  cohort: "AY2025/2026" as const,
  category: "DesignAndEngineering" as const,
  feeTier: "ISOther" as const,
  degree: "BachelorHonours" as const,
};

const EPS = 0.01;

describe("calculatePayback — spec section 7 worked example", () => {
  it("matches the worked example at B=0", () => {
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
