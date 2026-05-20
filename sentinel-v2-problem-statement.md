# Client Onboarding Risk Assessment — Halcyon Capital Partners SENTINEL Programme

## Client context

> Halcyon Capital Partners is a mid-market wealth management firm onboarding
> new clients across four UK branches. Every new client relationship must be
> risk-assessed against regulatory criteria before the account can be
> activated. Relationship managers currently handle onboarding using paper
> intake forms and a shared spreadsheet — updated manually at the end of
> each business day.
>
> The **Relationship Manager (Canary Wharf)** is frustrated: "I'm doing this
> between client meetings. I need to log an onboarding assessment in under
> a minute — client details, a few data points, risk classification. Right now
> I'm writing it on a paper form and typing it up at the end of the day,
> which means errors and a two-hour backlog every Friday."
>
> The **Head of Compliance** pushed back: "Every risk classification has to be
> defensible. If an auditor asks why a client was classified as low risk, I
> need to see the exact data recorded at the time — not a summary. And the
> system should be computing the risk tier from the regulatory criteria, not
> relying on the RM to remember which flags matter."
>
> The **Internal Auditor** added: "We do file reviews every quarter. Right now
> the paper forms don't match the spreadsheet. Whatever you build needs to
> give me a clean audit view — who assessed which client, when, and what they
> recorded. Records with missing fields are findings. I can't have them in
> the system."
>
> The **CTO (Halcyon Capital Partners)** sent a note: "We have a CSV export
> of onboarding records gathered so far from all four branches — paper forms
> entered by RMs. Use that for the prototype. Don't worry about a full
> backend — I want to see the concept and the intake flow first. But I'd
> love to hear how you'd architect this properly, especially when we expand
> to fifteen branches next year."

---

## The ask

Build a single-page web application prototype for client onboarding risk
assessment at a wealth management firm. The prototype should demonstrate the
core flow: a relationship manager logs a new client assessment, the system
evaluates risk classification against the regulatory criteria, and captures
the required compliance record.

The application loads onboarding data from a provided CSV
(`client_onboarding.csv`, ~46 records from four branches).

---

## Assets

One file is provided alongside this document:

| File | Contents |
|---|---|
| `client_onboarding.csv` | Onboarding records from four branches — one row per client assessment |

### `client_onboarding.csv` columns

| Column | Description |
|---|---|
| `client_id` | Unique client identifier (e.g. `CLT-001`) |
| `branch` | Branch where onboarding was conducted |
| `onboarding_date` | Date the onboarding assessment occurred |
| `client_name` | Full name of the prospective client |
| `client_type` | INDIVIDUAL or ENTITY |
| `country_of_tax_residence` | Client's country of tax residence |
| `annual_income` | Annual income in GBP (or revenue, for entities) |
| `source_of_funds` | Declared origin of wealth (Employment, Business Income, Investment Returns, Inheritance, Property Sale, Pension, Gift, Other) |
| `pep_status` | Politically Exposed Person (TRUE/FALSE) |
| `sanctions_screening_match` | Matched against HMT / OFSI sanctions list (TRUE/FALSE) |
| `adverse_media_flag` | Flagged by adverse media screening (TRUE/FALSE) |
| `risk_classification` | LOW, MEDIUM, or HIGH |
| `kyc_status` | APPROVED, PENDING, REJECTED, or ENHANCED_DUE_DILIGENCE |
| `id_verification_date` | Date identity documents were verified (if applicable) |
| `relationship_manager` | Name of the RM who conducted the assessment |
| `documentation_complete` | All required documents collected (TRUE/FALSE) |

---

## SENTINEL risk classification rules

These are the firm's regulatory criteria for risk-tiering new clients. The
system must evaluate **all** conditions and assign the **highest applicable
tier**.

### Automatic HIGH risk

A client must be classified HIGH if **any** of the following are true:

| Field | Rule | Value |
|---|---|---|
| `pep_status` | = | TRUE |
| `sanctions_screening_match` | = | TRUE |
| `adverse_media_flag` | = | TRUE |
| `country_of_tax_residence` | in | Russia, Belarus, Venezuela |

> HIGH-risk clients require Enhanced Due Diligence (EDD) and cannot be
> approved without senior compliance sign-off.

### MEDIUM risk

A client is classified MEDIUM if **none** of the HIGH triggers apply, but
**any** of the following are true:

| Field | Rule | Value |
|---|---|---|
| `client_type` | = | ENTITY |
| `country_of_tax_residence` | in | Brazil, Turkey, South Africa, Mexico, UAE, China |
| `annual_income` | > | 500,000 |
| | **and** `source_of_funds` | in | Inheritance, Gift, Other |

