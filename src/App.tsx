import { useMemo, useState } from "react";
import type { AdmissionCohort, FeeCategory } from "../data/tuition-fees";
import {
  calculatePayback,
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
            <option value="ISAsean">International Student — ASEAN passport</option>
            <option value="ISOther">International Student — other nationality</option>
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

      <button
        type="button"
        className="toggle-advanced"
        onClick={() => setShowAdvanced((v) => !v)}
        aria-expanded={showAdvanced}
      >
        {showAdvanced ? "Hide" : "Show"} calculation breakdown
      </button>

      {showAdvanced && (
        <section className="card advanced">
          <h2>Breakdown</h2>
          <p className="advanced-meta">
            D (disbursement years) = {result.D}, B (bond years completed) = {result.B}
          </p>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Periods</th>
                  <th>NUS disbursement</th>
                  <th>NUS compounded</th>
                  <th>MOE disbursement</th>
                  <th>MOE compounded</th>
                </tr>
              </thead>
              <tbody>
                {result.years.map((y) => (
                  <tr key={y.year}>
                    <td>{y.year}</td>
                    <td>{y.periods}</td>
                    <td>{money(y.nusDisbursement)}</td>
                    <td>{money(y.nusCompounded)}</td>
                    <td>{money(y.moeDisbursement)}</td>
                    <td>{money(y.moeCompounded)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="subtotals">
            <dt>NUS Liquidated Damages — before cap</dt>
            <dd>{money(result.nusBeforeCap)}</dd>

            <dt>NUS cap applied (single-degree $262,000 / double-degree $295,000)</dt>
            <dd>{money(result.cap)}</dd>

            <dt>NUS Liquidated Damages — after cap</dt>
            <dd>{money(result.nusAfterCap)}</dd>

            <dt>NUS Liquidated Damages — after bond-served pro-rata reduction</dt>
            <dd>{money(result.nusAfterProRata)}</dd>

            <dt>MOE clawback — before pro-rata (no cap applies)</dt>
            <dd>{money(result.moeBeforeProRata)}</dd>

            <dt>MOE clawback — after bond-served pro-rata reduction</dt>
            <dd>{money(result.moeAfterProRata)}</dd>

            <dt className="total-row">Total payback</dt>
            <dd className="total-row">{money(result.total)}</dd>
          </dl>
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
