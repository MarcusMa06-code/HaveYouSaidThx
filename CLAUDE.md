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
- `docs/tuition-fees-source.md` — the source document, edition, column
  definitions, and major-to-fee-category scope backing `data/tuition-fees.ts`.
  Consult this before touching the fee dataset or the major list.
- `data/tuition-fees.ts` — hand-maintained tuition fee + allowance dataset
  (`TUITION_FEES`, `ST_SCHOLARSHIP_ALLOWANCES`), keyed by admission cohort /
  fee category / fee tier. Must be manually re-verified whenever NUS
  republishes its tuition fee schedule (see the file's own header comment).
- `src/calc/payback.ts` — implements `docs/payback-formula-spec.md` sections
  4-7 exactly. If a number looks wrong, fix the spec doc's interpretation of
  the legal source material first, then update this file to match — don't
  patch the code in a way that silently diverges from the spec.
- `src/calc/payback.test.ts` — the one regression test, pinned to the spec's
  worked example (section 7) and its B=6 sanity check, plus the
  semester-granularity early-graduation cases (S=7 partial-semester, S=9
  double-degree-exact).
- `src/calc/majors.ts` — the major -> fee-category mapping (`MAJOR_GROUPS`)
  backing the "select your major" dropdown. Source of truth is
  `docs/tuition-fees-source.md`'s scope section; do not add majors/faculties
  not listed as S&T-eligible there.

## Current scope notes (keep in sync with `docs/payback-formula-spec.md`)

- **Degree types**: only `BachelorHonours`, `DoubleDegreeSingleHonours`, and
  `DoubleDegreeDoubleHonours` are modelled. Non-Honours "Bachelor" (Pass,
  3-year) was fully removed — it's a fallback classification outcome for
  under-performing students, not a programme anyone enrolls into, so it was
  deleted from the `DegreeType` union, not just hidden in the UI.
- **Degree type is currently hardcoded to `BachelorHonours` in the UI —
  deferred, not abandoned.** The "Degree type" selector was removed from
  `src/App.tsx` because the "Major / programme" dropdown only offers
  single-major programmes, so nobody using it can also meaningfully claim a
  Double Degree Programme (that needs a second-major picker, which doesn't
  exist yet). `DegreeType`, the `NOMINAL_SEMESTERS`/`NOMINAL_DURATION`
  entries and cap-amount branching for `DoubleDegreeSingleHonours` /
  `DoubleDegreeDoubleHonours`, and `isDoubleDegree()` all stay intact in
  `src/calc/payback.ts` — unreachable from the UI today, but kept ready for
  when Double Degree support is properly built (once a second-major picker
  exists). Unlike the ASEAN decision below, this is explicit future work,
  not a permanent removal.
- **ASEAN nationality tier: permanently out of scope, not deferred.** The
  product owner has ruled against ever supporting ASEAN-passport students in
  this calculator. There is no `FeeTier` type, no `ISAsean` field, and no
  disabled/hidden UI option for it — the calculator only ever computes the
  `ISOther` rate, inlined directly at the lookup sites. A separate "ASEAN
  Undergraduate Scholarship calculator mode" (a different scholarship
  program from S&T) was also considered and ruled out: it likely doesn't
  carry NUS's own separate service bond the way S&T does, so there'd be
  nothing distinctive for such a mode to compute. Nothing was ever built for
  it. Do not reintroduce an ASEAN fee tier or reference ASEAN Scholarship as
  future scope — if NUS policy changes make this relevant again, that's a
  new product decision, not a resumption of old work.
- **Study duration is semester-granular**, not a fixed per-degree constant.
  `CalculatorInputs.semestersCompleted` (`S`) replaces the old fixed
  `disbursementYears(degree)` lookup; `D = ceil(S / 2)` derives the
  disbursement-year count, with the final year's recurring amounts (tuition,
  living, accommodation) halved when `S` is odd. See
  `docs/payback-formula-spec.md` sections 1-2 for the full derivation.
- **No "payback trajectory over the bond" chart.** It was removed once the
  interest-freeze fix made the takeaway close enough to "taking S&T is
  usually still a good deal" that the comparison chart wasn't worth keeping.
  The marginal-savings-per-bond-year chart (a clean two-tier step, since
  interest freezes at graduation) is the only chart left; keep its dev/audit
  "breakdown" statement view and `calculatePayback` itself untouched by that
  removal.

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
