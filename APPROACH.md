# SENTINEL — Approach document

**Candidate:** Keiron Gulrajani
**Role:** Fullstack Software Engineering assessment
**Submission:** 2026-05-20

---

> **Three-sentence summary.** The brief is a planted test. The compliance reference points directly at row 5 of the CSV ("A record showing a Politically Exposed Person classified as LOW risk is not a minor discrepancy — it is a material compliance failure" — CLT-005 is exactly that). The prototype surfaces it, plus eight other records that violate the firm's own rules, on first paint.

**How to run:** `cd app && npm install && npm run dev`, then open `http://localhost:5173` at 1024×768. **Tests:** `cd app && npx vitest --run` → 153 passing.

---

## 1. Understanding the problem and its key tensions

A UK wealth-management firm needs to replace paper + spreadsheet onboarding with something that produces a defensible regulatory record at the point of intake. The brief has three personas with directly quoted requirements; each one is load-bearing.

| Persona | Job | What it forces in the build |
|---|---|---|
| **RM (Canary Wharf)** | Log an assessment between client meetings, under a minute | A three-section form on tablet with constrained inputs (no free text where an enum exists). Transcription errors are the cause of compliance findings; design them out. |
| **Head of Compliance** | Every classification must be defensible from the recorded data alone | The system computes the tier. The RM cannot type it. Records carry every fired rule, not just the verdict. Stored verdicts are immutable point-in-time snapshots with a `rulesVersion`. |
| **Internal Auditor** | Quarterly review with no manual reconciliation; missing fields are findings | Hard validation gates at submission. Existing CSV rows that violate the rules surface as findings, with rule violated + recommended action, not as silent errors. |

These produce four tensions the design has to resolve:

| Tension | Resolution |
|---|---|
| **Speed vs defensibility** — RM wants <60s; Compliance wants every record audit-ready | Rules engine derives the classification. RM never types a risk tier. Verdict pane updates live as fields are filled so the RM sees the reasoning emerge. |
| **Frontend prototype vs production architecture** — CTO said "don't worry about backend" but also "tell me how you'd architect this for 15 branches" | Clean hexagonal layering. Domain is pure TypeScript with no framework imports. Persistence sits behind a `RecordStore` port — today's adapter is `localStorage`, tomorrow's is HTTP. No domain code changes. |
| **CSV is dirty (the brief says so in bold)** | The dirty data is the point. 9 of 46 records (≈20%) violate the firm's own rules. The Findings page enumerates them with rule + detail + recommended action. |
| **Point-in-time records vs evolving rules** | Stored records are immutable. Each carries the `rulesVersion` used to produce its verdict. Record Detail offers a "Re-evaluate against current rules" affordance that shows the diff *without* overwriting history. |

The single strongest constraint in the brief — and the one I anchored the design on — is the Head of Compliance line:

> *"The system should be computing the risk tier from the regulatory criteria, not relying on the RM to remember which flags matter."*

In the build, **the classification field does not exist on the intake form**. It is derived, displayed in a sticky verdict pane, and stored as a sealed artefact alongside the raw inputs that produced it.

---

## 2. What I found in the data

The CSV is "not clean" in bold in the brief. I ran every row through the rules in section 4 of the brief and the firm's own workflow rules. Of the 46 records, **9 are in violation**. Each finding is surfaced on first paint by the prototype, grouped by severity, with a rule and a recommended action.

### Classification mismatches (3 — the "material compliance failure" planted test)

| Record | Data | Stored | Expected | Why |
|---|---|---|---|---|
| **CLT-005** Marcus O'Brien (Mayfair) | `pep_status=TRUE` | LOW, APPROVED | HIGH | The textbook material failure quoted in the brief. A PEP approved without EDD. |
| **CLT-017** Simon Hussain (Mayfair) | Russia + `pep_status=TRUE` | LOW, APPROVED | HIGH | Two independent HIGH triggers. Worse than CLT-005. |
| **CLT-031** Laura Lambert (Manchester) | China + `adverse_media_flag=TRUE` | LOW, APPROVED | HIGH | Adverse media triggers HIGH. China is also a MEDIUM trigger. Two independent reasons this should not be LOW. |

