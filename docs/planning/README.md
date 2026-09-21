# docs/planning — index

*The shared file bus for the SoberAnchor assistant loop (Claude, Claude Code, Astra-Codex). Every planning, spec, and decision document lives here; runtime QA evidence lives in `docs/audits/`. Convention (AGENTS.md): write documents here, reference them by path in prompts, never rely on chat history for durable context. Status legend: **CANONICAL** = current source of truth · **ACTIVE** = work in progress · **HISTORICAL** = kept for the record, superseded or completed.*

Updated 2026-09-21 by Claude. When you add or supersede a document, update this index in the same commit.

## Decisions (read these first)

| File | Status | What it decides |
|---|---|---|
| `../../TIER-FEATURES-V1.md` (repo root) | **CANONICAL** | Ratified provider tier feature fences: analytics 3-way, media caps, leads identical at paid tiers, Premium v1 = quarterly report. |
| `homepage-type-decision.md` | **CANONICAL** | Literata as display-only face, Outfit stays for body/UI; `--font-editorial` token plan; do NOT repoint `--font-display`. |
| `tier-capability-matrix.md` | **CANONICAL** | Tier → capability mapping used by rendering and fixtures. |

## Homepage redesign (active arc)

| File | Status | Role |
|---|---|---|
| `homepage-concept-b-claude-review.md` | **CANONICAL** | Astra's review brief: scope, voice rules, copy problem. Supersedes the A-vs-B preference in the warmth doc. |
| `homepage-concept-b-review.md` | **CANONICAL** | Claude's review: visual critique, code-informed 4-stage rollout, two hero copy options (choice pending), open founder questions. |
| `homepage-concept-b.png` | ACTIVE | Preferred art-direction reference. Placeholder logo/photos/copy — not a spec. |
| `homepage-concept-a.png` | HISTORICAL | Comparison only; direction not taken. |
| `homepage-warmth-brand-direction.md` | PARTLY SUPERSEDED | Phase-one rationale, imagery brief, and page-sequence thinking still apply; its A-leaning recommendation is superseded by the B brief. |
| `font-specimen.html` | HISTORICAL | Six-serif specimen that produced the Literata decision. |
| `site-copy-audit.md` | **CANONICAL** | Site-wide no-ai-slop detect audit. H1/H2 fixed on `fix/odi-88-89-honest-copy` (ODI-88/89); open: H3 wording (Travis), H4 legal pages (ODI-90), H5 resource cards (ODI-91), style items ride with each page's restyle. |

## Provider path (shipped fb503f0)

| File | Status | Role |
|---|---|---|
| `PROVIDER-PATH-SPEC.md` | **CANONICAL** | The implemented spec (v2, post-review). Still governs the four-concept separation, `user_setup`, resolver precedence, cancellation. |
| `entry-point-map.md` | **CANONICAL** | The 18 entry doors. Consult before any nav change (e.g. Concept B's nav omissions). |
| `provider-path-plan.md` | HISTORICAL | Pre-spec plan. |
| `provider-path-plan-review.md` | HISTORICAL | Codex adversarial review (A1–A4) that shaped the spec. |
| `provider-path-runtime-fix-list.md` | HISTORICAL | Astra's gate-cycle fix list; all items closed pre-merge. |
| `competitor-door-teardown.md` | HISTORICAL | Astra's competitor entry-door research. |

## Monetization & pricing

| File | Status | Role |
|---|---|---|
| `ODI-80-competitive-pricing-scan.md` | ACTIVE | Competitive scan + level-of-care banding analysis. Awaiting Travis's decisions: anchor-price drop, Founding Partner boundary. |

## Jev / TypeSafe pilot (active)

| File | Status | Role |
|---|---|---|
| `jev-pilot-rubric.md` | **CANONICAL** | 5-condition PASS rubric, endpoint/key safety, decision line (0 trap fails AND ≥90% catch). |
| `jev-pilot-cases.json` | **CANONICAL** | 25 labeled real cases incl. 5 traps. |
| `jev-pilot-runner-v4.mjs` | **CANONICAL** | Current runner: six atomic questions, verdict in code, tunable thresholds. Awaiting Travis's run. |
| `jev-pilot-runner.mjs` | HISTORICAL | v1–v3 runner; superseded by v4 (bundled-rubric question design failed to recognize passes). |
| `jev-probe.mjs` | HISTORICAL | One-call schema probe that revealed the noul probability format. |
| `jev-typesafe-evaluation.md` | HISTORICAL | Codex's original evaluation memo that scoped the pilot. |

## docs/audits (evidence, chronological)

Gate reports, verification runs, and evidence scripts, named `YYYY-MM-DD-<subject>.md`. These are records of what was observed on which deployment — never edited after the fact. Notable: `2026-09-18-provider-path-d01ee8e-final.md` (provider-path final gate), `odi52-demo-media-upload-ledger.md` (fixture change ledger — demo media is ledgered, per standing rule).
