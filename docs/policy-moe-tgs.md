# MOE Tuition Grant Scheme (TGS) — Bond & Clawback Policy

> **Status: confirmed from the actual signed MOE Tuition Grant Agreement**
> (WEF AY2024), for the clauses cited below. The product owner supplied the
> relevant generic/boilerplate clause text (all personal fields — names,
> passport numbers, addresses, signatures — were stripped before it reached
> this workstream; none of that data was requested or is referenced here).
> Clause numbers below (Clause 2, Clause 3, First Schedule, etc.) refer to
> this signed agreement, not a public/inferred source. Sections still based
> on public research only (moe.gov.sg pages, not the signed agreement text)
> are explicitly labelled as such and retain their own confidence rating.

## 1. What the Tuition Grant is, and who's bonded

The Tuition Grant (TG) is MOE's subsidy that reduces an international
student's (or PR's) tuition fees down to a subsidised rate. In exchange,
recipients take on a service obligation ("bond").

**Confirmed, Clause 2(1)(i):** the Student shall be employed in a Singapore
entity for a period or periods totalling in aggregate **three (3) years
("Bond Period")** upon graduation, subject to:

- (i) service only counts toward discharge once the Student has already
  graduated;
- (ii) no-pay leave, half-pay leave, study leave, or leave of absence does
  **NOT** count toward discharge;
- (iii) suspension periods do **NOT** count toward discharge.

This 3-year figure matches what the S&T Handbook cites (Handbook para 18),
and per the Handbook it runs **concurrently** with the 6-year NUS scholarship
bond, not consecutively — see `docs/policy-snt.md` section 1.

**Confidence: High (confirmed from signed agreement)** for the 3-year Bond
Period and the non-discharge carve-outs in (ii)-(iii). These carve-outs are
structurally identical in kind to NUS's own Clause 6(c)-(e) (see
`docs/policy-snt.md` section 3) — both agreements exclude leave/suspension
periods from counting toward bond discharge, confirming this is standard
government/university boilerplate, not something unique to one side.

## 2. What triggers liquidated damages (breach)

**Confirmed, Clause 3(1):** breach triggers include (non-exhaustive list from
the supplied clause text): failing to graduate, terminating during the
course, failing to secure Singapore employment within 1 year of graduation,
being dismissed for misconduct, being unable to remain/work in Singapore
(including because the Student has gained citizenship or PR status
elsewhere), breaching any other obligation under the Agreement, etc. On
breach, the Government may terminate the Agreement, and the **Student and
Sureties are jointly and severally liable** for the liquidated damages set
out in the First Schedule.

**Confirmed, Clause 3(2):** for breaches under Clause 3(1)(a)/(b) specifically
(failing to graduate / terminating during the course), the Government has
**sole discretion** to reduce or waive damages if the breach was due to
illness, accident, or other extenuating circumstances. This is
**discretionary relief, not an automatic reduction** — it is not modelled in
the calculator (see section 6 and the spec doc's assumptions), since the MVP
is answering "what would I owe" under the standard formula, not modelling
a discretionary waiver application.

This calculator only models the "fails to fulfil bond requirements after
graduation" scenario, which falls under the broader Clause 3(1) trigger list
(not the (a)/(b) discretionary-relief-eligible ones).

## 3. Liquidated Damages formula — First Schedule

**Confidence: High (confirmed from signed agreement).** This section
supersedes the prior public-research-only version of this document — the
formula below is the **First Schedule** of the actual signed MOE Tuition
Grant Agreement (WEF AY2024), not an inference from MOE's public website.

### 3.1 The core formula (First Schedule, para A)

> "The liquidated damages... shall be the total amount of the Grant granted
> to the Student by the Government [where "Grant" = Tuition Grant + GST
> Subsidy, per Recital 2 / Clause 1(1)-(2)], plus interest thereon at the
> rate of 10% per annum."

In respect of each amount of the disbursed monies, the interest:

- **(i)** starts accruing on the **first day of the first month of the
  academic year of the Course in which the particular amount is expended or
  incurred**;
- **(ii)** is **compounded at 12-month intervals for each academic year or
  part thereof, WITH pro-ration commencing from the first day of the month
  in which the Course commences**;
- **(iii)** ceases to accrue on the date of termination of the Agreement, or
  the last day of the relevant 12-month interval in which the Course is
  completed, whichever is earlier.

> **Confirmed via direct correspondence with NUS/MOE, 2026-07-04:** read in
> isolation, "(iii) ceases to accrue on the date of termination of the
> Agreement" could plausibly mean interest keeps compounding all the way
> through the post-graduation bond-service period, since "termination"
> could be read as the moment the scholar actually buys out the bond
> (potentially years after graduation). The product owner asked MOE
> directly whether this was the case. Official response: "The compounding
> interest applies during studies and will stop upon completion of
> studies/graduation or withdrawal/termination of studies/scholarship/
> Tuition Grant. After graduation, if there is bond period served and
> scholar wishes to buy out the remaining bond(s), the liquidated damages
> will be reduced proportionately based on bond served." This confirms "the
> last day of the relevant 12-month interval in which the Course is
> completed" is the operative freeze point in the ordinary case (not
> "date of termination" read as "date of bond buy-out") — **interest stops
> accruing at graduation**, and the post-graduation bond period feeds only
> the separate pro-rata reduction (section 3.6 below), not further
> compounding. The prior reading (compounding continues through the bond
> period) was a reasonable inference from the clause text alone but is now
> known to be incorrect — see `docs/payback-formula-spec.md` section 2 and
> section 8 assumption #13 for the full correction history.

