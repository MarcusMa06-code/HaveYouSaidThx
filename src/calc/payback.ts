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

/** The only two fee tiers this calculator exposes (every S&T scholar is an
 * international student on the MOE Tuition Grant — see product-owner scope
 * decision #2, SC/PR/NonGrant exist in the dataset but aren't offered here). */
export type FeeTier = "ISAsean" | "ISOther";

export type DegreeType =
  | "Bachelor"
  | "BachelorHonours"
  | "DoubleDegreeSingleHonours"
  | "DoubleDegreeDoubleHonours";

/** Nominal programme duration (years) per spec section 1. */
const NOMINAL_DURATION: Record<DegreeType, number> = {
  Bachelor: 3,
  BachelorHonours: 4,
  DoubleDegreeSingleHonours: 4.5,
  DoubleDegreeDoubleHonours: 5,
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

/** D = disbursement years, spec section 2: 4.5 nominal years rounds up to 5
 * whole disbursement/compounding years (spec section 8, assumption #5). */
function disbursementYears(degree: DegreeType): number {
  return Math.ceil(NOMINAL_DURATION[degree]);
}

export interface CalculatorInputs {
  cohort: AdmissionCohort;
  category: FeeCategory;
  feeTier: FeeTier;
  degree: DegreeType;
  /** Bond years completed since graduation, integer 0-6 (spec section 1). */
  bondYearsCompleted: number;
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

/** NUS-side annual disbursement for study-year i (spec section 3.1). */
function nusDisbursement(
  i: number,
  cohort: AdmissionCohort,
  category: FeeCategory,
  feeTier: FeeTier,
): number {
  const tuition = TUITION_FEES[cohort][category][feeTier];
  const {
    livingAllowancePerYear,
    accommodationAllowancePerYear,
    computerAllowanceOneTime,
    settlingInAllowanceOneTime,
  } = ST_SCHOLARSHIP_ALLOWANCES;

  const oneTime = i === 1 ? computerAllowanceOneTime + settlingInAllowanceOneTime : 0;
  return tuition + livingAllowancePerYear + accommodationAllowancePerYear + oneTime;
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
  feeTier: FeeTier,
): number {
  const row = TUITION_FEES[cohort][category];
  return row.NonGrant - row[feeTier];
}

/** NUS Liquidated Damages, spec section 4. */
function nusLiquidatedDamages(
  D: number,
  B: number,
  cohort: AdmissionCohort,
  category: FeeCategory,
  feeTier: FeeTier,
  degree: DegreeType,
): { beforeCap: number; afterCap: number; afterProRata: number; cap: number } {
  let total = 0;
  for (let i = 1; i <= D; i++) {
    const d = nusDisbursement(i, cohort, category, feeTier);
    const periods = D - i + B;
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
  feeTier: FeeTier,
): { beforeProRata: number; afterProRata: number } {
  let total = 0;
  for (let i = 1; i <= D; i++) {
    const d = moeDisbursement(cohort, category, feeTier);
    const periods = D - i + B;
    total += d * Math.pow(1 + INTEREST_RATE, periods);
  }
  const beforeProRata = total;

  // No cap found in public MOE sources (docs/policy-moe-tgs.md sec 2.3) — none applied.
  const servedFraction = Math.min(B, MOE_BOND_YEARS) / MOE_BOND_YEARS;
  const afterProRata = beforeProRata * (1 - servedFraction);

  return { beforeProRata, afterProRata };
}

export interface NoBondBaselines {
  /** D years at the subsidised (Tuition Grant) rate, no interest, no bond —
   * "what if you'd never taken S&T but still got the ordinary MOE TG". */
  skippedTopUp: number;
  /** D years at the full unsubsidised rate, no interest, no bond —
   * "what if you'd had no Tuition Grant at all". */
  noTuitionGrant: number;
}

/** Reference baselines for the payback-trajectory chart (Task 2). Nominal
 * sums only — no interest, no bond math — so these deliberately don't reuse
 * nusLiquidatedDamages/moeClawback, they're a different (non-compounding)
 * quantity by definition. */
export function noBondBaselines(
  cohort: AdmissionCohort,
  category: FeeCategory,
  feeTier: FeeTier,
  degree: DegreeType,
): NoBondBaselines {
  const D = disbursementYears(degree);
  const row = TUITION_FEES[cohort][category];
  return {
    skippedTopUp: row[feeTier] * D,
    noTuitionGrant: row.NonGrant * D,
  };
}

/** Full calculation, spec sections 4-7. Returns both the headline total and
 * the full per-year breakdown for the advanced/audit view. */
export function calculatePayback(inputs: CalculatorInputs): PaybackResult {
  const { cohort, category, feeTier, degree, bondYearsCompleted } = inputs;
  const D = disbursementYears(degree);
  const B = bondYearsCompleted;

  const nus = nusLiquidatedDamages(D, B, cohort, category, feeTier, degree);
  const moe = moeClawback(D, B, cohort, category, feeTier);

  const years: YearBreakdown[] = [];
  for (let i = 1; i <= D; i++) {
    const periods = D - i + B;
    const nusD = nusDisbursement(i, cohort, category, feeTier);
    const moeD = moeDisbursement(cohort, category, feeTier);
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
