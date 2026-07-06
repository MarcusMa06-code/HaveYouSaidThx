# Payback Formula Spec — NUS S&T Scholarship + MOE Tuition Grant Bond Break Calculator

Single, implementable spec combining `docs/policy-snt.md` (NUS side) and
`docs/policy-moe-tgs.md` (MOE side) into one algorithm. Written for an
engineer implementing this in TypeScript. No further legal judgment calls
should be required to implement what's below — all judgment calls already
made are listed explicitly in section 8.

---

## 1. MVP scope and inputs

**No exact calendar dates are modelled.** The calculator takes exactly two
inputs:

1. **Degree type** (a fixed choice of 4), which maps to a nominal programme
   duration per Handbook para 4:

   | Degree type | Nominal duration (years) |
   |---|---|
   | Bachelor | 3 |
   | Bachelor with Honours | 4 |
   | Double Degree, single Honours | 4.5 |
   | Double Degree, double Honours | 5 |

   The MVP assumes the scholar **completes in exactly this nominal duration**
   — no early/late graduation modelling.

2. **Bond years completed** — an integer slider from **0 to 6**. This
   represents **time elapsed since graduation only**. The calculator assumes
   the scholar has **already fully graduated** and is somewhere within the
   6-year post-graduation bond window. **Mid-study withdrawal is explicitly
   NOT in scope** for this MVP (noted as future work in section 8).

Both bonds (NUS 6-year, MOE 3-year) are treated as starting on the same day —
graduation day — per the Handbook's "immediately upon graduation" framing
(paras 14, 18), even though Clause 6(a) technically ties the Bond Period start
to "the first day of the SCHOLAR's Qualifying Employment." This is a
deliberate MVP simplification (see section 8).

## 2. Compounding-period rule

> **Confirmed via direct correspondence with NUS/MOE, 2026-07-04:** the
> product owner directly asked the university how the 10% compound interest
> interacts with the post-graduation bond period. Official response:
>
> > "MOE: The compounding interest applies during studies and will stop upon
> > completion of studies/graduation or withdrawal/termination of
> > studies/scholarship/Tuition Grant. After graduation, if there is bond
> > period served and scholar wishes to buy out the remaining bond(s), the
> > liquidated damages will be reduced proportionately based on bond
> > served."
>
> This confirms **interest compounds only during the study years and
> freezes at the point of graduation.** There is no additional compounding
> during the bond-service period — after graduation, the frozen
> (principal + interest) total is simply reduced by the linear pro-rata
> factor (bond years served / total bond length). This applies to both the
> NUS side and the MOE side: the question was asked about the combined bond
> structure, and both agreements use identical boilerplate compounding
> language, so there is no reason to think they diverge on this point.
>
> Two other points were confirmed in the same response, already consistent
> with what this spec and the code implement (no formula change needed —
> noted here for corroboration):
> 1. "Yes, both bonds can be served concurrently. Bond service will start
>    after graduation." — matches section 1's concurrent 6yr(NUS)/3yr(MOE)
>    modelling.
> 2. "If scholar has served 3 years, scholar can be discharged from the
>    Tuition Grant bond and will have 3 years of scholarship bond left to
>    serve." — matches the MOE-fully-discharges-at-`B=3` behaviour in
>    section 5.

**No calendar dates exist in this model, so "academic year" compounding is
approximated in whole-year units as follows:**

> **Assumption:** each year's disbursement is treated as a lump sum paid at
> the end of that academic year of study, and it compounds once per
> completed academic year (NUS's 10%, MOE's 10%) from the end of the
> disbursement year through to the end of the programme (graduation),
> with no day-level pro-ration, and then **freezes** — no further
> compounding accrues during the post-graduation bond-service period, per
> the confirmed university response above. Every elapsed *study* year is
> treated as a full compounding period, consistent with both NUS's Fourth
> Schedule para 1 ("without pro-ration... regardless of the date") and
> MOE's stated "compounded at the end of each academic year" convention —
> but bond years elapsed after graduation are **not** compounding periods
> at all; they only feed the separate linear pro-rata reduction in
> sections 4-5 below.

Concretely, define:

- `D` = nominal programme duration in whole years, rounded **up** to the
  nearest integer for the purposes of counting *disbursement years* (e.g.
  4.5-year Double Degree Programme = 5 disbursement years: years 1-4 at a
  full year each, year 5 being the final half-year, still treated as one
  full disbursement/compounding year — see section 8 for this rounding
  assumption).
