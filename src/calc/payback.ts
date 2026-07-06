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

/** Exact bond dates for the opt-in "Advanced" precision mode (see
 * docs/payback-formula-spec.md section 1, Clause 6(a)). Both must be set for
 * exact-date pro-rata to apply; otherwise callers fall back to the integer
 * bondYearsCompleted slider. */
export interface ExactBondDates {
  /** First day of Qualifying Employment (Clause 6(a)) — the real Bond Period
   * start, as opposed to the MVP's graduation-day simplification. */
  bondStartDate: Date;
  /** The date to calculate liability as of (e.g. a planned resignation date). */
  asOfDate: Date;
}

export interface CalculatorInputs {
  cohort: AdmissionCohort;
  category: FeeCategory;
  degree: DegreeType;
  /** Bond years completed since graduation, integer 0-6 (spec section 1).
   * Ignored when exactBondDates is provided. */
  bondYearsCompleted: number;
  /** Semesters of study completed (1..nominalSemesters(degree)); drives the
   * disbursement-year count D, with a halved final year for odd values. */
  semestersCompleted: number;
  /** Optional exact-date override for the pro-rata factors (Advanced toggle).
   * When provided, replaces the integer-slider-derived NUS/MOE pro-rata
   * factors with ones computed from real calendar dates, per each contract's
   * own stated unit (days for NUS, months for MOE — these are NOT the same
   * math, see proRataFactors()). Everything else (disbursement/compounding)
   * is unaffected. */
  exactBondDates?: ExactBondDates;
}

/** Whole days between two dates, floored — NUS's Fourth Schedule para 3 unit
 * ("completed days served / total Bond Period"). */
function daysBetween(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

/** Whole completed calendar months between two dates — MOE's Tuition Grant
 * Agreement Clause 3(4) unit ("completed months worked / Bond Period"). A
 * standard calendar month-diff, minus 1 if the end day-of-month hasn't yet
 * reached the start day-of-month (that final month isn't "completed" yet). */
function monthsBetween(start: Date, end: Date): number {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return months;
}

/** The two contracts' pro-rata reduction factors (NUS: days served / 6
 * calendar years; MOE: months served / 36), from whichever source the
 * caller provides — the integer bond-years slider (existing default path),
 * or exact bond dates (Advanced toggle, opt-in). Both entry points share the
 * same disbursement/compounding logic in nusLiquidatedDamages/moeClawback;
 * only this final multiplier's source differs. */
function proRataFactors(
  bondYearsCompleted: number,
  exactBondDates: ExactBondDates | undefined,
): {
  nusFraction: number;
  moeFraction: number;
  exactDateBreakdown?: PaybackResult["exactDateBreakdown"];
} {
  if (exactBondDates) {
    const { bondStartDate, asOfDate } = exactBondDates;

    // NUS: total Bond Period = 6 calendar years from bond start, computed as
    // an actual calendar date (handles leap years correctly, no 365.25 approximation).
    const bondEndDate = new Date(bondStartDate);
    bondEndDate.setFullYear(bondEndDate.getFullYear() + NUS_BOND_YEARS);
    const totalBondDays = daysBetween(bondStartDate, bondEndDate);
    const daysServed = daysBetween(bondStartDate, asOfDate);
    const nusFraction = Math.min(daysServed, totalBondDays) / totalBondDays;

    // MOE: total Bond Period = 36 months.
    const totalBondMonths = MOE_BOND_YEARS * 12;
    const monthsServed = monthsBetween(bondStartDate, asOfDate);
    const moeFraction = Math.min(monthsServed, totalBondMonths) / totalBondMonths;

    return {
      nusFraction,
      moeFraction,
      exactDateBreakdown: { daysServed, totalBondDays, monthsServed, totalBondMonths },
    };
  }

  return {
    nusFraction: Math.min(bondYearsCompleted, NUS_BOND_YEARS) / NUS_BOND_YEARS,
    moeFraction: Math.min(bondYearsCompleted, MOE_BOND_YEARS) / MOE_BOND_YEARS,
  };
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
  /** Set only when exact bond dates drove the pro-rata factors (Advanced
   * toggle on), for the breakdown statement's wording. Undefined when the
   * integer bond-years slider was used instead. */
  exactDateBreakdown?: {
    daysServed: number;
    totalBondDays: number;
    monthsServed: number;
    totalBondMonths: number;
  };
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

/** NUS Liquidated Damages, spec section 4. `nusFraction` is the pro-rata
 * factor already resolved by proRataFactors() — from either the integer
 * bond-years slider or exact bond dates. */
function nusLiquidatedDamages(
  D: number,
  nusFraction: number,
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

  const afterProRata = afterCap * (1 - nusFraction);

  return { beforeCap, afterCap, afterProRata, cap };
}

/** MOE clawback, spec section 5. See moeDisbursement() doc comment above for
 * why this stays a separate function from the NUS calculation. `moeFraction`
 * is the pro-rata factor already resolved by proRataFactors(). */
function moeClawback(
  D: number,
  moeFraction: number,
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
  const afterProRata = beforeProRata * (1 - moeFraction);

  return { beforeProRata, afterProRata };
}

/** Full calculation, spec sections 4-7. Returns both the headline total and
 * the full per-year breakdown for the advanced/audit view. */
export function calculatePayback(inputs: CalculatorInputs): PaybackResult {
  const { cohort, category, degree, bondYearsCompleted, semestersCompleted, exactBondDates } = inputs;
  const { D, hasPartialFinalSemester } = disbursementYearsFromSemesters(semestersCompleted);
  const B = bondYearsCompleted;

  const { nusFraction, moeFraction, exactDateBreakdown } = proRataFactors(B, exactBondDates);
  const nus = nusLiquidatedDamages(D, nusFraction, cohort, category, degree, hasPartialFinalSemester);
  const moe = moeClawback(D, moeFraction, cohort, category, hasPartialFinalSemester);

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
    exactDateBreakdown,
  };
}
