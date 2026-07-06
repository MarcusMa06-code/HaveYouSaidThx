import { useMemo, useState } from "react";
import type { AdmissionCohort, FeeCategory } from "../data/tuition-fees";
import { calculatePayback, nominalSemesters } from "./calc/payback";
import { MAJOR_GROUPS } from "./calc/majors";
import "./App.css";

const COHORTS: AdmissionCohort[] = ["AY2024/2025", "AY2025/2026", "AY2026/2027"];

// ponytail: degree is hardcoded to BachelorHonours — the major dropdown only
// offers single-major programmes, so there's no way for a user to indicate a
// Double Degree Programme (that needs a second-major picker, which doesn't
// exist yet). Revisit once that picker is built; DegreeType/payback.ts keep
// the DoubleDegree* cases fully implemented for that future work.
const DEGREE = "BachelorHonours";

const money = (n: number) =>
  n.toLocaleString("en-SG", { style: "currency", currency: "SGD", maximumFractionDigits: 2 });

const moneyShort = (n: number) =>
  n.toLocaleString("en-SG", { style: "currency", currency: "SGD", maximumFractionDigits: 0 });

// ponytail: plain inline SVG for the marginal-savings chart — 6 data points,
// no zoom/pan/tooltip interactivity requested, so a charting library would
// be pure weight. A couple of <rect>/<text> elements is the right amount of
// engineering for this.
const CHART_W = 640;

interface MarginalChartProps {
  totals: number[]; // index = B, 0..6
}

/** Bar chart of marginal savings (first difference), styled as the two-tier
 * step function it now actually is: interest freezes at graduation (spec
 * section 2), so payback(B) is a frozen total times a linear pro-rata
 * factor, and the marginal saving per extra bond year is CONSTANT while
 * MOE's 3-year bond is still active, then drops to a lower constant once
 * MOE's bond is fully discharged. Two distinct colors/shades mark the two
 * tiers directly on the bars — the step is visually obvious without a
 * caption spelling it out. */
function MarginalChart({ totals }: MarginalChartProps) {
  const marginal = totals.slice(0, 6).map((v, b) => v - totals[b + 1]); // index = step B->B+1
  const transitionIndex = 2; // B=2 -> B=3 step: MOE's bond fully discharges here

  const w = CHART_W;
  const h = 260;
  // ponytail: right padding is much smaller than left (100, reserved for the
  // y-axis label column) since nothing sits to the right of the last bar —
  // just enough breathing room so the last bar's value label doesn't clip.
  const pad = { top: 44, right: 4, bottom: 40, left: 100 };
  const pw = w - pad.left - pad.right;
  const ph = h - pad.top - pad.bottom;
  const n = marginal.length;
  const bandW = pw / n;
  const maxBar = Math.max(...marginal) * 1.15;

  const barX = (i: number) => pad.left + i * bandW + bandW * 0.2;
  const barW = bandW * 0.6;
  const yBar = (v: number) => pad.top + ph - (v / maxBar) * ph;
  const labelX = (i: number) => barX(i) + barW / 2;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img"
      aria-label="How much you save per extra year you stay bonded, shown as a two-tier step">
      <line x1={pad.left} x2={w - pad.right} y1={yBar(0)} y2={yBar(0)} className="chart-grid" />
      {marginal.map((v, i) => (
        <rect
          key={i}
          x={barX(i)}
          y={yBar(v)}
          width={barW}
          height={yBar(0) - yBar(v)}
          className={i <= transitionIndex ? "chart-bar chart-bar-tier-high" : "chart-bar chart-bar-tier-low"}
        />
      ))}
      {marginal.map((v, i) => (
        <text key={i} x={labelX(i)} y={yBar(v) - 8} className="chart-bar-value" textAnchor="middle">
          {moneyShort(v)}
        </text>
      ))}
      {marginal.map((_, i) => (
        <text key={i} x={labelX(i)} y={h - 6} className="chart-axis-label" textAnchor="middle">
          Year {i + 1}
        </text>
      ))}

      {/* transition marker between the two tiers, at the true midpoint
          between this band and the next (not just half the gap after this
          bar, which sat too close to transitionIndex's bar/label) */}
      <line
        x1={pad.left + (transitionIndex + 1) * bandW}
        x2={pad.left + (transitionIndex + 1) * bandW}
        y1={pad.top}
        y2={yBar(0)}
        className="chart-tier-divider"
      />
    </svg>
  );
}

/** yyyy-mm-dd for an <input type="date">'s value attribute, in local time
 * (not toISOString, which shifts to UTC and can roll the date back a day). */