- `B` = bond years completed (0-6), the slider input. **`B` no longer
  affects the compounding calculation at all** — it only affects the
  linear pro-rata reduction applied after interest is computed (sections
  4-5).
- **Break point for compounding purposes** = graduation, i.e. `D` years
  after programme start. Interest does not continue to accrue past this
  point.
- For a disbursement made in study-year `i` (`i` = 1..`D`), the number of
  compounding periods between that disbursement and graduation is:

  ```
  periods(i) = D - i
  ```

  i.e. `(D - i)` whole academic years remaining in the programme after the
  disbursement, full stop — no bond-year term.

This single `periods(i)` formula is used for both the NUS Liquidated Damages
calculation and the MOE clawback calculation — both sides use the same
disbursement-year timeline and the same 10%-per-period convention, so they
share the same period-counting logic, differing only in *which* disbursement
amounts are summed and which cap/bond-length applies.

## 3. Per-year disbursement amounts

### 3.1 NUS side (Liquidated Damages base, per `docs/policy-snt.md` section 4)

For each study-year `i` = 1..`D`:

```
nusDisbursement(i) =
    tuitionFee(cohort, category, feeTier)      // Third Schedule (c) — annual
  + livingAllowancePerYear                      // Third Schedule (d) — annual, $6,000
  + accommodationAllowancePerYear               // Third Schedule (f) — annual, $5,408 (AY25/26 figure)
  + (i == 1 ? settlingInAllowanceOneTime : 0)   // Third Schedule (e) — one-time, $200
  + (i == 1 ? computerAllowanceOneTime : 0)     // Third Schedule (h) — one-time, $1,750
```

`tuitionFee`, `livingAllowancePerYear`, `accommodationAllowancePerYear`,
`computerAllowanceOneTime`, and `settlingInAllowanceOneTime` are sourced from
`data/tuition-fees.ts` (`TUITION_FEES` and `ST_SCHOLARSHIP_ALLOWANCES`) —
already implemented in this codebase and not re-derived here.

**Excluded from the base** (per section 8 assumptions): airfares (Third
Schedule a, b — no fixed amount given in source material, actual-cost only),
medical/insurance coverage (Third Schedule g — no fixed amount given), and
"any other approved fees/expenses" (Third Schedule i — unquantifiable). These
are flagged as an under-count in the Assumptions section; do not invent
placeholder numbers for them.

### 3.2 MOE side (clawback base, per `docs/policy-moe-tgs.md` section 3.2)

For each study-year `i` = 1..`D`:

```
moeDisbursement(i) = tuitionGrantSubsidy(cohort, category, feeTier, i)
```

Where `tuitionGrantSubsidy` is the gap MOE is covering — i.e. the difference
between the `NonGrant` (full unsubsidised) rate and the international
student's actual subsidised rate (`ISAsean` or `ISOther`) in
`data/tuition-fees.ts` for that cohort/category/year.

