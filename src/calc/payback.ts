/**
 * Core payback calculation: NUS Liquidated Damages + MOE Tuition Grant
 * clawback for an S&T scholar breaking their bond.
 *
 * Implements docs/payback-formula-spec.md sections 4-7 exactly. Do not
 * reinterpret the formula here — if the numbers look wrong, the spec doc
 * (and the ground-truth legal docs it cites) is the place to fix it, not
 * this file.
 */
import {
  TUITION_FEES,
  ST_SCHOLARSHIP_ALLOWANCES,
  type AdmissionCohort,
  type FeeCategory,
} from "../../data/tuition-fees";

export type DegreeType =
  | "BachelorHonours"
  | "DoubleDegreeSingleHonours"
  | "DoubleDegreeDoubleHonours";

/** Nominal programme duration in semesters, per spec section 1 (S&T
 * allowances/tuition are disbursed per-semester, so semesters are the
 * natural unit — see NOMINAL_SEMESTERS below). */
const NOMINAL_SEMESTERS: Record<DegreeType, number> = {
  BachelorHonours: 8,
  DoubleDegreeSingleHonours: 9,
  DoubleDegreeDoubleHonours: 10,
};

const NUS_BOND_YEARS = 6;
const MOE_BOND_YEARS = 3;
const INTEREST_RATE = 0.1;

function isDoubleDegree(degree: DegreeType): boolean {
  return (
    degree === "DoubleDegreeSingleHonours" ||
    degree === "DoubleDegreeDoubleHonours"
  );
}

/** Nominal (full-length) semester count for a degree type — the default and
 * max value of the semestersCompleted input (spec section 1). */
export function nominalSemesters(degree: DegreeType): number {
  return NOMINAL_SEMESTERS[degree];
}

/** Derive (D, hasPartialFinalSemester) from semesters completed `S`, spec
 * section "Early-graduation slider": fullYears = floor(S/2), D = ceil(S/2).
 * A odd `S` means the final disbursement year is only a half-year. */
function disbursementYearsFromSemesters(S: number): {
  D: number;
  hasPartialFinalSemester: boolean;
} {
  return { D: Math.ceil(S / 2), hasPartialFinalSemester: S % 2 !== 0 };
}

export interface CalculatorInputs {
  cohort: AdmissionCohort;
  category: FeeCategory;
  degree: DegreeType;
  /** Bond years completed since graduation, integer 0-6 (spec section 1). */
  bondYearsCompleted: number;
  /** Semesters of study completed (1..nominalSemesters(degree)); drives the
   * disbursement-year count D, with a halved final year for odd values. */
  semestersCompleted: number;
}

/** One study-year's line-item breakdown, for the advanced/audit view. */
export interface YearBreakdown {
  year: number;
  periods: number;
  nusDisbursement: number;
  nusCompounded: number;
  moeDisbursement: number;
  moeCompounded: number;
}

export interface PaybackResult {
  D: number;
  B: number;
  cap: number;
  years: YearBreakdown[];
  nusBeforeCap: number;
  nusAfterCap: number;
  nusAfterProRata: number;
  moeBeforeProRata: number;
  moeAfterProRata: number;
  total: number;
}

/** NUS-side annual disbursement for study-year i (spec section 3.1).
 * `isPartialFinalYear` halves the RECURRING amounts (tuition, living,
 * accommodation) for a final semester-only year — the one-time computer/
 * settling-in allowances are always paid in full in year 1 regardless. */
function nusDisbursement(
  i: number,
  cohort: AdmissionCohort,
  category: FeeCategory,
  isPartialFinalYear: boolean,
): number {
  const tuition = TUITION_FEES[cohort][category].ISOther;
  const {
    livingAllowancePerYear,
    accommodationAllowancePerYear,
    computerAllowanceOneTime,
    settlingInAllowanceOneTime,
  } = ST_SCHOLARSHIP_ALLOWANCES;

  const oneTime = i === 1 ? computerAllowanceOneTime + settlingInAllowanceOneTime : 0;
  const recurring = tuition + livingAllowancePerYear + accommodationAllowancePerYear;
  return (isPartialFinalYear ? recurring / 2 : recurring) + oneTime;
}

