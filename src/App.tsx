import { useMemo, useState } from "react";
import type { AdmissionCohort, FeeCategory } from "../data/tuition-fees";
import {
  calculatePayback,
  noBondBaselines,
  type DegreeType,
  type FeeTier,
} from "./calc/payback";
import { MAJOR_GROUPS } from "./calc/majors";
import "./App.css";

const COHORTS: AdmissionCohort[] = ["AY2024/2025", "AY2025/2026", "AY2026/2027"];

const DEGREES: { value: DegreeType; label: string }[] = [
  { value: "Bachelor", label: "Bachelor" },
  { value: "BachelorHonours", label: "Bachelor with Honours" },
  { value: "DoubleDegreeSingleHonours", label: "Double Degree, single Honours" },
  { value: "DoubleDegreeDoubleHonours", label: "Double Degree, double Honours" },
];

const money = (n: number) =>
  n.toLocaleString("en-SG", { style: "currency", currency: "SGD", maximumFractionDigits: 2 });

const moneyShort = (n: number) =>
  n.toLocaleString("en-SG", { style: "currency", currency: "SGD", maximumFractionDigits: 0 });

// ponytail: plain inline SVG for both charts — 7 data points, no zoom/pan/
// tooltip interactivity requested, so a charting library would be pure
// weight. A couple of <line>/<path>/<text> elements is the right amount of
// engineering for this.
// ponytail: 0.05-year steps (~120 points across the 6-year bond) is plenty
// dense for a smooth line at this chart's pixel size — no need to go finer.
const CURVE_STEP = 0.05;
const CURVE_SAMPLES = Math.round(6 / CURVE_STEP);

const CHART_W = 640;
const CHART_H = 340;
const CHART_PAD = { top: 44, right: 16, bottom: 40, left: 100 };
const plotW = CHART_W - CHART_PAD.left - CHART_PAD.right;
const plotH = CHART_H - CHART_PAD.top - CHART_PAD.bottom;

/** Linear interpolation of the bond-year B where `series` crosses `baseline`,
 * for placing a crossing marker. Returns null if no crossing in [0, 6]. */
function findCrossing(series: number[], baseline: number): number | null {
  for (let b = 0; b < series.length - 1; b++) {
    const a = series[b] - baseline;
    const c = series[b + 1] - baseline;
    if (a === 0) return b;
    if ((a > 0 && c < 0) || (a < 0 && c > 0)) {
      return b + a / (a - c);
    }
  }
  return null;
}

interface PaybackChartProps {
  totals: number[]; // index = B, 0..6 (integers only — used for points/crossings)
  curve: number[]; // dense samples across [0, 6] for a smooth line
  curveStep: number; // B increment between consecutive `curve` entries
  baseline1: number;
  baseline2: number;
}