**Confirmed by the signed MOE Tuition Grant Agreement** (Recital 2 / Clause
1(1)-(2)): "the Grant" that forms the liquidated-damages base is **Tuition
Grant + GST Subsidy combined**, not the Tuition Grant alone. Because
`data/tuition-fees.ts`'s international-student columns (`ISAsean`, `ISOther`,
`NonGrant`) are already GST-inclusive (per that source PDF's own footnote —
only the SC/PR columns exclude GST), the `NonGrant − ISOther/ISAsean` gap
**already captures both components together**. No separate GST addition is
needed or should be added on top of this gap — see
`docs/policy-moe-tgs.md` section 3.2 for the full reasoning. This is still a
**derived approximation of the officially published Grant figure** (Clause
1(3) says the actual amount is separately published per academic year on
MOE's Tuition Grant website) rather than a literal sourced figure — see
section 8, assumption 7.

## 4. NUS Liquidated Damages algorithm

```
function nusLiquidatedDamages(D, B, cohort, category, feeTier):
    total = 0
    for i in 1..D:
        d = nusDisbursement(i)
        periods = D - i    // interest freezes at graduation — no + B here
        total += d * (1.10 ^ periods)

    cap = isDoubleDegreeProgramme ? 295_000 : 262_000    // Fourth Schedule para 2
    total = min(total, cap)

    bondYearsTotal = 6                                    // Handbook para 14
    servedFraction = min(B, bondYearsTotal) / bondYearsTotal
    total = total * (1 - servedFraction)                  // Fourth Schedule para 3

    return total
```

Ordering rationale: cap is applied to the accrued (principal + interest)
amount per Fourth Schedule para 2's plain reading, and the pro-rata reduction
in para 3 is applied last because it opens with "notwithstanding anything in
this Schedule" — read as overriding/reducing whatever figure (capped or not)
would otherwise be payable.

## 5. MOE clawback algorithm

```
function moeClawback(D, B, cohort, category, feeTier):
    total = 0
    for i in 1..D:
        d = moeDisbursement(i)
        periods = D - i    // interest freezes at graduation — no + B here
        total += d * (1.10 ^ periods)

    // No cap exists — confirmed absent from the First Schedule of the signed
    // MOE Tuition Grant Agreement (docs/policy-moe-tgs.md section 3.5). None applied.

    moeBondYearsTotal = 3                                 // MOE 3-year Bond Period, Clause 2(1)(i)
    servedFraction = min(B, moeBondYearsTotal) / moeBondYearsTotal
    total = total * (1 - servedFraction)                  // Clause 3(4) pro-rata reduction, see policy-moe-tgs.md 3.6

    return total
```

Note: once `B >= 3`, `servedFraction = 1` and `moeClawback` correctly goes to
**zero** — consistent with the Handbook's framing that the MOE bond is fully
discharged 3 years into the concurrent 6-year period.

**Known simplification (confirmed divergence, not a guess):** the signed
agreement's First Schedule para A(ii) states MOE's interest **does**
pro-rate the first partial compounding period to the calendar month the
Course commenced — the opposite of NUS's "without pro-ration" convention.
Because this MVP has no calendar dates at all, `periods(i)` above still uses
the same whole-year, no-pro-ration convention for the MOE side as for the
NUS side. This means `moeClawback`'s output is a **known approximation**
that will typically differ slightly from the real month-precise MOE figure,
in either direction depending on which month the Course actually commenced
in. See `docs/policy-moe-tgs.md` section 3.1 and section 8, assumption 9,
below.

Also note: Clause 3(4)'s pro-rata reduction is stated in **months worked /
Bond Period**, not days — this doesn't change the algorithm above (which is
already whole-year granularity), it's noted for accuracy only (see
`docs/policy-moe-tgs.md` section 3.6).

## 6. Total payback amount

```
function totalPayback(D, B, cohort, category, feeTier, isDoubleDegreeProgramme):
    nus = nusLiquidatedDamages(D, B, cohort, category, feeTier, isDoubleDegreeProgramme)
    moe = moeClawback(D, B, cohort, category, feeTier)
    return nus + moe    // the two obligations are separate and additive — owed to two different bodies
```

No combined cap exists across NUS + MOE in the source material — each side's
cap (or absence of one) is applied independently before summing.

## 7. Fully worked example

**Scholar profile:** Bachelor with Honours (Engineering → `DesignAndEngineering`
fee category), International Student ("Other" nationality tier, i.e.
`ISOther`), admitted **AY2025/2026**, single-degree programme, **0 bond years
completed** (calculating "what would I owe if I broke the bond the moment I
graduate").

- `D` = 4 (Bachelor Honours, Handbook para 4)
- `B` = 0
- Fee figures from `data/tuition-fees.ts`, AY2025/2026, `DesignAndEngineering`, `ISOther`: tuition = **$20,000/year**; `NonGrant` = **$39,200/year**
- Allowances (`ST_SCHOLARSHIP_ALLOWANCES`): living = $6,000/yr, accommodation = $5,408/yr, computer = $1,750 one-time, settling-in = $200 one-time

### 7.1 NUS-side disbursements per study-year

| Year `i` | Tuition | Living | Accommodation | One-time | Total `nusDisbursement(i)` |
|---|---|---|---|---|---|
| 1 | 20,000 | 6,000 | 5,408 | 1,750 + 200 = 1,950 | **33,358** |
| 2 | 20,000 | 6,000 | 5,408 | 0 | **31,408** |
| 3 | 20,000 | 6,000 | 5,408 | 0 | **31,408** |
| 4 | 20,000 | 6,000 | 5,408 | 0 | **31,408** |

Total disbursed (no interest) = 33,358 + 31,408×3 = **$127,582**

### 7.2 Compounding periods (D=4): `periods(i) = 4 - i` (interest freezes at
graduation, so `B` does not appear here — see section 2)

