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

  it("both obligations are exactly 0 once the full 6-year bond is served (B=6)", () => {
    const result = calculatePayback({ ...baseInputs, bondYearsCompleted: 6 });
    expect(result.nusAfterProRata).toBe(0);
    expect(result.moeAfterProRata).toBe(0);
    expect(result.total).toBe(0);
  });
});
