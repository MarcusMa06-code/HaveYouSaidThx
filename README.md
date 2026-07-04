# HaveYouSaidThx

A calculator for NUS Science & Technology (S&T/SNT) Undergraduate Scholarship
holders: estimates how much you'd owe NUS and MOE if you broke your
scholarship bond (liquidated damages / bond buy-out).

Client-side only — no backend, no database, no data leaves your browser. See
`CLAUDE.md` for the domain glossary and where the formula spec/data live.

## Running locally

```bash
npm install
npm run dev
```

Then open the printed local URL (typically http://localhost:5173).

## Running the test

```bash
npm test
```

This runs the one regression test (`src/calc/payback.test.ts`), which pins
the calculation to the worked example in
`docs/payback-formula-spec.md` section 7.

## Disclaimer

This tool is an unofficial estimate based on publicly available policy
documents, not a signed scholarship or Tuition Grant agreement. See the
in-app disclaimer and `docs/payback-formula-spec.md` section 8 for the
assumptions behind the numbers.