### Workflow violations (1)

| Record | Issue |
|---|---|
| **CLT-023** William Al-Rashid (Manchester) | Correctly HIGH (Venezuela), but `kyc_status=APPROVED` with empty `id_verification_date`. HIGH cannot be APPROVED without EDD + senior sign-off. This record bypassed both. |

### Missing required fields (5)

| Record | Missing |
|---|---|
| CLT-012, CLT-027, CLT-042 | `relationship_manager` — unauditable. The Auditor's "who assessed which client" question has no answer. |
| CLT-009, CLT-031, CLT-039 | `id_verification_date` empty for `APPROVED` record. APPROVED requires verified identity. |

**A demo that loads the CSV and doesn't surface these is functionally invisible to the auditor persona.** Catching them is the assessment.

---

## 3. Questions I would ask the stakeholders

Six places where I made an assumption that a real stakeholder conversation would have decided. Each one is a real product call.

| For | Question | What I'd do with the answer |
|---|---|---|
| Head of Compliance | When the rules change (e.g. FCA adds a country to the sanctioned list), do existing records keep their original verdict, or re-classify under the new rules? | Today I keep the original verdict and surface the diff. The opposite policy would re-derive on read. |
| Head of Compliance | Who is a "senior compliance officer" for HIGH-risk sign-off? Role, named individual, or per-branch? | Drives the approver workflow. I've modelled an `approvedBy` field but not built the UI. |
| Internal Auditor | If a HIGH record is *correctly* classified HIGH but missing optional documentation, is that a finding or a workflow state? | Today the workflow state (`kyc_status`) is the answer. If it's also a finding, the detector grows. |
| RM (Canary Wharf) | Do you ever amend an assessment after submission (e.g. client gave wrong info at intake), and how does that interact with the audit trail? | Drives whether records are append-only with `supersedes` pointers or mutable with a change log. I went append-only (see §4). |
| CTO | At 15 branches, is branch-level isolation a regulatory requirement (RMs only see their branch), or operational only? | Drives whether branch is a tenancy boundary or a filter. I made it a first-class field so either is supportable. |
| CTO | Will PEP/sanctions feeds eventually integrate live (HMT/OFSI, WorldCheck)? | Drives the boundary of the rules engine. Today the RM enters booleans; the adapter pattern allows a screening service to populate them automatically. |

---

## 4. Technical approach — what I built, what I deferred, why

### Stack

React 18 + TypeScript + Vite + Tailwind CSS v4 + Radix UI primitives. Vitest + Testing Library.

I chose Radix-with-own-components over a packaged library because the brand spec is specific (exact hex codes, Inter weights per element, 8px radius, exact shadow). Owning the primitives means we hit those targets exactly and I can point at every component in the debrief without "well, that's what the library does".

### Architecture — clean / hexagonal

```text
src/
├── domain/         pure TypeScript, zero framework imports
│   ├── types               (entities, all readonly)
│   ├── result              (Result<T, E> for validation)
│   ├── risk-tier           (tier ordering, highestTierOf)
│   ├── rules               (rules as DATA, not code, with version stamp)
│   ├── rules-engine        (classify, pure function)
│   ├── findings            (detectFindings, pure function)
│   ├── validation          (validateDraft, returns Result)
│   └── ports               (interfaces: Clock, IdGenerator, RecordStore, RecordSource, RulesSource)
├── adapters/       concrete implementations of ports
├── application/    orchestration (AssessmentService, FindingsService, ImportService)
├── ui/             React; talks only to ports via context (DI)
├── config/         lists (countries, RMs), brand tokens
└── main.tsx        composition root — the ONLY place adapters meet ports
```