| Year `i` | periods(i) | Disbursement | × 1.10^periods | Compounded amount |
|---|---|---|---|---|
| 1 | 3 | 33,358 | ×1.331 | **44,399.50** |
| 2 | 2 | 31,408 | ×1.21 | **38,003.68** |
| 3 | 1 | 31,408 | ×1.10 | **34,548.80** |
| 4 | 0 | 31,408 | ×1.00 | **31,408.00** |

**Sum = $148,359.98** (NUS Liquidated Damages before cap)

### 7.3 Apply NUS cap (single-degree → $262,000)

`min(148,359.98, 262,000)` = **$148,359.98** (under cap, unaffected)

### 7.4 Apply NUS pro-rata reduction (B=0 of 6 bond years served)

`servedFraction = 0/6 = 0` → no reduction.

**NUS Liquidated Damages = $148,359.98**

### 7.5 MOE-side disbursements (subsidy gap = NonGrant − ISOther = 39,200 − 20,000 = $19,200/year, all 4 years)

| Year `i` | periods(i) | moeDisbursement(i) | Compounded amount |
|---|---|---|---|
| 1 | 3 | 19,200 | 19,200 × 1.331 = **25,555.20** |
| 2 | 2 | 19,200 | 19,200 × 1.21 = **23,232.00** |
| 3 | 1 | 19,200 | 19,200 × 1.10 = **21,120.00** |
| 4 | 0 | 19,200 | 19,200 × 1.00 = **19,200.00** |

**Sum = $89,107.20** (confirmed no MOE cap exists — First Schedule has no cap clause — so this stands as-is)

### 7.6 Apply MOE pro-rata reduction (B=0 of 3 MOE bond years served)

`servedFraction = min(0,3)/3 = 0` → no reduction.

**MOE clawback = $89,107.20**

### 7.7 Total payback

```
Total = NUS LD + MOE clawback
      = $148,359.98 + $89,107.20
      = $237,467.18
```

**This scholar would owe approximately S$237,467.18 if they broke both bonds
the day they graduated**, before legal/recovery costs (deferred) and before
any post-demand overdue-payment interest (deferred).

### 7.8 Full B=0..6 table (same profile), demonstrating the frozen-interest, linear-reduction shape

Because interest freezes at graduation (section 2), the NUS and MOE
compounded totals (before pro-rata reduction) are **constant across all
values of `B`** — $148,359.98 and $89,107.20 respectively, for this profile.
`B` only scales the linear pro-rata reduction applied on top. This makes the
payback-vs-bond-year curve **exactly piecewise-linear** (a frozen total ×
linear reduction factor), not the smoothly-decaying shape produced by the
old, incorrect "interest keeps compounding through the bond" model:

| `B` | NUS (after pro-rata) | MOE (after pro-rata) | Total |
|---|---|---|---|
| 0 | $148,359.98 | $89,107.20 | $237,467.18 |
| 1 | $123,633.32 | $59,404.80 | $183,038.12 |
| 2 | $98,906.65 | $29,702.40 | $128,609.05 |
| 3 | $74,179.99 | $0.00 | $74,179.99 |
| 4 | $49,453.33 | $0.00 | $49,453.33 |
| 5 | $24,726.66 | $0.00 | $24,726.66 |
| 6 | $0.00 | $0.00 | $0.00 |

Note the sharp kink at `B=3`: MOE's obligation reaches exactly $0 and stays
there, while NUS continues its own linear decline to `B=6`. Because MOE's
total is frozen at graduation and only reduced linearly, this kink is a true
piecewise-linear slope change, not a smooth-curve inflection.

*(Sanity check for engineering: rerun this same example with `B = 6` — both
`servedFraction` terms become 1, and both `nusLiquidatedDamages` and
`moeClawback` should evaluate to exactly $0.)*

## 8. Assumptions & Open Questions

This section lists every judgment call made where the source material was
silent or ambiguous. **Product owner should review before engineering
finalizes on these.**