**This is a confirmed, deliberate divergence from NUS's convention, not an
open question.** NUS's Fourth Schedule para 1 is explicit that its 10%
interest compounds "without pro-ration... regardless of the date such
damages became payable" (see `docs/policy-snt.md` section 5). MOE's First
Schedule para A(ii) does the **opposite**: it explicitly pro-rates the first
partial compounding period to the month the Course actually commenced. These
are two different, independently-confirmed conventions — NUS's is coarser
(whole-year, no partial-period credit), MOE's is finer (month-level
pro-ration on the first period).

**Implication for this MVP:** because the calculator is deliberately
calendar-date-free (the product owner's decision — whole-year granularity
only, no exact months/dates), it **cannot exactly reproduce MOE's month-level
pro-ration**. The spec doc (`docs/payback-formula-spec.md`) uses the same
whole-year compounding convention for both NUS and MOE for implementability.
For the MOE side specifically, this is now a **known, confirmed
simplification/divergence from the real formula** (not an unresolved guess
about which convention MOE uses — we know which one it uses, and we know the
MVP doesn't replicate it exactly). Concretely: the MVP's MOE clawback figure
will be a whole-year approximation that, depending on which calendar month
the Course actually commenced in and which month disbursements were
"expended or incurred" in, could come out **slightly higher or lower** than
the real month-precise figure. See the spec doc's Assumptions section for
the precise framing of this as a known limitation.

### 3.2 What counts as "the Grant" (the LD base)

**Confirmed, Recital 2 / Clause 1(1)-(2):** "the Grant" = **Tuition Grant +
GST Subsidy**. The First Schedule's liquidated-damages base is explicitly
this combined figure, not the Tuition Grant alone.

**Confirmed, Clause 1(3):** the actual Grant amount for a given student is
separately published on MOE's Tuition Grant website for the prevailing
academic year — i.e. there is an official, per-cohort, per-year published
figure, distinct from whatever this calculator derives.

**Relationship to `data/tuition-fees.ts`:** that dataset's international
student fee columns (`ISAsean`, `ISOther`, `NonGrant`) are, per the source
PDF's own footnote, **GST-inclusive** for international-student rates (only
the SC/PR columns exclude GST, since MOE subsidises GST directly for those).
This means the existing subsidy-gap approximation used in the spec doc —
`NonGrant − ISOther` (or `NonGrant − ISAsean`) — **already implicitly
captures both the Tuition Grant and the GST Subsidy together as one combined
gap**, because both the subsidised and unsubsidised columns it's derived
from are themselves GST-inclusive. **No separate GST addition needs to be
layered on top of the existing subsidy-gap calculation** — doing so would
double count the GST component.

