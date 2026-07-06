import { useMemo, useState } from "react";
import type { AdmissionCohort, FeeCategory } from "../data/tuition-fees";
import { calculatePayback, nominalSemesters } from "./calc/payback";
import { MAJOR_GROUPS } from "./calc/majors";
import { useSettings } from "./settings";
import { formatMoney, CURRENCIES } from "./currency";
import { LANGS } from "./i18n";
import "./App.css";

const COHORTS: AdmissionCohort[] = ["AY2024/2025", "AY2025/2026", "AY2026/2027"];

// ponytail: degree is hardcoded to BachelorHonours — the major dropdown only
// offers single-major programmes, so there's no way for a user to indicate a
// Double Degree Programme (that needs a second-major picker, which doesn't
// exist yet). Revisit once that picker is built; DegreeType/payback.ts keep
// the DoubleDegree* cases fully implemented for that future work.
const DEGREE = "BachelorHonours";

// ponytail: plain inline SVG for the marginal-savings chart — 6 data points,
// no zoom/pan/tooltip interactivity requested, so a charting library would
// be pure weight. A couple of <rect>/<text> elements is the right amount of
// engineering for this.
const CHART_W = 640;

interface MarginalChartProps {
  totals: number[]; // index = B, 0..6 (SGD)
  /** Formats an SGD figure to the selected currency, no decimals (chart labels). */
  fmt: (sgd: number) => string;
  /** Translated "Years {a}–{b}" axis label. */
  rangeLabel: (a: number, b: number) => string;
}

/** Two-bar chart of the per-year marginal saving. Because interest freezes at
 * graduation (spec section 2), payback(B) is a frozen total times a linear
 * pro-rata factor, so the saving per extra bond year takes exactly TWO values:
 * a higher constant for years 1–3 (while MOE's 3-year bond is still active)
 * and a lower constant for years 4–6 (after MOE's bond is fully discharged).
 * The old 6-bar version drew each value three times over — collapsing to one
 * bar per tier removes that redundancy. */
function MarginalChart({ totals, fmt, rangeLabel }: MarginalChartProps) {
  // Each tier's per-year saving (any year within a tier is identical). Tier 1:
  // the B=0->1 step (years 1-3). Tier 2: the B=3->4 step (years 4-6).
  const tiers = [
    { value: totals[0] - totals[1], from: 1, to: 3, cls: "chart-bar-tier-high" },
    { value: totals[3] - totals[4], from: 4, to: 6, cls: "chart-bar-tier-low" },
  ];

  const w = CHART_W;
  const h = 260;
  const pad = { top: 44, right: 20, bottom: 40, left: 20 };
  const pw = w - pad.left - pad.right;
  const ph = h - pad.top - pad.bottom;
  const n = tiers.length;
  const bandW = pw / n;
  const maxBar = Math.max(...tiers.map((t) => t.value)) * 1.15;

  const barX = (i: number) => pad.left + i * bandW + bandW * 0.2;
  const barW = bandW * 0.6;
  const yBar = (v: number) => pad.top + ph - (v / maxBar) * ph;
  const labelX = (i: number) => barX(i) + barW / 2;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="chart" role="img"
      aria-label="Per-year saving, higher for years 1-3 then lower for years 4-6">
      <line x1={pad.left} x2={w - pad.right} y1={yBar(0)} y2={yBar(0)} className="chart-grid" />
      {tiers.map((tier, i) => (
        <rect
          key={i}
          x={barX(i)}
          y={yBar(tier.value)}
          width={barW}
          height={yBar(0) - yBar(tier.value)}
          className={`chart-bar ${tier.cls}`}
        />
      ))}
      {tiers.map((tier, i) => (
        <text key={i} x={labelX(i)} y={yBar(tier.value) - 8} className="chart-bar-value" textAnchor="middle">
          {fmt(tier.value)}
        </text>
      ))}
      {tiers.map((tier, i) => (
        <text key={i} x={labelX(i)} y={h - 6} className="chart-axis-label" textAnchor="middle">
          {rangeLabel(tier.from, tier.to)}
        </text>
      ))}
    </svg>
  );
}

/** yyyy-mm-dd for an <input type="date">'s value attribute, in local time
 * (not toISOString, which shifts to UTC and can roll the date back a day). */