This shape is the answer to the CTO's "how would you architect this properly" question. Three properties follow from it directly:

1. **Rules are data.** Swapping `DEFAULT_RULES` for a `rules.json` fetched at runtime requires zero domain changes. The `RulesSource` port exists for exactly that. Adding a new HIGH-risk country is a one-line edit to one data structure — no rebuild.
2. **Persistence is replaceable.** `RecordStore` has a `LocalStorageRecordStore` adapter today. An `HttpRecordStore` slots in tomorrow. UI doesn't know which it's talking to.
3. **Domain has no framework imports.** It would run unchanged in Node, Deno, or a Web Worker. That's the seam that lets the same classification code run on server and client when offline-first lands.

### What I built

The brief is explicit: *"a working prototype covering 60% of the problem well is better than a polished demo covering 20%"*. The 60%:

- **Pure rules engine** with all 7 predicates from the brief, returning every fired rule (not just the winning tier).
- **Findings detector** covering 4 finding types: classification mismatch, workflow violation, missing RM, missing ID-verification for APPROVED.
- **Intake form** with constrained inputs (typeahead country list, enumerated source-of-funds, RM dropdown), live verdict pane, validation gates, HIGH+APPROVED blocked at submit.
- **Records list** with branch / tier / KYC / has-findings filters, finding chips that expand inline to show rule + detail + recommended action.
- **Findings page** in audit-memo style, grouped by severity.
- **Record detail** with raw data, derived verdict, fired rules listed verbatim, "Re-evaluate against current rules" diff button.
- **Dashboard** with four clickable KPI tiles, each deep-linking to the appropriate filtered view, plus a per-branch breakdown with linkable rows.
- **Bulk CSV import** — file picker (or paste) → preview (valid / duplicates / failures with row-level reasons) → confirm. Loading states with spinners for both read and parse stages.
- **Compliance-grade remediation** — two paths that respect the immutability constraint:
  - **Update workflow state** — patches `kycStatus` / `idVerificationDate` / `documentationComplete` or backfills `relationshipManager`. Required reason. Each change appends an immutable `AmendmentEntry` to the record's append-only audit log with actor + timestamp + per-field diff.
  - **Re-assess this client** — opens intake pre-filled with required reason. Creates a new record with `supersedes: <originalId>`; the original is marked `supersededBy: <newId>` and rendered read-only with a banner pointing forward. Findings on superseded records are filtered out of the audit view so the auditor sees current state.
- **153 unit + integration tests** in 12 files. Every R-ID from the requirements checklist is exercised. CSV is the test fixture for the rules engine, so a change to the data tells us within seconds which records moved from clean to dirty.

### What I deferred (with reasoning)

| Deferred | Why | What it would take |
|---|---|---|
| Real authentication / RBAC | Out of scope for a frontend prototype | Auth provider + JWT + per-branch RBAC at the service layer |
| Real backend | CTO said "don't worry about backend" | `HttpRecordStore` adapter implementing the `RecordStore` port — no domain change |
| Approver UI for HIGH sign-off | Workflow state is modelled (`approvedBy`/`approvedAt`); UI is the gap | Senior-compliance role + sign-off action on Record Detail |
| IndexedDB offline queue | Same `RecordStore` interface; current adapter is sync localStorage | Implement `IdbRecordStore` with sync queue + `syncedAt` field |
| Live PEP / sanctions screening | RM enters booleans today | Adapter against WorldCheck / Refinitiv populates booleans before classification |

Each one has a clear architectural seam in the code so the production version slots in without touching domain code.

---

## 5. Assumptions

These are decisions I made without a stakeholder to consult. Calling them out explicitly so each one is on the table for discussion.

