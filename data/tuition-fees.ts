/**
 * NUS undergraduate tuition fees per annum (S$), for the fee categories
 * relevant to S&T (Science & Technology Undergraduate Scholarship) holders.
 *
 * Source: NUS "Tuition Fees Per Annum" schedule (ugtuitioncurrent.pdf),
 * March 2026 edition, applicable AY2026/2027. Figures are locked per
 * admission cohort under NUS's cohort-based fee system (a student's fee
 * follows the rate of their admission year for their whole candidature).
 *
 * See docs/tuition-fees-source.md for full scope, exclusions, and the
 * major-to-category mapping this table depends on.
 *
 * IMPORTANT: This is a manually maintained dataset. It must be re-verified
 * and updated by hand whenever NUS republishes ugtuitioncurrent.pdf
 * (typically annually in March). No automated scraping/fetching is used.
 */

/** Fee categories relevant to S&T scholars. See docs/tuition-fees-source.md
 * for the full list of majors mapped to each category. */
export type FeeCategory =
  | "Computing"
  | "DesignAndEngineering"
  | "HumanitiesAndSciences";

/** Admission cohort, i.e. the academic year a student was admitted to NUS.
 * Fees are locked to this year for the student's entire candidature. */
export type AdmissionCohort = "AY2024/2025" | "AY2025/2026" | "AY2026/2027";

/** Per-annum tuition fee (S$), covering Semesters 1 and 2 together. */
export interface TuitionFeeRow {
  /** Singapore Citizen */
  SC: number;
  /** Singapore Permanent Resident */
  PR: number;
  /** International Student, other nationality, with MOE Tuition Grant */
  ISOther: number;
  /** International Student NOT in receipt of the MOE Tuition Grant (full unsubsidised rate, incl. 9% GST) */
  NonGrant: number;
}

export type TuitionFeeTable = Record<
  AdmissionCohort,
  Record<FeeCategory, TuitionFeeRow>
>;

export const TUITION_FEES: TuitionFeeTable = {
  "AY2024/2025": {
    Computing: {
      SC: 8250,
      PR: 11550,
      ISOther: 18900,
      NonGrant: 39200,
    },
    DesignAndEngineering: {
      SC: 8250,
      PR: 11550,
      ISOther: 18900,
      NonGrant: 39200,
    },
    HumanitiesAndSciences: {
      SC: 8250,
      PR: 11550,
      ISOther: 18900,
      NonGrant: 34900,
    },
  },
  "AY2025/2026": {
    Computing: {
      SC: 8250,
      PR: 11550,
      ISOther: 20000,
      NonGrant: 39200,
    },
    DesignAndEngineering: {
      SC: 8250,
      PR: 11550,
      ISOther: 20000,
      NonGrant: 39200,
    },
    HumanitiesAndSciences: {
      SC: 8250,
      PR: 11550,
      ISOther: 20000,
      NonGrant: 34900,
    },
  },
  "AY2026/2027": {
    Computing: {
      SC: 8300,
      PR: 11600,
      ISOther: 21400,
      NonGrant: 39700,
    },
    DesignAndEngineering: {
      SC: 8300,
      PR: 11600,
      ISOther: 21400,
      NonGrant: 39700,
    },
    HumanitiesAndSciences: {
      SC: 8300,
      PR: 11600,
      ISOther: 21400,
      NonGrant: 36650,
    },
  },

  // To add a new admission cohort in a future year, append a new entry here
  // (e.g. "AY2027/2028": { Computing: {...}, DesignAndEngineering: {...}, HumanitiesAndSciences: {...} })
  // after re-verifying figures against the newly published ugtuitioncurrent.pdf.
};

/**
 * Annual allowance figures NUS disburses to S&T scholarship holders,
 * per the S&T Handbook (August 2025 edition). Kept alongside tuition
 * fee data since both feed into the scholarship payback calculation.
 */
export const ST_SCHOLARSHIP_ALLOWANCES = {
  /** Recurring annual living allowance (S$/year) */
  livingAllowancePerYear: 6000,
  /** Recurring annual accommodation allowance (S$/year) */
  accommodationAllowancePerYear: 5408,
  /** One-time computer allowance (S$), paid once during candidature */
  computerAllowanceOneTime: 1750,
  /** One-time settling-in allowance (S$), paid once during candidature */
  settlingInAllowanceOneTime: 200,
} as const;
