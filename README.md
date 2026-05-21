# Halcyon SENTINEL — Onboarding risk-assessment prototype

A fullstack engineering assessment submission. Single-page web application for client onboarding risk assessment at a UK wealth management firm.

> **Read the approach document first:** [`APPROACH.md`](APPROACH.md). It covers problem understanding, stakeholder questions, technical approach, assumptions, AI process, and how I verified the build works. It also contains a beat-by-beat demo plan for the 10-minute interview call.

## Run it locally

```sh
cd app
npm install
npm run dev
```

Open `http://localhost:5173` at **1024×768** (iPad-landscape, the brief's target viewport).

## Run the tests

```sh
cd app
npx vitest --run
```

Expected: **153 tests passing across 12 files** in ~1.2 s. Includes a `requirements-coverage.test.ts` suite where every test title cites an R-ID from the acceptance criteria.

## Typecheck

```sh
cd app
npx tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0
```

## What's in this repo

| Path | Purpose |
|---|---|
| [`APPROACH.md`](APPROACH.md) | **Headline deliverable.** Approach + AI process + quality + demo plan. |
| [`app/`](app/) | The prototype — React 18, TypeScript, Vite, Tailwind v4, Radix UI. |
| [`app/README.md`](app/README.md) | App-specific run instructions and stack notes. |
| [`client_onboarding.csv`](client_onboarding.csv) | The seed data the brief provided (46 records, 4 branches). |
| [`sentinel-v2-problem-statement.md`](sentinel-v2-problem-statement.md) | The original brief, kept for reference. |

## Architectural shape (one paragraph)

Clean hexagonal layout. The `domain/` folder is pure TypeScript with zero framework imports — types, rules-as-data, the rules engine, the findings detector, and validation all live there. The `adapters/` folder implements ports defined in the domain (`RecordStore`, `RecordSource`, `Clock`, `IdGenerator`, `RulesSource`). The `application/` folder orchestrates (`AssessmentService`, `FindingsService`, `ImportService`). The `ui/` folder is React, talking to ports via a `ServicesProvider` context — no component ever imports an adapter directly. `main.tsx` is the only place adapters meet ports. Adding a real backend tomorrow is a new `HttpRecordStore` and one line in `main.tsx`; the domain is untouched.

## What the prototype demonstrates

- **Rules engine** that derives the risk classification from the data (the RM cannot type it). Returns every fired rule, not just the winning tier — defensibility from the data alone.
- **Findings detector** that surfaces the 10 records in the seed CSV that violate the firm's own rules: 3 classification mismatches (the planted "PEP as LOW = material compliance failure" test from the brief), 1 workflow violation (HIGH approved without EDD), 6 missing-field findings.
- **Intake form** with constrained inputs, live verdict pane, and HIGH+APPROVED blocked at submit.
- **Bulk CSV import** with row-level validation and a preview-before-commit flow.
- **Compliance-grade remediation** — workflow-state updates create append-only audit log entries; re-assessment creates a superseding record with a back-pointer, leaving the original immutable as the FCA "exact data at the time" rule requires.

See `APPROACH.md` §4 for the full breakdown of what shipped and what was deliberately deferred.

## Submission notes

- Built in a single session using Claude Code as the AI assistant. Process documented in `APPROACH.md` §7.
- The CSV in `app/public/client_onboarding.csv` is a copy of the root-level `client_onboarding.csv` — Vite serves it as a static asset for the SPA to fetch on first paint.
- Stack choice rationale and architecture trade-offs are in `APPROACH.md` §4.
