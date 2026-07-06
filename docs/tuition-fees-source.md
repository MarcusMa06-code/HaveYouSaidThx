# Tuition Fee Data — Source & Scope

## Source document

- **Document**: NUS "Tuition Fees Per Annum" schedule, file `ugtuitioncurrent.pdf`.
- **Edition**: March 2026 edition, applicable to AY2026/2027.
- **Figures verified by**: product owner, transcribed directly from the official schedule (not re-derived).
- **Allowance figures** (living/accommodation/computer/settling-in): S&T Handbook, August 2025 edition.

All fee figures are S$ per annum, covering Semesters 1 and 2 together. NUS uses a
**cohort-based fee system**: a student's tuition fee is locked to the rate published
for their *admission year* and stays at that rate for their entire candidature — it
does not change if fees are revised in a later year for new intakes.

## Column definitions

| Column | Meaning |
|---|---|
| SC | Singapore Citizen |
| PR | Singapore Permanent Resident |
| IS-Other | International Student, other nationality, in receipt of the MOE Tuition Grant |
| Non-Grant | International Student fee if NOT in receipt of the MOE Tuition Grant (full unsubsidised rate, inclusive of 9% GST). SC/PR figures exclude GST since MOE subsidises it directly. |

Note: the source PDF also publishes an IS-ASEAN column (International
Student, ASEAN-member-state passport). It is deliberately **not** carried
into `data/tuition-fees.ts` — the product owner has permanently ruled ASEAN-
passport students out of scope for this calculator (not deferred, not a
future toggle). See project history for the reasoning.

## Scope: which fee category applies to which programme

The S&T (Science & Technology Undergraduate Scholarship) Handbook restricts
eligibility to a specific list of programmes. Data is only maintained for the
3 fee categories that cover S&T-eligible majors:

### 1. Computing
Maps to **School of Computing** majors:
- Artificial Intelligence
- Business Analytics
- Business Artificial Intelligence Systems
- Computer Science
- Information Security

### 2. Design and Engineering (Engineering majors only)
Maps to **Faculty of Engineering** majors, plus the School of Computing/CDE joint
Computer Engineering major:
- Biomedical Engineering
- Chemical Engineering
- Civil Engineering
- Computer Engineering (School of Computing + College of Design and Engineering)
- Electrical Engineering
- Environmental & Sustainability Engineering
- Industrial & Systems Engineering
- Materials Science Engineering
- Mechanical Engineering
- Engineering Science
- Robotics & Machine Intelligence

**Important exclusion**: NUS's "Design and Engineering" fee schedule band also
covers **Built Environment** and **Architecture / Landscape Architecture**
programmes under the same College of Design and Engineering. Those are **NOT**
part of the S&T Handbook's eligible-programme list and are **excluded** from
this dataset and from the calculator entirely, even though they share the same
tuition fee category/rate at NUS.

### 3. Humanities and Sciences (Science majors only)
Maps to **College of Humanities and Sciences** majors:
- Chemistry
- Data Science and Analytics
- Data Science and Economics
- Food Science and Technology
- Life Sciences
- Mathematics
- Pharmaceutical Science
- Physics
- Quantitative Finance
- Statistics

**Important exclusion**: The College of Humanities and Sciences also offers
**Environmental Studies** and **Pharmacy**, which appear under the same college
and may share fee bands, but are **NOT** covered by the S&T scholarship per the
Handbook's eligible-programme list, and are therefore **excluded** from this
dataset.

## For the engineering/UI workstream

The major lists above (Computing / Design and Engineering / Humanities and
Sciences) are the authoritative source for the calculator's **"select your
major" dropdown**. Each major should map to exactly one of the 3
`FeeCategory` values in `data/tuition-fees.ts`. Do not add Built Environment,
Architecture, Landscape Architecture, Environmental Studies, or Pharmacy to
that dropdown — they are not S&T-eligible even though NUS may bill them at
the same or similar rates as an adjacent category.

## Allowances (for payback calculation, not tuition)

Per the S&T Handbook (August 2025 edition), current annual disbursements to
S&T scholars:

| Allowance | Amount (S$) | Frequency |
|---|---|---|
| Living allowance | 6,000 | per year |
| Accommodation allowance | 5,408 | per year |
| Computer allowance | 1,750 | one-time |
| Settling-in allowance | 200 | one-time |

These are stored in `ST_SCHOLARSHIP_ALLOWANCES` in `data/tuition-fees.ts`,
adjacent to the fee table since both feed into the scholarship payback
calculation (out of scope for this workstream — no calculation logic is
implemented here).

## Maintenance note

**This table must be manually re-verified and updated whenever NUS
republishes `ugtuitioncurrent.pdf`** — historically an annual update, each
March, ahead of the new admission cycle. There is no scraping or automated
fetching of this data by design; a human must cross-check the new PDF against
`data/tuition-fees.ts` and append a new `AdmissionCohort` entry (existing
cohorts' figures do not change, per the cohort-based fee system). The S&T
Handbook's eligible-programme list should also be re-checked at the same time
in case NUS adds, renames, or removes majors/programmes.