This remains **a derived approximation of the officially published Grant
figure, not the literal MOE-published number for that student's actual
cohort** (per Clause 1(3), that number is separately published per academic
year and hasn't been sourced directly here). Flagged as an approximation,
not a confirmed exact figure, in the spec doc's assumptions.

### 3.3 Treatment of reduced/suspended Grant periods

**Confirmed, First Schedule, para B:** "any period of reduction or suspension
of the Grant... shall be taken into account in calculating the 10% compound
interest." Not modelled in this MVP — consistent with the broader decision
not to model leave/suspension periods at all (Clause 2(1)(i)(ii)-(iii), see
section 1 above). Flagged as future work.

### 3.4 Additional recovery costs

**Confirmed, First Schedule, para C:** the Student and Sureties are also
liable for any additional costs incurred in recovering the liquidated
damages. This mirrors NUS's Fourth Schedule para (4) almost exactly. **Out of
scope for the MVP** — not quantifiable from either agreement's text (no
formula or rate given), same deferral rationale as the NUS side.

### 3.5 Cap

**Confirmed, High confidence: no dollar cap exists in the signed MOE
Tuition Grant Agreement.** The First Schedule (the schedule that sets out the
liquidated damages formula in full: paras A-D2) contains **no cap clause at
all** — in clear contrast to NUS's Fourth Schedule para (2), which explicitly
states dollar caps ($262,000 single-degree / $295,000 double-degree). This
upgrades the prior public-research finding (which was an absence-of-evidence,
medium-confidence guess) to a **confirmed absence, high confidence**, since
the actual signed agreement text has now been reviewed and contains no such
provision.

### 3.6 Pro-rata reduction for partial bond service

**Confirmed, First Schedule / Clause 3(4):** "The Government may at its sole
discretion... reduce the amount due under clause 3(1)(c) through (l) by the
same proportion as the number of the completed **months** worked bears to the
Bond Period."

Two things to note, both now confirmed rather than guessed:

1. **This is discretionary** ("may... at its sole discretion"), not an
   automatic entitlement — textually weaker than NUS's Fourth Schedule para
   (3), which is not phrased as discretionary ("the amount... **may be
   reduced**" appears in both, so read carefully: NUS's clause also uses
   "may," so both are, on a strict textual reading, framed as
   discretionary/permissive rather than mandatory. Treated as applying by
   default for calculator purposes in both cases, per the spec doc's
   assumptions — this is a modelling choice, not a guarantee of what MOE or
   NUS would actually do in a real case.)
2. **The granularity is MONTHS worked over the Bond Period, not days.** This
   differs from NUS's Fourth Schedule para (3), which uses "completed days
   served / total Bond Period." Since the calculator's MVP already collapses
   both sides to whole-year granularity (no calendar dates modelled at all),
   this month-vs-day distinction **does not change the algorithm** — both
   collapse to the same whole-year `servedFraction = B / bondYearsTotal`
   calculation in the spec doc. It's noted here for accuracy/completeness
   only.

**Confidence: High (confirmed from signed agreement)** for the existence and
month-based granularity of this mechanism. Confidence on whether it applies
automatically vs. requires the Government to exercise discretion: this is a
genuine textual ambiguity in the agreement itself ("may... at its sole
discretion"), not a research gap — flagged in the spec doc as a modelling
choice (assume it applies) rather than an unresolved fact-finding question.

### 3.7 Overdue-payment interest (First Schedule, paras D1-D2)

**Confirmed:** payment is due in one lump sum. If not paid within the
specified period:

- **D1:** overdue-payment interest accrues at **3-month compounded SORA
  (Singapore Overnight Rate Average) + 4.5 percentage points per annum**,
  from the due date until full payment.
- **D2:** the specific SORA reference date depends on when the due date
  falls: **1 April-30 September** of a calendar year → use SORA as at **1
  March** of that year; **1 October-31 March** (following year) → use SORA as
  at **1 September** of the first year.

**This is textually identical to NUS's Fourth Schedule paras (5)-(6)** (same
3-month compounded SORA + 4.5%, same 1 Apr-30 Sep / 1 Oct-31 Mar reference
windows — see `docs/policy-snt.md` section 5). This confirms the mechanism is
**standardized, whole-of-government boilerplate for overdue payment
interest**, shared verbatim across at least these two agreements, rather than
two independently-invented schemes that happen to coincide.