const dateInputValue = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function App() {
  const [cohort, setCohort] = useState<AdmissionCohort>("AY2025/2026");
  const [major, setMajor] = useState(MAJOR_GROUPS[0].majors[3]); // Computer Science
  const [bondYears, setBondYears] = useState(0);
  const [semestersCompleted, setSemestersCompleted] = useState(nominalSemesters(DEGREE));
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced toggle for exact bond dates (opt-in, off by default — see
  // docs/payback-formula-spec.md section 1 / CLAUDE.md on the coarse slider
  // being a deliberate MVP simplification). "use dates" naming to avoid
  // clashing with showAdvanced above, which toggles the breakdown view.
  const [useExactDates, setUseExactDates] = useState(false);
  const [bondStartDate, setBondStartDate] = useState<string>("");
  const [asOfDate, setAsOfDate] = useState<string>("");

  const category: FeeCategory = useMemo(() => {
    const group = MAJOR_GROUPS.find((g) => g.majors.includes(major));
    return group ? group.category : MAJOR_GROUPS[0].category;
  }, [major]);

  const maxSemesters = nominalSemesters(DEGREE);

  // Exact dates only take effect once both fields are filled in — falls back
  // to the slider otherwise (spec: "bond-start-date field is empty" -> current behavior).
  const exactBondDates = useMemo(() => {
    if (!useExactDates || !bondStartDate || !asOfDate) return undefined;
    return { bondStartDate: new Date(bondStartDate), asOfDate: new Date(asOfDate) };
  }, [useExactDates, bondStartDate, asOfDate]);

  const result = useMemo(
    () =>
      calculatePayback({
        cohort,
        category,
        degree: DEGREE,
        bondYearsCompleted: bondYears,
        semestersCompleted,
        exactBondDates,
      }),
    [cohort, category, bondYears, semestersCompleted, exactBondDates],
  );

  // Full B=0..6 trajectory for the marginal-savings chart, reusing
  // calculatePayback for every point rather than reimplementing the
  // interest/pro-rata math.
  const totals = useMemo(
    () =>
      Array.from({ length: 7 }, (_, b) =>
        calculatePayback({ cohort, category, degree: DEGREE, bondYearsCompleted: b, semestersCompleted }).total,
      ),
    [cohort, category, semestersCompleted],
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
          <label htmlFor="semestersCompleted">
            Semesters of study completed: <strong>{semestersCompleted}</strong> of {maxSemesters}
          </label>
          <input
            id="semestersCompleted"
            type="range"
            min={1}
            max={maxSemesters}
            step={1}
            value={semestersCompleted}
            onChange={(e) => setSemestersCompleted(Number(e.target.value))}
          />
          <div className="range-ticks">
            {Array.from({ length: maxSemesters }, (_, i) => i + 1).map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>

        {!useExactDates && (
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
        )}

        <div className="field">
          <button
            type="button"
            className="toggle-advanced-dates"
            aria-expanded={useExactDates}
            onClick={() => {
              const next = !useExactDates;
              setUseExactDates(next);
              // Default "calculating as of" to today the moment the toggle
              // reveals the date inputs (most common question: "what would
              // I owe if I left today"), but only if not already set, so
              // re-toggling doesn't clobber a date the user picked.
              if (next && !asOfDate) setAsOfDate(dateInputValue(new Date()));
            }}
          >
            {useExactDates ? "Using exact dates" : "Advanced: use exact bond dates"}
          </button>
          {useExactDates && (
            <p className="field-note">Dates below override the bond-years slider.</p>
          )}
        </div>

        {useExactDates && (
          <>
            <div className="field">
              <label htmlFor="bondStartDate">Bond start date (first day of Qualifying Employment)</label>
              <input
                id="bondStartDate"
                type="date"
                value={bondStartDate}
                onChange={(e) => setBondStartDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="asOfDate">Calculating as of</label>
              <input
                id="asOfDate"
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
              />
            </div>
          </>
        )}
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
        <h2>How much you save per extra year you stay bonded</h2>
        <p className="advanced-meta">
          Each bar shows how much less you'd owe if you served one more bond
          year. The savings stay the same for the first few years (while
          MOE's bond is still active), then drop to a smaller constant amount
          once MOE's portion is fully paid off.
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
            Years scholarship money was paid to you: {result.D}. Bond years completed: {result.B}.
          </p>

          {/* ponytail: two narrow 3-col tables stacked vertically, instead of
              one wide 6-col table, so nothing needs horizontal scroll at any
              viewport width (Task 4.4) — a side-effect of a layout that also
              reads more like two separate ledgers, NUS's and MOE's. */}
          <div className="statement-section">
            <h3>NUS payments to you, by year</h3>
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Amount paid</th>
                  <th>Running total with interest</th>
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
            <h3>MOE payments to you, by year</h3>
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Amount paid</th>
                  <th>Running total with interest</th>
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
              <dt>NUS Liquidated Damages (the amount you owe NUS under your bond) — before cap</dt>
              <dd>{money(result.nusBeforeCap)}</dd>

              <dt>NUS cap applied (single-degree $262,000 / double-degree $295,000)</dt>
              <dd>{money(result.cap)}</dd>

              <dt>NUS Liquidated Damages — after cap</dt>
              <dd>{money(result.nusAfterCap)}</dd>

              <dt className="subtotal-row">
                NUS Liquidated Damages —{" "}
                {result.exactDateBreakdown
                  ? `reduced for ${result.exactDateBreakdown.daysServed} days served (of ${result.exactDateBreakdown.totalBondDays})`
                  : "reduced for bond years already served"}
              </dt>
              <dd className="subtotal-row">{money(result.nusAfterProRata)}</dd>

              <dt>MOE Tuition Grant repayment — before reduction for bond years served (no cap applies)</dt>
              <dd>{money(result.moeBeforeProRata)}</dd>

              <dt className="subtotal-row">
                MOE Tuition Grant repayment —{" "}
                {result.exactDateBreakdown
                  ? `reduced for ${result.exactDateBreakdown.monthsServed} months served (of ${result.exactDateBreakdown.totalBondMonths})`
                  : "reduced for bond years already served"}
              </dt>
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