/** MOE-side annual disbursement for study-year i: the TG subsidy gap
 * (NonGrant - subsidised rate), per spec section 3.2.
 *
 * ponytail: kept in its own function (not inlined into the NUS calc) per
 * product-owner instruction, so the MOE side stays easy to isolate and swap.
 * The formula itself is now confirmed against the signed MOE Tuition Grant
 * Agreement (docs/policy-moe-tgs.md section 3, "Grant" = Tuition Grant + GST
 * Subsidy, already captured by the NonGrant-minus-subsidised-rate gap without
 * double-counting). One confirmed, deliberate divergence remains: the real
 * agreement pro-rates the first compounding period to the calendar month the
 * course commenced, while this whole-year, no-calendar-dates MVP does not
 * (see docs/payback-formula-spec.md section 5 and assumption #9) — so the
 * MOE figure is a known whole-year approximation, not an unresolved guess.
 */
function moeDisbursement(
  cohort: AdmissionCohort,
  category: FeeCategory,
  isPartialFinalYear: boolean,
): number {
  const row = TUITION_FEES[cohort][category];
  const gap = row.NonGrant - row.ISOther;
  return isPartialFinalYear ? gap / 2 : gap;
}

/** NUS Liquidated Damages, spec section 4. */
function nusLiquidatedDamages(
  D: number,
  B: number,
  cohort: AdmissionCohort,
  category: FeeCategory,
  degree: DegreeType,
  hasPartialFinalSemester: boolean,
): { beforeCap: number; afterCap: number; afterProRata: number; cap: number } {
  let total = 0;
  for (let i = 1; i <= D; i++) {
    const d = nusDisbursement(i, cohort, category, i === D && hasPartialFinalSemester);
    const periods = D - i;
    total += d * Math.pow(1 + INTEREST_RATE, periods);
  }
  const beforeCap = total;

  const cap = isDoubleDegree(degree) ? 295_000 : 262_000;
  const afterCap = Math.min(beforeCap, cap);

  const servedFraction = Math.min(B, NUS_BOND_YEARS) / NUS_BOND_YEARS;
  const afterProRata = afterCap * (1 - servedFraction);

  return { beforeCap, afterCap, afterProRata, cap };
}

/** MOE clawback, spec section 5. See moeDisbursement() doc comment above for
 * why this stays a separate function from the NUS calculation. */
function moeClawback(
  D: number,
  B: number,
  cohort: AdmissionCohort,
  category: FeeCategory,
  hasPartialFinalSemester: boolean,
): { beforeProRata: number; afterProRata: number } {
  let total = 0;
  for (let i = 1; i <= D; i++) {
    const d = moeDisbursement(cohort, category, i === D && hasPartialFinalSemester);
    const periods = D - i;
    total += d * Math.pow(1 + INTEREST_RATE, periods);
  }
  const beforeProRata = total;

  // No cap found in public MOE sources (docs/policy-moe-tgs.md sec 2.3) — none applied.
  const servedFraction = Math.min(B, MOE_BOND_YEARS) / MOE_BOND_YEARS;
  const afterProRata = beforeProRata * (1 - servedFraction);

  return { beforeProRata, afterProRata };
}

/** Full calculation, spec sections 4-7. Returns both the headline total and
 * the full per-year breakdown for the advanced/audit view. */
export function calculatePayback(inputs: CalculatorInputs): PaybackResult {
  const { cohort, category, degree, bondYearsCompleted, semestersCompleted } = inputs;
  const { D, hasPartialFinalSemester } = disbursementYearsFromSemesters(semestersCompleted);
  const B = bondYearsCompleted;

  const nus = nusLiquidatedDamages(D, B, cohort, category, degree, hasPartialFinalSemester);
  const moe = moeClawback(D, B, cohort, category, hasPartialFinalSemester);

  const years: YearBreakdown[] = [];
  for (let i = 1; i <= D; i++) {
    const periods = D - i;
    const isPartialFinalYear = i === D && hasPartialFinalSemester;
    const nusD = nusDisbursement(i, cohort, category, isPartialFinalYear);
    const moeD = moeDisbursement(cohort, category, isPartialFinalYear);
    years.push({
      year: i,
      periods,
      nusDisbursement: nusD,
      nusCompounded: nusD * Math.pow(1 + INTEREST_RATE, periods),
      moeDisbursement: moeD,
      moeCompounded: moeD * Math.pow(1 + INTEREST_RATE, periods),
    });
  }

  return {
    D,
    B,
    cap: nus.cap,
    years,
    nusBeforeCap: nus.beforeCap,
    nusAfterCap: nus.afterCap,
    nusAfterProRata: nus.afterProRata,
    moeBeforeProRata: moe.beforeProRata,
    moeAfterProRata: moe.afterProRata,
    total: nus.afterProRata + moe.afterProRata,
  };
}
