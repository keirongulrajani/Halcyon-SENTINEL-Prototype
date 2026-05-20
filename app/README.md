# Halcyon SENTINEL — Onboarding prototype

A single-page web application prototype for client onboarding risk assessment at a UK wealth management firm. Built as a fullstack engineering assessment.

> The headline submission lives at [`../APPROACH.md`](../APPROACH.md) in the repo root. The instructions below assume your terminal is already in the `app/` directory.

## What it does

Loads 46 onboarding records from `client_onboarding.csv` on first paint, then lets a relationship manager log new client assessments on a tablet. The system derives the regulatory risk classification from the data using a pure rules engine — the RM cannot enter or override the tier. Records that violate the firm's own rules (classification mismatches, workflow violations, missing required fields) surface on a dedicated Findings page for the internal auditor.

## Run it locally

```sh
npm install
npm run dev
```

The dev server prints a local URL (typically `http://localhost:5173`). Open it in a browser at **1024×768** — the primary target viewport is iPad landscape.

## Run the tests

```sh
npx vitest --run
```

153 tests across 12 files, ~1.2 s. Coverage includes:

- The rules engine for every classification rule and every boundary case (income threshold at 500,000, source-of-funds list)
- The findings detector against all 46 CSV rows, verifying every one of the 10 planted findings is caught and the legitimate edge cases (MEDIUM-with-EDD, income exactly at 500,000) are not flagged
- Draft validation including the HIGH-cannot-be-APPROVED workflow rule
- Workflow-state amendments + supersede flows

## Type-checking

```sh
npx tsc --noEmit -p tsconfig.app.json --ignoreDeprecations 6.0
```

## Production build

```sh
npm run build
npm run preview
```

## Project layout

```text
src/
├── domain/         pure types, rules, classification, findings, validation
│                   (zero framework imports; runs anywhere)
├── adapters/       concrete implementations of the domain's ports
│                   (CSV source, localStorage record store, system clock, ID generators)
├── application/    orchestration services (AssessmentService, FindingsService)
│                   (depend on ports only; framework-free)
├── ui/             React components, pages, hooks, providers
│                   (services injected at the root via React context)
├── config/         country list, relationship-manager list
└── main.tsx        composition root — the only place adapters meet ports
```

Read the approach document at [`../docs/approach.md`](../docs/approach.md) for the full design rationale.

## Stack

- React 18 + TypeScript 5 + Vite 9
- Tailwind CSS v4 (CSS-based config; `@theme` block in `src/index.css`)
- Radix UI primitives (own components built over Radix for brand fidelity)
- Vitest + Testing Library for unit tests
- `class-variance-authority`, `clsx`, `tailwind-merge` for variant management
- `lucide-react` for icons

No backend, no external services. The CSV is served from `public/` and seeded into a localStorage-backed record store on first load. After that, the store is the source of truth — new records persist across reloads.

## What is intentionally out of scope

- Real authentication / RBAC (mocked relationship-manager identity in the header)
- Real backend sync (`localStorage` is the swappable seam — see `RecordStore` port in `src/domain/ports.ts`)
- Live PEP / sanctions screening (RM enters booleans manually)
- Approver UI for HIGH-risk senior compliance sign-off (workflow state modelled, UI deferred)

Each has a clear architectural seam in the code so the production version slots in without touching domain code. See the approach document and the supporting `docs/spec/` and `docs/analysis/` files for the full discussion.