> MEDIUM-risk clients require additional documentation and may be escalated
> to EDD at the compliance officer's discretion.

### LOW risk

A client is classified LOW only if **none** of the HIGH or MEDIUM triggers
apply.

---

## Constraints and notes

- Build for tablet browser — the primary device at the branch desk (optimised
  for touch, minimum 44×44px tap targets)
- The CSV represents records gathered so far — **it is not clean**
- Choose whatever language, framework, or tooling you are most productive with
- A working prototype covering 60% of the problem well is better than a
  polished demo covering 20% of it

---

## What "done" looks like is up to you

There is intentionally no wireframe or prescribed output format. Part of
the assessment is your judgment about what matters most to build first.

---

## Architectural considerations

The prototype is a static front-end, but you should be prepared to discuss:

- **Offline operation** — branch connectivity is unreliable in some locations.
  How would you design for offline-first with eventual sync back to a central
  record?
- **Regulatory change** — risk classification thresholds change when the FCA
  updates its guidance or sanctions lists are amended. How would you architect
  the rules engine so a threshold change does not require a code deployment?
- **FCA record-keeping compliance** — electronic records in regulated firms
  require audit trails, access controls, and timestamped attestation. How
  would your data model support this?
- **Multi-branch scale** — four branches today, fifteen next year. What
  changes architecturally, and what stays the same?

> You are not expected to implement these — but your prototype should
> reflect awareness of them, and you should be ready to discuss architecture
> in the debrief.

---

## Business goals

- **RM efficiency** — reduce onboarding assessment time from ~8 min/client
  (paper + retrospective entry) to under 90 seconds at point of intake
- **Data integrity** — eliminate the mismatch between paper forms,
  spreadsheet, and CRM that generates a finding at every file review
- **Risk accuracy** — real-time classification against regulatory criteria,
  catching RM errors before they become compliance breaches
- **Audit readiness** — timestamped, attributable records satisfying file
  review requirements without manual reconciliation

---

## Compliance reference

> This section provides context. No prior knowledge of financial services
> regulation is expected — everything you need is explained here.

### KYC, AML, and record-keeping in wealth management

UK financial services firms operating under FCA supervision must conduct
Know Your Customer (KYC) checks and Anti-Money Laundering (AML) screening
on every new client relationship. The Money Laundering Regulations 2017
(MLR 2017) and FCA's Senior Management Arrangements, Systems and Controls
(SYSC) sourcebook require that firms:

- **Risk-assess every client** based on defined criteria including
  jurisdiction, PEP status, sanctions exposure, and source of funds
- **Maintain audit trails** showing who performed each assessment and when
- **Apply Enhanced Due Diligence (EDD)** for high-risk clients, which
  requires senior approval before the relationship can proceed
- **Keep records complete** — a client file with a missing identity
  verification date, or one whose risk classification contradicts the
  recorded data points, is not just a data quality issue — it is a
  **regulatory finding** that generates a formal response to the FCA
  and can result in enforcement action

In practice, this means every onboarding record must be **attributable**
(clear who assessed each client), **contemporaneous** (recorded at the
time of the assessment, not retrospectively), and **accurate** (the risk
classification must match what the recorded data implies). A record
showing a Politically Exposed Person classified as LOW risk is not a
minor discrepancy — it is a material compliance failure.

---

## Brand

Use the Halcyon Capital Partners visual identity:

| Role | Hex | Usage |
|---|---|---|
| Primary | `#1B2A4A` | App header, primary buttons, navigation |
| Primary Light | `#3D5A80` | Hover states, secondary headings |
| Success | `#2D6A4F` | Approved / low-risk indicators |
| Warning | `#E09F3E` | Pending review, missing fields |
| Error | `#9B2226` | Rejected, high-risk flags, data errors |
| Neutral | `#6B7280` | Muted text, disabled states |
| Background | `#F8F9FA` | Page background |
| Card | `#FFFFFF` | Card and panel surfaces |
| Text | `#1F2937` | Body text |

**Typography:** [Inter](https://fonts.google.com/specimen/Inter).
KPI numbers: 700/32px. H1: 700/26px. H2: 600/18px. Body: 400/15px.
Form labels: 500/13px.

**Logo:** "Halcyon Capital Partners" wordmark — "Halcyon" in `#1B2A4A`, bold.
Subtitle: "SENTINEL Onboarding" in `#6B7280`, regular weight.

**Layout:** Full-width app optimised for 1024×768 (iPad landscape). Cards
with 8px border-radius, subtle shadow (`0 1px 3px rgba(0,0,0,0.08)`).
16px gap between cards. 24px page padding. Touch-friendly tap targets
(min 44×44px).