1. **Citizenship/residency status assumed constant.** The MVP assumes the
   scholar's citizenship/residency status (and therefore fee tier — SC / PR /
   IS-ASEAN / IS-Other / Non-Grant) is constant from admission through the
   point of bond-breaking. In reality, NUS's cohort-based fee system locks
   the fee schedule **per admission cohort and fee tier at the time it
   applies** — if a scholar's status changes mid-candidature (e.g.
   international → PR, or → Singapore Citizen), NUS moves them to the new,
   cheaper tier's fee from that point forward (still within their admission
   cohort's fee table, just a different row). This is distinct from the
   scholarship's own conditions (e.g. losing MOE Tuition Grant eligibility
   triggers scholarship withdrawal per the T&C). **Mid-candidature
   citizenship changes are out of scope for this MVP** and are not modelled
   — flagged as a known future-work item.

2. **Bond start date simplification.** Clause 6(a) ties the actual Bond
   Period start to "the first day of the SCHOLAR's Qualifying Employment,"
   not graduation day itself. The MVP collapses this gap to zero — i.e.
   assumes the scholar starts Qualifying Employment immediately upon
   graduation. Any gap between graduation and starting a qualifying job
   (which would arguably delay bond-clock start under 6(a), potentially to
   the scholar's benefit in a real dispute) is not modelled.

3. **Mid-study withdrawal is out of scope.** The "bond years completed"
   slider only models time since graduation (0-6 post-grad years). A scholar
   who withdraws *during* their studies (before graduating at all) is a
   materially different scenario — different disbursement totals, different
   Bond Period start question, and Clause 6 arguably doesn't even apply the
   same way. Flagged as future work, not modelled at all in this MVP.

4. **Leave/suspension/overseas periods (Clause 6(c)-(e)) not modelled.** The
   calculator assumes a clean, continuous bond-years-completed count with no
   deductions for no-pay leave, half-pay leave, study leave, suspension, or
   most overseas periods, all of which per Clause 6(c)-(e) do NOT count
   toward bond discharge in reality. Flagged as future work.

5. **Fractional programme durations (4.5 years) rounded up to 5 disbursement
   years.** For the Double-Degree-single-Honours case (`D` = 4.5 nominal
   years), the model treats this as **5 whole disbursement/compounding
   years** rather than modelling a genuine half-year. This likely
   over-counts one half-year of allowances/tuition slightly. An alternative
   (halving the final year's disbursement) was considered but rejected for
   MVP simplicity, given the "no calendar dates" constraint. Flagged for
   product owner review — may want the halved-final-year approach instead.

6. **Airfare, medical/insurance coverage, and "other approved
   fees/expenses" (Third Schedule a, b, g, i) excluded from the NUS
   disbursement base**, since no fixed dollar figure was given in the source
   material (they're actual-cost/reimbursement items, not fixed allowances).
   This means the calculator's NUS Liquidated Damages figure is a
   **conservative under-count** relative to what a scholar would actually be
   asked to repay in reality, since real airfare and insurance costs were
   in fact disbursed on the scholar's behalf per Fourth Schedule para 1's
   broad "all monies paid... incurred on behalf of or for the benefit of"
   language. Flagged clearly so the product owner can decide whether to
   caveat this in the UI (e.g. "this is a lower-bound estimate") or attempt
   to add placeholder estimates in a future iteration.

7. **MOE subsidy amount derived, not sourced directly.** `data/tuition-fees.ts`
   doesn't carry a separate "Grant received" field — this spec derives it as
   `NonGrant rate − subsidised (IS) rate`. Per the signed MOE Tuition Grant
   Agreement (Recital 2 / Clause 1(1)-(2)), the actual liquidated-damages
   base ("the Grant") is Tuition Grant + GST Subsidy combined — and since
   `data/tuition-fees.ts`'s international-student columns are already
   GST-inclusive, this derived gap already captures both components without
   double-counting (see `docs/policy-moe-tgs.md` section 3.2 for the full
   reasoning — no separate GST addition should be layered on). This remains
   **a derived approximation, not the literal officially-published Grant
   figure** for a given cohort/year (Clause 1(3) confirms MOE separately
   publishes the actual amount per academic year on its Tuition Grant
   website) — still worth cross-checking against that published figure if
   precision matters more than MVP speed.

8. **MOE's pro-rata reduction mechanism is now confirmed** (Clause 3(4)):
   reduce the amount owed by completed **months worked / Bond Period**
   (months, not days — NUS's Fourth Schedule para 3 uses days). Since this
   MVP already collapses everything to whole-year granularity, the
   months-vs-days distinction doesn't change the algorithm in section 5
   above. The remaining open point is that Clause 3(4) frames this as
   discretionary ("the Government **may**... at its sole discretion"), not
   automatic — mirroring NUS's own "may be reduced" phrasing in Fourth
   Schedule para 3. **The calculator models this reduction as if it applies
   automatically/by default in both cases** — a deliberate product decision
   to keep the tool usable (an "it depends on the Government's discretion"
   answer isn't useful to a user), not a legal guarantee that either MOE or
   NUS would actually grant the reduction in a real case. Worth confirming
   this framing with the product owner.

9. **MOE's interest compounding convention is confirmed to genuinely differ
   from NUS's — this is a known, deliberate simplification, not an
   unresolved guess.** The signed MOE Tuition Grant Agreement's First
   Schedule para A(ii) states interest compounds "with pro-ration
   commencing from the first day of the month in which the Course
   commences" — i.e. MOE **does** pro-rate the first partial period, unlike
   NUS's explicit "without pro-ration... regardless of the date" (Fourth
   Schedule para 1). Because this MVP has no calendar dates at all (product
   owner's decision), it cannot replicate MOE's month-level pro-ration and
   instead applies the same whole-year, no-pro-ration convention to both
   sides. **This means the MOE clawback figure is a known approximation
   that will typically differ slightly (in either direction, depending on
   which calendar month the Course actually commenced and disbursements
   were incurred in) from the real, month-precise MOE figure.** Recommend
   running the worked example through MOE's official LD Estimator
   (`go.gov.sg/grantsense`) as a sanity check on the size of this
   divergence, per `docs/policy-moe-tgs.md` section 6.

10. **No cap on the MOE side — now confirmed, not inferred.** The signed
    agreement's First Schedule (paras A-D2, the full liquidated-damages
    schedule) contains no cap clause at all, in contrast to NUS's explicit
    Fourth Schedule para (2) caps. See `docs/policy-moe-tgs.md` section 3.5.

11. **NUS cap treated as static.** Clause 9 lets NUS unilaterally raise the
    $262k/$295k cap by written notice at any time. The calculator hard-codes
    the cap values given in this research pass and does not model the
    possibility that NUS has since raised them. Flagged as a
    data-freshness risk, not a formula risk — the cap values should be
    periodically re-verified the same way `data/tuition-fees.ts` is (per
    that file's own header comment about manual annual re-verification).

12. **Legal/recovery costs (Fourth Schedule para 4 / First Schedule para C)
    and overdue-payment interest (Fourth Schedule paras 5-6 / First Schedule
    paras D1-D2) are entirely excluded**, per the task's explicit
    instruction — these apply only after a formal demand and subsequent
    default, which is a different question than "what would I owe today."
    Now confirmed (per `docs/policy-moe-tgs.md` section 3.7) that MOE's and
    NUS's overdue-interest mechanisms are textually identical (3-month
    compounded SORA + 4.5%, same reference-date windows) — standardized
    government boilerplate, not two separate mechanisms to model.

13. **[SUPERSEDED, corrected 2026-07-04] Original assumption: interest
    continues compounding through the bond-service period, not just
    through study years.** Earlier versions of this spec (and the code)
    used `periods(i) = (D - i) + B` — i.e. treated each of the `B` bond
    years elapsed since graduation as an *additional* compounding period,
    on top of the study-year periods. This was a **reasoned-but-not
    -explicitly-confirmed textual inference** from the "compounded... up to
    and including the date of termination of the Agreement" language in
    NUS's Fourth Schedule para (1) and MOE's structurally identical
    boilerplate (`docs/policy-snt.md` section 5, `docs/policy-moe-tgs.md`
    section 3.1) — a plausible reading of "date of termination" as "the
    date the bond-breaking scholar is asking about today," which could be
    years into the bond period.
    **This inference is now confirmed WRONG** by direct correspondence with
    NUS/MOE (see section 2 above, confirmed 2026-07-04): interest stops
    accruing at graduation/completion of studies, full stop. The
    post-graduation bond-service period contributes **zero** additional
    compounding periods; `B` affects only the linear pro-rata reduction
    (sections 4-5), never the exponent. This entry is kept (rather than
    silently deleted) so future readers understand this was a real,
    deliberate prior model — now superseded by first-party confirmation,
    the strongest evidence tier this project has — not a typo or an
    unexplained silent change. See `src/calc/payback.ts` and
    `src/calc/payback.test.ts` for the corrected implementation and its
    regression test.