1. **The CSV is seed data, not source of truth.** On first paint the CSV is parsed and seeded into the localStorage store. After that, the store is the source of truth. New records, amendments, and supersedes persist across reload.
2. **Records are immutable point-in-time snapshots.** Re-derivation on read would lose the FCA-required "exact data at the time" record. Corrections create a new record with a `supersedes` pointer.
3. **`id_verification_date` is conditionally required** — for `APPROVED` records only. Legitimately empty for `PENDING` and `REJECTED`. The validation rule is conditional, not blanket.
4. **The income MEDIUM rule is one compound rule, not two triggers.** `annual_income > 500_000 AND source_of_funds ∈ {Inheritance, Gift, Other}`. Strict greater-than — exactly 500,000 does not trigger. CLT-007 and CLT-011 are exactly at 500,000 and correctly do NOT trigger this rule (they're MEDIUM by the ENTITY rule).
5. **HIGH and MEDIUM country lists do not overlap.** The engine applies HIGH first regardless, for defensibility of the audit explanation.
6. **MEDIUM records may legitimately sit in `ENHANCED_DUE_DILIGENCE`** at the compliance officer's discretion (per the brief). CLT-025 and CLT-037 are MEDIUM+EDD and **not** flagged as findings — they pass the false-positive guards in the test suite.
7. **The `relationship_manager` field is required at intake.** A record with no RM is unauditable. The auditor's quote *"who assessed which client"* is non-negotiable.

---

## 6. Architecture answers ready for the debrief

The brief asks four architectural questions explicitly. Each one has a defensible short answer that maps to code shape:

**Offline operation.** Intake writes to IndexedDB first with a sync queue. A `syncedAt` field drives a "pending sync" badge. When connectivity returns, the queue posts to the backend with client-generated UUIDs as idempotency keys so retries don't duplicate. The rules engine runs locally — classification doesn't need a round-trip. *(Today's prototype uses sync localStorage; the `RecordStore` interface is the swap point.)*

**Regulatory change without redeploy.** Rules are data, loaded as a `RuleSet` with a `version`. The compliance team edits a rules document via an admin UI in production; the engine reads the new version. Old records keep their original verdict because the *Head of Compliance "exact data at the time"* requirement means re-derivation on read would lose history. The Record Detail page makes the diff visible to the auditor without mutating the stored verdict.

**FCA record-keeping compliance.** Records are append-only at the domain level — corrections create new versions via the supersede pattern. Every record carries `assessedBy`, `assessedAt` (server-generated), `rulesVersion`, `firedRuleIds`, the raw input values, plus an `amendments[]` audit log for workflow-state changes. Access control sits at the service layer, not just the UI.

**4 → 15 branches.** What stays the same: rules engine, domain model, audit log shape, intake flow. What changes: branch becomes a tenant-scoping dimension on every read (RMs default to their own branch; compliance/audit roles see across); per-branch dashboards aggregate findings; backend reads go through a `branchId`-aware accessor. The architecture absorbs the change because branch was always a first-class field, not bolted on.

---

## 7. Process — how I used the AI assistant

The tool was Claude Code (the CLI agent). I directed it; it executed under structure I set. The substance:

### Prompting pattern

**Slowed down before building.** The first ~30% of the session was deliberately not code. I made the model:

1. Produce a forensic analysis of the brief — every persona quote mapped to a build requirement, every CSV row audited against the rules. This caught the 3 planted classification mismatches and surfaced 6 missing-field findings.
2. Write an implementation spec — file layout, domain model, rules engine API, page-by-page UI.
3. Build a requirements checklist with 100+ acceptance criteria, each citing either a brief quote or an analysis section. This became the contract the tests are written against.

After the analysis was approved, the build phase began under strict CLAUDE.md principles: **no comments**, clean architecture with ports + adapters, dependency injection at the composition root, strict TypeScript settings, named constants over magic numbers.

### Parallel subagent strategy

I dispatched **six subagents across the build**, four of them parallel:

| Agent | Scope | Outcome |
|---|---|---|
| A | Domain-layer Vitest tests | 51 tests, all passing on first run. *Caught a 10th planted finding the forensic analysis missed (CLT-009).* |
| B | Adapter layer | 7 files. Surfaced the project's `erasableSyntaxOnly: true` setting which forbids parameter-property shorthand — I refactored my own classes to match. |
| C | UI primitives over Radix | 13 files with `forwardRef` + `displayName`. |
| D | Requirements-traced tests | 89 tests, every title cites an R-ID. |
| E | Bulk import dialog UI | 3 files. Discriminated-union stage machine (pick / preview / result). |
| F | Workflow-edit + audit-trail UI | 2 files plus a Record Detail page rewrite. |

Each prompt was self-contained: scope, files to read, files to write, constraints (no comments, no package installs, no config changes), strict TS settings to respect, and a verification command. Each agent reported back with a list of deliverables, the verification output, and any deviations.

### Where I intervened on what the AI produced

- **The forensic analysis missed CLT-009.** Subagent A caught it during test writing because the test runs every CSV row through the rules engine. I patched the analysis document. The rules engine had been right all along.
- **TypeScript `erasableSyntaxOnly: true` forbids `constructor(private x: T)` shorthand.** I had used it in `AssessmentService`. Subagent B flagged it. I refactored to explicit field declarations, and warned subsequent agents about the rule.
- **The `useSyncExternalStore` infinite-loop bug.** Records page rendered, then immediately blanked with a maximum-update-depth error. Root cause: `RecordStore.list()` returned a freshly-sorted array each call — React saw a new reference on every render. Fixed at the store level with cached snapshot invalidation on mutation. Wrote a regression test that asserts the snapshot reference is stable between mutations.
- **An import service refactor changed a test's expected error message.** Updated the assertion to match the new (more informative) error format. Didn't weaken the test.
- **Unused import in `AssessmentService` after a refactor.** Caught by typecheck before it shipped.

### What I declined to delegate

- **Architectural decisions.** Hexagonal layering, the choice that the rules engine returns *every* fired rule for audit defensibility, the choice that records are immutable point-in-time snapshots with a `rulesVersion`, the immutability vs editability question — design calls I made, then asked the model to encode.
- **Persona analysis.** I directed which quotes were load-bearing. The model expanded, I prioritised.
- **The interview framing.** Where the documentation talks about debrief-readiness — that framing is mine.

---

## 8. Quality approach — how I satisfied myself it works

Three independent axes.

### Axis 1 — automated tests (153 tests, 12 files, ~1.2s runtime)

```text
src/domain/__tests__/        unit tests on the engine, findings, validation     (51 tests)
src/adapters/__tests__/      adapter behaviour: CSV parser/source, stores,
                             ID generators                                      (36 tests)
src/application/__tests__/   service-level orchestration: assessment submit,
                             findings detection, supersede + amend              (41 tests)
src/__tests__/
  requirements-coverage.test.ts   top-level suite; each it() cites an R-ID      (23 tests)
```

The most valuable single file is `src/__tests__/requirements-coverage.test.ts` — every test title reads as a sentence from the requirements checklist:

```ts
it('R2.1: HIGH fires when pep_status is TRUE', () => { ... })
it('R3.6: flags CLT-005 as a classification mismatch (PEP + stored LOW)', () => { ... })
it('R4.15: submit blocks HIGH + APPROVED with a workflow issue', () => { ... })
it('R4.16: submit stamps assessedBy, assessedAt, rulesVersion, firedRuleIds', () => { ... })
```

Reading the test output IS reading the acceptance criteria.

The findings test loads the **real 46-row CSV** (not a synthetic fixture) and asserts:

- All 10 records with findings are caught (3 mismatches + 1 workflow violation + 6 missing-field findings).
- The legitimate edge cases are NOT flagged — CLT-025/CLT-037 (MEDIUM with EDD), CLT-024 (1.2M Pension — NOT in MEDIUM income list), CLT-007/CLT-011 (income exactly at 500,000, the strict-greater-than boundary).

### Axis 2 — type system

`tsc --noEmit` is clean across the entire project. Settings: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`. Domain types are all `readonly`. Result types (`Result<T, E>`) carry validation failures explicitly rather than via exceptions. The verdict from `classify()` includes every fired rule, not just the winning tier — defensibility is structural.

### Axis 3 — smoke test of the running app

```sh
npm run dev               # Vite dev server starts on http://localhost:5173
curl http://localhost:5173/                          → HTTP 200
curl http://localhost:5173/client_onboarding.csv     → HTTP 200
curl http://localhost:5173/src/main.tsx              → HTTP 200
```

Dashboard renders 46 records, 10 with findings, broken down by branch. Clicking through the four KPI tiles lands on correctly-filtered records views. Clicking through to a record with findings shows the FindingsBanner with rule + detail + recommended action. The intake form blocks HIGH+APPROVED at submit and shows a clear workflow error. The bulk import flow goes pick → preview → result with visible loading states.

### Requirement coverage gaps the test suite can't close

Subagent D enumerated which R-IDs the test suite covers (R1.x, R2.x, R3.x, R4.12/14/15/16, R8.2, R11.1 and more) versus which can only be verified visually (R5.x styling, R6.x audit-memo layout, R7.x re-evaluate affordance, R9.x brand fidelity, R10.x tablet UX). For the visual ones I cross-checked the brand tokens in `src/index.css` line by line against the brief's brand section, and confirmed `text-h1`/`text-h2`/`text-body`/`text-label` are applied where the brief specifies them, tabular numerals on amounts/dates/IDs, 44×44 tap targets on interactive elements, the `surface-card` shadow + radius on every card.

---

## 9. Where to look

```text
APPROACH.md                       ← this document
README.md                         ← repo overview
app/                              ← the prototype
  src/domain/                     ← pure logic + rules-as-data
  src/adapters/                   ← LocalStorage, CSV, system clock, etc.
  src/application/                ← AssessmentService, FindingsService, ImportService
  src/ui/                         ← React (pages, components, hooks, providers)
  src/__tests__/                  ← requirements-coverage suite
  README.md                       ← run instructions and stack notes
client_onboarding.csv             ← the seed data the brief provided
sentinel-v2-problem-statement.md  ← the original brief
```

---

## 10. Demo plan for the 10-minute call

1. **0:00 — Open dashboard.** Point at the red "Records with findings = 10" tile. State the planted-test framing: the brief literally writes "PEP-as-LOW is a material compliance failure"; that's CLT-005 in the CSV. Click the tile.
2. **2:00 — Findings page.** Walk through one finding per severity. Note the rule violated + detail + recommended action structure.
3. **4:00 — Record detail for CLT-005.** Click "Re-evaluate against current rules" to show the stored vs current-rules diff. Then "Re-assess this client" → show the intake form pre-filled with the planted-test record's data, with a required reason field. Submit. CLT-005 is now superseded.
4. **6:00 — Back to Records.** CLT-005 is greyed out, "Superseded by CLT-047". Findings KPI drops by 1. Click into CLT-009 — show the missing-field finding. Click "Update workflow state" → patch the ID date → submit. Finding clears. Show the Amendment log card.
5. **8:00 — Bulk import.** Records page → Import CSV → `sample-import.csv`. Preview shows 5 valid rows. Confirm. CLT-104 (the planted-test row in the sample) immediately surfaces on the findings page.
6. **9:00 — Architecture pitch.** Point at `src/domain/rules.ts`: rules are data, version-stamped, no rebuild needed. Point at `src/domain/ports.ts`: persistence is an interface; the prototype is one adapter implementation. Stop on time.

If they ask for a small modification: open `src/domain/rules.ts`, add a country to the HIGH list — Pakistan, say — save. The findings detector immediately re-evaluates the dataset. No rebuild. That's the architecture answer made concrete.
