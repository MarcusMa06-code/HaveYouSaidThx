# NUS S&T Scholarship (SNT) Bond & Payback Policy

Restatement of the NUS-side rules governing what an NUS Science & Technology (S&T)
Undergraduate Scholarship holder owes NUS if they break their scholarship bond.
Source: NUS Scholarship Agreement template (generic/boilerplate clauses, no
personal data) and the S&T Handbook. All clause references below point to the
Scholarship Agreement unless marked "Handbook".

This document restates NUS's side only. See `docs/policy-moe-tgs.md` for the
separate MOE Tuition Grant obligation, and `docs/payback-formula-spec.md` for
how the two combine into a single calculator formula.

---

## 1. Bond structure

The scholar has **two concurrent bonds** that both start "immediately upon
graduation":

| Bond | Owed to | Duration | Source |
|---|---|---|---|
| Tuition Grant bond | MOE | 3 years | Handbook para 18 |
| SNT scholarship bond | NUS | 6 years | Handbook para 14 |

Because the two run **concurrently**, not consecutively, the scholar's total
elapsed post-graduation bond obligation is **6 years, not 9** — the 3-year MOE
bond is fully satisfied 3 years into the 6-year NUS bond (Handbook para 18:
"the 3-year Tuition Grant bond will run concurrently with the 6-year
scholarship bond. Hence, scholars will be bonded for 6 years").

Both bonds begin "immediately upon graduation" (Handbook para 14), requiring
work "for a Singapore-based company" (para 14) / "in a Singapore-based
company" (para 18). Scholars must also "remain contactable and provide yearly
updates to OFA on their bond status" (Handbook para 14).

## 2. Programme (candidature) durations

Per Handbook para 4, the *nominal* programme duration — used later to
determine how many years of disbursements exist and how many compounding
periods have elapsed — is:

| Programme type | Semesters | Years |
|---|---|---|
| Bachelor degree | 6 | 3 |
| Bachelor with Honours | 8 | 4 |
| Local Double Degree Programme, single Honours | 9 | 4.5 |
| Local Double Degree Programme, double Honours | 10 | 5 |

## 3. When the Bond Period starts, and what counts toward discharging it

Per Clause 6:

- **6(a):** The Bond Period begins from the **first day of the SCHOLAR's
  Qualifying Employment** (i.e., not the graduation date itself, but the start
  of the qualifying job).
- **6(b):** Only periods of **Qualifying Employment** count toward discharging
  the Bond Period.
- **6(c)-(e):** The following do **NOT** count toward discharge: no-pay leave,
  half-pay leave, study leave, suspension, internship/training/study periods,
  and most overseas periods.

**Out of scope for this MVP:** the edge cases in 6(c)-(e) (leave, suspension,
overseas postings, etc.) are noted here for completeness but are not modelled.
Flagged as future work.

## 4. What NUS actually disburses (the Liquidated Damages base)

Per the Scholarship Agreement, **Third Schedule — Scholarship Benefits**, the
components that make up "all monies paid to and incurred on behalf of or for
the benefit of the SCHOLAR" are:

| Item | Clause | Nature | Amount given |
|---|---|---|---|
| (a) Outbound airfare (home country → Singapore, start of programme) | Third Schedule (a) | One-time | Not specified (actual cost) |
| (b) Return airfare (Singapore → home country, on completion, conditional) | Third Schedule (b) | One-time | Not specified (actual cost) |
| (c) Application fees, MOE-Tuition-Grant-subsidised tuition fees, other compulsory fees | Third Schedule (c) | Recurring (tuition) / one-time (application) | Not specified here — see `data/tuition-fees.ts` for the actual fee schedule used by the calculator |
| (d) Scholarship allowance | Third Schedule (d) | Recurring | S$6,000/year (S$500/month) |
| (e) Settling-in allowance | Third Schedule (e) | One-time | S$200 |
| (f) Accommodation allowance (lowest on-campus hostel room rate) | Third Schedule (f) | Recurring | S$5,408/year (AY2025/2026 figure given in Handbook; varies by year) |
| (g) Subsidised medical/insurance coverage | Third Schedule (g) | Recurring | Not specified (actual cost) |
| (h) Computer allowance | Third Schedule (h) | One-time | S$1,750 |
| (i) Any other approved fees/expenses | Third Schedule (i) | Variable | Not specified |

Note the phrasing in the Fourth Schedule para (1) is broader than just Third
Schedule items — it covers "all monies paid to and incurred on behalf of or
for the benefit of the SCHOLAR (including any monies not yet paid but which
has become legally payable by, or due from, the SPONSOR to any third party)".
The Third Schedule is the enumerated list of what those monies typically are;
it is not itself a separate cap or formula.

## 5. Liquidated Damages formula (Fourth Schedule)

**Fourth Schedule, para (1) — the core formula:**

> Liquidated Damages = (sum of all monies paid to and incurred on behalf of or
> for the benefit of the SCHOLAR, including monies not yet paid but legally
> payable/due, up to and including the date of termination of the Agreement)
> **+ interest at 10% per academic year or part thereof, without pro-ration,
> compounded at the end of every academic year, without pro-ration, regardless
> of the date such damages became payable.**

Key features of the interest mechanic, read literally from the clause text:

- Rate: **10% per academic year**.
- **"Or part thereof, without pro-ration"** — a partial academic year of
  accrual is still charged a full 10% for that year (no day-counting discount
  on the *rate* itself).
- Compounding happens **at the end of every academic year**, again "without
  pro-ration regardless of the date such damages became payable" — i.e. the
  compounding schedule doesn't shift to match when in the year the specific
  expense was actually incurred.
- The Scholar and Sureties are **jointly and severally liable**.

> **Confirmed via direct correspondence with NUS/MOE, 2026-07-04: compounding
> stops at graduation, not at the point of bond-break.** The clause text above
> ("up to and including the date of termination of the Agreement") reads,
> taken in isolation, as though interest could keep compounding all the way
> through the post-graduation bond-service period until the scholar actually
> buys out. The product owner asked NUS/MOE directly, and the official
> response was: "The compounding interest applies during studies and will
> stop upon completion of studies/graduation or withdrawal/termination of
> studies/scholarship/Tuition Grant. After graduation, if there is bond
> period served and scholar wishes to buy out the remaining bond(s), the
> liquidated damages will be reduced proportionately based on bond served."
> This confirms interest **freezes at graduation**; the post-graduation bond
> period only feeds the separate linear pro-rata reduction in para (3) below,
> never additional compounding. The earlier reading (continued accrual
> through the bond period) was a reasonable inference from the text alone,
> but is now known to be incorrect — see
> `docs/payback-formula-spec.md` section 2 and section 8 assumption #13 for
> the full correction history.

**Fourth Schedule, para (2) — the cap:**

> SGD 262,000 if the SCHOLAR is in a single-degree programme.
> SGD 295,000 if the SCHOLAR is in a double-degree programme.

This cap applies to the Liquidated Damages amount (i.e., principal + accrued
interest, per para 1), subject to Clause 9, under which NUS may unilaterally
raise the cap by written notice. The calculator should treat the cap as a
ceiling applied *after* the interest calculation in para (1), consistent with
para (3)'s ordering (see below).

**Fourth Schedule, para (3) — pro-rata reduction for partial bond service:**

> Notwithstanding anything in this Schedule, if the SCHOLAR has served any part
> of the Bond Period, the amount of Liquidated Damages payable may be reduced
> by the same proportion as obtained when the number of completed days served
> is divided by the total Bond Period.

Reduction factor = (days served) / (total Bond Period in days). This is
applied to the Liquidated Damages amount (post-cap, per the doc's ordering:
"notwithstanding anything in this Schedule" implies it can reduce even a
capped amount) — see `docs/payback-formula-spec.md` for the precise order of
operations the calculator uses, since this MVP works in whole years rather
than days.

**Fourth Schedule, para (4) — additional recovery costs:**

> The SCHOLAR is also liable for additional recovery costs (e.g. legal costs).

Not quantifiable from the source material given (no formula or rate
specified for legal/recovery costs) — noted as **out of scope for the MVP**.
The calculator should not attempt to estimate legal costs.

**Fourth Schedule, para (5)-(6) — overdue-payment interest (deferred, out of scope):**

After a formal demand for payment, unpaid amounts accrue additional interest
at **3-month compounded SORA (as at 1 March or 1 September, depending on the
due date) + 4.5 percentage points**, from the due date until paid. Partial
repayments are applied in order: principal first, then additional costs, then
interest.

**This entire mechanism is out of scope for the MVP.** It only applies after
a scholar has been formally demanded to pay and has defaulted on that demand
— it is a second, later penalty for non-payment, not part of answering "how
much would I owe if I broke the bond today." Noted here for completeness only.

## 6. Corroborating source (Generic Terms & Conditions doc)

A simpler, older statement of the same core LD mechanic, corroborating the
Fourth Schedule:

> "NUS reserves the right to demand full refund all monies disbursed to the
> Scholar under the Scholarship with 10% interest compounded at the end of
> every academic year without pro-ration regardless of the date such damages
> became payable."

This matches Fourth Schedule para (1)'s rate and compounding convention and is
treated as confirming, not adding to, the formula above.

## 7. Summary table — what's in scope for the MVP vs. deferred

| Rule | Clause | In MVP? |
|---|---|---|
| 6-year total bond (concurrent 3-yr MOE + 6-yr NUS) | Handbook paras 14, 18 | Yes |
| Programme duration → nominal years | Handbook para 4 | Yes |
| Bond Period starts at first day of Qualifying Employment | Clause 6(a) | Simplified — MVP assumes bond starts at graduation (see spec doc) |
| Only Qualifying Employment discharges the bond | Clause 6(b) | Yes (implicitly, via the "bond years completed" slider) |
| Leave/suspension/overseas periods don't count | Clause 6(c)-(e) | **No — deferred, future work** |
| LD = disbursements + 10%/yr compounded | Fourth Schedule (1) | Yes |
| LD cap: $262k single-degree / $295k double-degree | Fourth Schedule (2) | Yes |
| Cap unilaterally raisable by NUS (Clause 9) | Fourth Schedule (2), Clause 9 | Noted, not modelled (assume static cap) |
| Pro-rata reduction for partial bond service | Fourth Schedule (3) | Yes (adapted to whole-year granularity) |
| Additional recovery/legal costs | Fourth Schedule (4) | **No — deferred, future work** (not quantifiable) |
| Overdue-payment interest (SORA + 4.5%) | Fourth Schedule (5)-(6) | **No — explicitly deferred, out of scope** |