**Still out of scope for the MVP**, exactly as before: this mechanism only
applies after a formal demand for payment has gone unpaid past its due date.
The calculator answers "how much would I owe if I broke the bond today," not
"how much would I owe if I then also defaulted on the resulting demand." No
change to this deferral decision.

## 4. Relationship to the NUS SNT bond

Because the two bonds are concurrent (Handbook para 18) and the MOE Bond
Period (3 years, Clause 2(1)(i)) is shorter than the NUS bond (6 years), a
scholar who has already served **3 or more years** of the combined bond has,
per the Handbook's own framing, already fully discharged the MOE side.
Practically:

- If **bond years completed < 3**: both an NUS Liquidated Damages amount and
  an MOE clawback amount are potentially owed.
  Once "on bond" 3+ years, only the residual NUS obligation should be
  modelled as still outstanding, since MOE's own service obligation will
  have already been satisfied.

This is a design implication for the calculator, not a policy quote — see
`docs/payback-formula-spec.md` for how it's implemented.

## 5. Sources

**Primary (confirmed, signed agreement — supplied by product owner, personal
fields stripped):**
- MOE Tuition Grant Agreement (WEF AY2024) — Clause 1 (Recitals/definitions),
  Clause 2(1)(i) (Bond Period), Clause 3(1)-(4) (breach, discretionary
  relief, pro-rata reduction), First Schedule paras A-D2 (liquidated damages
  formula, Grant definition, additional costs, overdue-payment interest).
  Generic clause text only — no personal identifying information was
  supplied or is reproduced here.

**Secondary / public (retained from initial research pass, still useful for
context not covered by the supplied clauses):**
- [MOE — Tuition Grant Scheme (overview)](https://www.moe.gov.sg/financial-matters/tuition-grant-scheme) — official, public
- [MOE — Tuition Grant Scheme: Bond matters](https://www.moe.gov.sg/financial-matters/tuition-grant-scheme/bond-matters) — official, public
- [MOE — Tuition Grant Scheme: Liquidated damages](https://www.moe.gov.sg/financial-matters/tuition-grant-scheme/liquidated-damages) — official, public; consistent with, and now superseded in precision by, the signed-agreement text in section 3
- [Eclat Institute — "Breaking a scholarship bond in Singapore: what actually happens"](https://eclatinstitute.sg/blog/scholarships/Breaking-Scholarship-Bond-Singapore-What-Happens) — secondary/reputable blog; no longer needed as a pro-rata source now that Clause 3(4) is confirmed directly, retained only for general background
- MOE's own LD Estimator tool, referenced in search results: `go.gov.sg/grantsense` — not accessed directly in this research pass; still a good sanity-check tool for engineering, see section 6

## 6. Remaining recommended follow-ups

Most open questions from the initial research pass are now resolved by the
signed agreement text. What remains:

1. **Run the worked example through MOE's official LD Estimator**
   (`go.gov.sg/grantsense`) as an independent sanity check against the spec
   doc's hand calculation, since the calculator's whole-year approximation
   will not exactly match the Estimator's (presumably month-precise) output.
2. **Confirm the actual published Grant amount** for a real cohort/year via
   MOE's Tuition Grant website (per Clause 1(3)) if a more exact LD base
   figure is wanted than the `NonGrant − ISOther/ISAsean` derived
   approximation in `data/tuition-fees.ts`.
3. **Clause 3(2)'s discretionary relief** (illness/accident/extenuating
   circumstances) and **Clause 3(4)'s discretionary pro-rata reduction**
   ("may... at its sole discretion") both leave room for MOE to depart from
   the mechanical formula in an actual case. The calculator, by design,
   models the mechanical formula only and does not attempt to model
   discretionary outcomes — this is a product decision to confirm with the
   product owner, not an unresolved research question.