const dateInputValue = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function App() {
  const { t, lang, setLang, currency, setCurrency, ratesState } = useSettings();

  // All monetary display goes through one place: convert SGD -> selected
  // currency + format. `money` full (2dp), `moneyShort` for compact chart labels.
  const money = (sgd: number) => formatMoney(sgd, currency, ratesState.rates, 2);
  const moneyShort = (sgd: number) => formatMoney(sgd, currency, ratesState.rates, 0);

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
        <div className="header-top">
          <h1>Have You Said Thx?</h1>
          <div className="settings-selectors">
            <select
              aria-label="Language"
              className="mini-select"
              value={lang}
              onChange={(e) => setLang(e.target.value as typeof lang)}
            >
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Currency"
              className="mini-select"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as typeof currency)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="subtitle">{t("subtitle")}</p>
        {/* Only meaningful when a non-SGD currency is selected — SGD is the
            native calculation currency, so no exchange rate is involved. */}
        {currency !== "SGD" && (
          <p className="fx-note">
            {ratesState.date ? t("ratesAsOf", ratesState.date) : t("ratesApprox")}
          </p>
        )}
      </header>

      <section className="card">
        <div className="field">
          <label htmlFor="cohort">{t("cohortLabel")}</label>
          <select id="cohort" value={cohort} onChange={(e) => setCohort(e.target.value as AdmissionCohort)}>
            {COHORTS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="major">{t("majorLabel")}</label>
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
            {t("semestersLabel", semestersCompleted, maxSemesters)}
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
            <label htmlFor="bondYears">{t("bondYearsLabel", bondYears)}</label>
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
            {useExactDates ? t("advancedToggleOn") : t("advancedToggleOff")}
          </button>
          {useExactDates && <p className="field-note">{t("advancedNote")}</p>}
        </div>

        {useExactDates && (
          <>
            <div className="field">
              <label htmlFor="bondStartDate">{t("bondStartLabel")}</label>
              <input
                id="bondStartDate"
                type="date"
                value={bondStartDate}
                onChange={(e) => setBondStartDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="asOfDate">{t("asOfLabel")}</label>
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
        <p className="result-label">{t("resultLabel")}</p>
        <p className="result-value">{money(result.total)}</p>
        <p className="disclaimer">{t("disclaimer")}</p>
      </section>

      <section className="card chart-card">
        <h2>{t("chartTitle")}</h2>
        <p className="advanced-meta">{t("chartCaption")}</p>
        <MarginalChart totals={totals} fmt={moneyShort} rangeLabel={(a, b) => t("chartRange", a, b)} />
      </section>

      <button
        type="button"
        className="toggle-advanced"
        onClick={() => setShowAdvanced((v) => !v)}
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? t("breakdownHide") : t("breakdownShow")}
      </button>

      {showAdvanced && (
        <section className="card advanced statement">
          <h2>{t("breakdownTitle")}</h2>
          <p className="advanced-meta">{t("breakdownMeta", result.D, result.B)}</p>

          {/* ponytail: two narrow 3-col tables stacked vertically, instead of
              one wide 6-col table, so nothing needs horizontal scroll at any
              viewport width (Task 4.4) — a side-effect of a layout that also
              reads more like two separate ledgers, NUS's and MOE's. */}
          <div className="statement-section">
            <h3>{t("nusTableTitle")}</h3>
            <table>
              <thead>
                <tr>
                  <th>{t("colYear")}</th>
                  <th>{t("colAmountPaid")}</th>
                  <th>{t("colRunningTotal")}</th>
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
            <h3>{t("moeTableTitle")}</h3>
            <table>
              <thead>
                <tr>
                  <th>{t("colYear")}</th>
                  <th>{t("colAmountPaid")}</th>
                  <th>{t("colRunningTotal")}</th>
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
            <h3>{t("summaryTitle")}</h3>
            <dl className="subtotals">
              <dt>{t("nusBeforeCap")}</dt>
              <dd>{money(result.nusBeforeCap)}</dd>

              <dt>{t("nusCapApplied")}</dt>
              <dd>{money(result.cap)}</dd>

              <dt>{t("nusAfterCap")}</dt>
              <dd>{money(result.nusAfterCap)}</dd>

              <dt className="subtotal-row">
                {result.exactDateBreakdown
                  ? t(
                      "nusAfterProRataDays",
                      result.exactDateBreakdown.daysServed,
                      result.exactDateBreakdown.totalBondDays,
                    )
                  : t("nusAfterProRataYears")}
              </dt>
              <dd className="subtotal-row">{money(result.nusAfterProRata)}</dd>

              <dt>{t("moeBeforeProRata")}</dt>
              <dd>{money(result.moeBeforeProRata)}</dd>

              <dt className="subtotal-row">
                {result.exactDateBreakdown
                  ? t(
                      "moeAfterProRataMonths",
                      result.exactDateBreakdown.monthsServed,
                      result.exactDateBreakdown.totalBondMonths,
                    )
                  : t("moeAfterProRataYears")}
              </dt>
              <dd className="subtotal-row">{money(result.moeAfterProRata)}</dd>
            </dl>

            <div className="statement-total">
              <span>{t("totalPayback")}</span>
              <span>{money(result.total)}</span>
            </div>
          </div>
        </section>
      )}

      <footer className="page-footer">
        <p>{t("footer")}</p>
      </footer>
    </>
  );
}

export default App;