function PaybackChart({ totals, curve, curveStep, baseline1, baseline2 }: PaybackChartProps) {
  const maxY = Math.max(...totals, baseline1, baseline2) * 1.05;
  const x = (b: number) => CHART_PAD.left + (b / 6) * plotW;
  const y = (v: number) => CHART_PAD.top + plotH - (v / maxY) * plotH;

  // ponytail: the underlying formula (nusLiquidatedDamages/moeClawback) is
  // continuous in B — sampling it densely (not just at the 7 integer bond
  // years) gives a genuinely smooth, still-exact curve, not a visual
  // smoothing trick. MOE's pro-rata fully discharges at B=3, a real slope
  // kink — dense sampling shows that correctly instead of a false 7-point
  // straight-line segment.
  const linePath = curve.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i * curveStep)} ${y(v)}`).join(" ");

  const cross1 = findCrossing(totals, baseline1);
  const cross2 = findCrossing(totals, baseline2);

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="chart" role="img"
      aria-label="Total payback amount by bond years completed, with two no-bond reference baselines">
      {/* y-axis gridlines + labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const v = maxY * f;
        return (
          <g key={f}>
            <line x1={CHART_PAD.left} x2={CHART_W - CHART_PAD.right} y1={y(v)} y2={y(v)} className="chart-grid" />
            <text x={CHART_PAD.left - 8} y={y(v)} className="chart-axis-label" textAnchor="end" dominantBaseline="middle">
              {moneyShort(v)}
            </text>
          </g>
        );
      })}

      {/* x-axis labels */}
      {totals.map((_, b) => (
        <text key={b} x={x(b)} y={CHART_H - 6} className="chart-axis-label" textAnchor="middle">
          {b}
        </text>
      ))}

      {/* baseline 2 (no tuition grant at all) — drawn first, further back */}
      <line x1={CHART_PAD.left} x2={CHART_W - CHART_PAD.right} y1={y(baseline2)} y2={y(baseline2)} className="chart-baseline chart-baseline-2" />
      <text x={CHART_W - CHART_PAD.right} y={y(baseline2) - 10} className="chart-baseline-label chart-baseline-label-2" textAnchor="end">
        No Tuition Grant at all: {moneyShort(baseline2)}
      </text>

      {/* baseline 1 (skipped SNT top-up only) */}
      <line x1={CHART_PAD.left} x2={CHART_W - CHART_PAD.right} y1={y(baseline1)} y2={y(baseline1)} className="chart-baseline chart-baseline-1" />
      <text x={CHART_W - CHART_PAD.right} y={y(baseline1) - 10} className="chart-baseline-label chart-baseline-label-1" textAnchor="end">
        Skipped SNT top-up only: {moneyShort(baseline1)}
      </text>

      {/* payback curve */}
      <path d={linePath} className="chart-line" fill="none" />
      {totals.map((v, b) => (
        <circle key={b} cx={x(b)} cy={y(v)} r={3} className="chart-point" />
      ))}

      {/* crossing markers: where the curve drops below each baseline */}
      {cross1 !== null && (
        <g>
          <circle cx={x(cross1)} cy={y(baseline1)} r={4} className="chart-crossing chart-crossing-1" />
          <text x={x(cross1)} y={y(baseline1) + 24} className="chart-crossing-label" textAnchor="middle">
            crosses ~B={cross1.toFixed(1)}
          </text>
        </g>
      )}
      {cross2 !== null && (
        <g>
          <circle cx={x(cross2)} cy={y(baseline2)} r={4} className="chart-crossing chart-crossing-2" />
          <text x={x(cross2)} y={y(baseline2) + 24} className="chart-crossing-label" textAnchor="middle">
            crosses ~B={cross2.toFixed(1)}
          </text>
        </g>
      )}
    </svg>
  );
}

interface MarginalChartProps {
  totals: number[]; // index = B, 0..6
}

/** Bar chart of marginal savings (first difference) with the second
 * difference overlaid as a line, per Task 3. */
function MarginalChart({ totals }: MarginalChartProps) {
  const marginal = totals.slice(0, 6).map((v, b) => v - totals[b + 1]); // index = step B->B+1
  const secondDiff = marginal.map((v, i) => (i === 0 ? 0 : v - marginal[i - 1]));

  const w = CHART_W;
  const h = 260;
  const pad = { top: 40, right: 16, bottom: 40, left: 100 };
  const pw = w - pad.left - pad.right;
  const ph = h - pad.top - pad.bottom;
  const n = marginal.length;
  const bandW = pw / n;
  const maxBar = Math.max(...marginal) * 1.15;

  const barX = (i: number) => pad.left + i * bandW + bandW * 0.2;
  const barW = bandW * 0.6;
  const yBar = (v: number) => pad.top + ph - (v / maxBar) * ph;

  // second-difference line, scaled to the same plot area (own axis, since
  // its magnitude differs from the bars) — mapped so 0 sits mid-height and
  // the largest |value| reaches near the top/bottom.
  const maxAbsDiff = Math.max(...secondDiff.map(Math.abs), 1);
  const yLine = (v: number) => pad.top + ph / 2 - (v / maxAbsDiff) * (ph / 2 - 8);
  const lineX = (i: number) => barX(i) + barW / 2;
  const linePath = secondDiff.map((v, i) => `${i === 0 ? "M" : "L"} ${lineX(i)} ${yLine(v)}`).join(" ");

  const standoutIndex = 2; // B=2 -> B=3 step: MOE's 3-year bond fully discharges here

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img"
      aria-label="Marginal savings per additional bond year served, with the change in marginal savings overlaid">
      <line x1={pad.left} x2={w - pad.right} y1={yBar(0)} y2={yBar(0)} className="chart-grid" />
      {marginal.map((v, i) => (
        <rect
          key={i}
          x={barX(i)}
          y={yBar(v)}
          width={barW}
          height={yBar(0) - yBar(v)}
          className={i === standoutIndex ? "chart-bar chart-bar-standout" : "chart-bar"}
        />
      ))}
      {marginal.map((_, i) => (
        <text key={i} x={lineX(i)} y={h - 6} className="chart-axis-label" textAnchor="middle">
          {i}&rarr;{i + 1}
        </text>
      ))}
      <path d={linePath} className="chart-diff-line" fill="none" />
      {secondDiff.map((v, i) => (
        <circle key={i} cx={lineX(i)} cy={yLine(v)} r={2.5} className="chart-diff-point" />
      ))}
      <text x={barX(standoutIndex) + barW / 2} y={yBar(marginal[standoutIndex]) - 10} className="chart-crossing-label" textAnchor="middle">
        MOE's 3-year bond fully discharges here
      </text>
    </svg>
  );
}

function App() {
  const [cohort, setCohort] = useState<AdmissionCohort>("AY2025/2026");
  const [major, setMajor] = useState(MAJOR_GROUPS[1].majors[3]); // Computer Engineering
  const [feeTier, setFeeTier] = useState<FeeTier>("ISOther");
  const [degree, setDegree] = useState<DegreeType>("BachelorHonours");
  const [bondYears, setBondYears] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const category: FeeCategory = useMemo(() => {
    const group = MAJOR_GROUPS.find((g) => g.majors.includes(major));
    return group ? group.category : MAJOR_GROUPS[0].category;
  }, [major]);

  const result = useMemo(
    () =>
      calculatePayback({
        cohort,
        category,
        feeTier,
        degree,
        bondYearsCompleted: bondYears,
      }),
    [cohort, category, feeTier, degree, bondYears],
  );

  // Full B=0..6 trajectory for the charts, reusing calculatePayback for every
  // point rather than reimplementing the interest/pro-rata math (Task 2).
  const totals = useMemo(
    () =>
      Array.from({ length: 7 }, (_, b) =>
        calculatePayback({ cohort, category, feeTier, degree, bondYearsCompleted: b }).total,
      ),
    [cohort, category, feeTier, degree],
  );

  const baselines = useMemo(
    () => noBondBaselines(cohort, category, feeTier, degree),
    [cohort, category, feeTier, degree],
  );

  // Dense B samples across [0, 6] for a smooth trajectory line — the same
  // exact calculatePayback formula, just evaluated more finely than the 7
  // integer bond-years, since it's continuous in B (not a smoothing trick).
  // Does not affect the bondYears input control, which stays an integer
  // 0-6 stepper.
  const curve = useMemo(
    () =>
      Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) =>
        calculatePayback({ cohort, category, feeTier, degree, bondYearsCompleted: i * CURVE_STEP }).total,
      ),
    [cohort, category, feeTier, degree],
  );

  return (
    <>
      <header className="page-header">
        <h1>Have You Said Thx?</h1>
        <p className="subtitle">
          Estimate what you'd owe NUS and MOE if you broke your S&amp;T
          scholarship bond.
        </p>
      </header>

      <section className="card">
        <div className="field">
          <label htmlFor="cohort">Admission cohort</label>
          <select id="cohort" value={cohort} onChange={(e) => setCohort(e.target.value as AdmissionCohort)}>
            {COHORTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="major">Major / programme</label>
          <select id="major" value={major} onChange={(e) => setMajor(e.target.value)}>
            {MAJOR_GROUPS.map((group) => (
              <optgroup key={group.category} label={group.label}>
                {group.majors.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="feeTier">Nationality tier</label>
          <select id="feeTier" value={feeTier} onChange={(e) => setFeeTier(e.target.value as FeeTier)}>
            <option value="ISAsean">Int'l Student — ASEAN passport</option>
            <option value="ISOther">Int'l Student — other nationality</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="degree">Degree type</label>
          <select id="degree" value={degree} onChange={(e) => setDegree(e.target.value as DegreeType)}>
            {DEGREES.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="bondYears">
            Bond years completed since graduation: <strong>{bondYears}</strong>
          </label>
          <input
            id="bondYears"
            type="range"
            min={0}
            max={6}
            step={1}
            value={bondYears}
            onChange={(e) => setBondYears(Number(e.target.value))}
          />
          <div className="range-ticks">
            {[0, 1, 2, 3, 4, 5, 6].map((y) => (
              <span key={y}>{y}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="result card">
        <p className="result-label">Estimated total payback</p>
        <p className="result-value">{money(result.total)}</p>
        <p className="disclaimer">
          This figure covers tuition, allowances, and the MOE Tuition Grant
          subsidy, each with 10% yearly interest as set out in the
          scholarship and Tuition Grant agreements. It excludes airfare,
          medical/insurance coverage, and other unquantified approved
          expenses, since no fixed amount for these is available — so the
          real amount owed may be somewhat higher. This is an estimate, not
          an official figure from NUS or MOE.
        </p>
      </section>

      <section className="card chart-card">
        <h2>Payback trajectory over the bond</h2>
        <p className="advanced-meta">
          Total payback (NUS + MOE) as you serve more of the 6-year bond, against
          two no-bond reference amounts: what you'd have paid yourself with no
          S&amp;T scholarship at all, at the subsidised and unsubsidised tuition
          rates. Where the curve sits above a line, breaking the bond that year
          is still worse than never having had that benefit; below, it's already
          the cheaper outcome.
        </p>
        <PaybackChart
          totals={totals}
          curve={curve}
          curveStep={CURVE_STEP}
          baseline1={baselines.skippedTopUp}
          baseline2={baselines.noTuitionGrant}
        />
      </section>

      <section className="card chart-card">
        <h2>Marginal savings per additional bond year</h2>
        <p className="advanced-meta">
          Bars: how much less you'd owe for each extra year served (payback(B)
          − payback(B+1)). Line: the change in that marginal saving step to
          step — the jump at 2&rarr;3 is MOE's 3-year bond fully discharging,
          while NUS's separate 6-year bond is still only half served.
        </p>
        <MarginalChart totals={totals} />
      </section>

      <button
        type="button"
        className="toggle-advanced"
        onClick={() => setShowAdvanced((v) => !v)}
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? "Hide" : "Show"} calculation breakdown
      </button>

      {showAdvanced && (
        <section className="card advanced statement">
          <h2>Breakdown</h2>
          <p className="advanced-meta">
            D (disbursement years) = {result.D}, B (bond years completed) = {result.B}
          </p>

          {/* ponytail: two narrow 3-col tables stacked vertically, instead of
              one wide 6-col table, so nothing needs horizontal scroll at any
              viewport width (Task 4.4) — a side-effect of a layout that also
              reads more like two separate ledgers, NUS's and MOE's. */}
          <div className="statement-section">
            <h3>NUS disbursement ledger</h3>
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Disbursed</th>
                  <th>Compounded</th>
                </tr>
              </thead>
              <tbody>
                {result.years.map((y) => (
                  <tr key={y.year}>
                    <td>{y.year}</td>
                    <td>{money(y.nusDisbursement)}</td>
                    <td>{money(y.nusCompounded)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="statement-section">
            <h3>MOE disbursement ledger</h3>
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Disbursed</th>
                  <th>Compounded</th>
                </tr>
              </thead>
              <tbody>
                {result.years.map((y) => (
                  <tr key={y.year}>
                    <td>{y.year}</td>
                    <td>{money(y.moeDisbursement)}</td>
                    <td>{money(y.moeCompounded)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="statement-section statement-summary">
            <h3>Statement summary</h3>
            <dl className="subtotals">
              <dt>NUS Liquidated Damages — before cap</dt>
              <dd>{money(result.nusBeforeCap)}</dd>

              <dt>NUS cap applied (single-degree $262,000 / double-degree $295,000)</dt>
              <dd>{money(result.cap)}</dd>

              <dt>NUS Liquidated Damages — after cap</dt>
              <dd>{money(result.nusAfterCap)}</dd>

              <dt className="subtotal-row">NUS Liquidated Damages — after bond-served pro-rata reduction</dt>
              <dd className="subtotal-row">{money(result.nusAfterProRata)}</dd>

              <dt>MOE clawback — before pro-rata (no cap applies)</dt>
              <dd>{money(result.moeBeforeProRata)}</dd>

              <dt className="subtotal-row">MOE clawback — after bond-served pro-rata reduction</dt>
              <dd className="subtotal-row">{money(result.moeAfterProRata)}</dd>
            </dl>

            <div className="statement-total">
              <span>Total payback</span>
              <span>{money(result.total)}</span>
            </div>
          </div>
        </section>
      )}

      <footer className="page-footer">
        <p>
          Unofficial estimate based on publicly available policy documents and
          the S&amp;T Scholarship / Tuition Grant agreement formulas. Not
          financial or legal advice. See the project's <code>docs/</code>{" "}
          folder for the full methodology and assumptions.
        </p>
      </footer>
    </>
  );
}

export default App;
