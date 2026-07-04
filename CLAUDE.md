# HaveYouSaidThx

A client-side calculator that tells NUS Science & Technology (S&T/SNT)
Undergraduate Scholarship holders roughly how much they'd owe NUS and MOE if
they broke their scholarship bond ("liquidated damages" / bond buy-out).

No backend, no database — everything is a pure calculation over a hardcoded,
manually-maintained fee dataset, run entirely in the browser.

## Domain glossary

- **S&T / SNT Scholarship**: NUS's Science & Technology Undergraduate
  Scholarship. Covers tuition, allowances, and requires the recipient to work
  for a Singapore-based company for a period after graduation (the "bond").
- **MOE Tuition Grant (TG)**: a separate subsidy from Singapore's Ministry of
  Education that reduces an international student's tuition to the
  subsidised rate. Comes with its own, separate service bond to MOE.
- **Bond**: the post-graduation service obligation. S&T scholars carry *two*
  concurrent bonds — 6 years to NUS, 3 years to MOE — which run at the same
  time, not back-to-back, so the combined obligation is 6 years, not 9.
- **Liquidated Damages (LD)**: the contractually pre-agreed payback amount if
  the bond is broken — NUS's version (Scholarship Agreement Fourth Schedule)
  and MOE's version (Tuition Grant Agreement) are calculated separately and
  summed.
- **Cohort-based fee system**: a student's tuition fee is locked to the rate
  published for their admission year (their "cohort," e.g. AY2025/2026) for
  their entire candidature, even if NUS revises fees in later years for new
  intakes.

## Where things live

- `docs/policy-snt.md` — NUS-side bond/payback rules (Scholarship Agreement +
  Handbook), restated in plain terms.
- `docs/policy-moe-tgs.md` — MOE-side Tuition Grant bond/clawback rules.
- `docs/payback-formula-spec.md` — the single combined algorithm spec both
  policy docs feed into. **This is ground truth for the calculation code.**
  Sections 4-7 define the exact formulas, worked example, and expected
  numbers; section 8 lists every judgment call made where the source material
  was silent or ambiguous.
- `data/tuition-fees.ts` — hand-maintained tuition fee + allowance dataset
  (`TUITION_FEES`, `ST_SCHOLARSHIP_ALLOWANCES`), keyed by admission cohort /
  fee category / fee tier. Must be manually re-verified whenever NUS
  republishes its tuition fee schedule (see the file's own header comment).
- `src/calc/payback.ts` — implements `docs/payback-formula-spec.md` sections
  4-7 exactly. If a number looks wrong, fix the spec doc's interpretation of
  the legal source material first, then update this file to match — don't
  patch the code in a way that silently diverges from the spec.
- `src/calc/payback.test.ts` — the one regression test, pinned to the spec's
  worked example (section 7) and its B=6 sanity check.

The MOE-side calculation (`moeClawback` in `src/calc/payback.ts`) is kept in
its own function, separate from the NUS calculation, so it stays easy to
isolate and update independently of the NUS side. Its formula is confirmed
against a signed MOE Tuition Grant Agreement (see `docs/policy-moe-tgs.md`
section 3) — the one confirmed simplification is that the real agreement
pro-rates interest to the calendar month a course commenced, while this
calculator is deliberately calendar-date-free and uses whole-year compounding
for both NUS and MOE (see `docs/payback-formula-spec.md` section 5 and
assumption #9).

## Important: no personal data in this repository

**Never commit any personal or identifying scholarship documents, names,
passport numbers, or signed-contract scans to this repository.** The
`docs/*.md` files here are deliberately written as generic, anonymized policy
summaries derived from public/template material — not transcriptions of any
individual's paperwork — and that must stay true for all future
contributions. If you are adding or updating a policy doc, restate the rule
in your own words from public source material; do not paste excerpts from a
real, personally-issued agreement.
