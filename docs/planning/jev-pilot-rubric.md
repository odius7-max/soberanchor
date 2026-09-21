# Jev Pilot — QA Verdict Rubric & Methodology

*Claude, 2026-09-20. Companion files: `jev-pilot-cases.json` (24 real, redacted cases from docs/audits history), `jev-pilot-runner.mjs`. Goal per Codex's evaluation memo: measure whether Jev catches mistakes we missed WITHOUT approving unsupported claims. Advisory only — no merge decision ever keys on Jev output.*

## Endpoint & key safety (read first)

- **Official TypeSafe:** `POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer <key>`, body `{state, model:"jev-latest", questions}`.
- **jevtypesafeai.com is a self-declared UNOFFICIAL third-party playground** ("not affiliated with, endorsed by, or operated by TypeSafe AI"). Its `/api/v1/decide` + `jv_live_` keys are its own metered gateway. Only use it knowingly, only with fully redacted data, and never with an official TypeSafe key.
- The runner reads `JEV_API_BASE`, `JEV_API_PATH`, `JEV_API_KEY` from env. Keys live in env/.env only — never in chat, never committed.

## The rubric (what "PASS" requires)

A gate cell may be scored PASS only when ALL hold:

1. **Deployment provenance:** the evidence states the exact deployment (SHA or immutable URL) it was observed on, and that deployment was verified, not assumed. (C5 lesson.)
2. **Direct observation:** the claimed behavior was observed, not inferred from an adjacent signal. A marker must be false-before/true-after — a marker already true before the change proves nothing. (R5 + poll-marker lessons.)
3. **State confirmation where state is claimed:** any claim about persisted state (verified, primary_workspace, ownership) cites a DB read, not UI rendering alone. (PP-DEFAULT lesson: UI showed the right thing while the row was wrong — and test5's repaired-row rendering was explicitly NOT bootstrap proof.)
4. **Completeness:** every element of the expected outcome was checked — partial success (navigated but modal stayed open) is FAIL, not "mostly pass." (R1-residual lesson.)
5. **No known confound:** fixture staging, stale identities, or repaired rows are declared and excluded from what the evidence claims to prove.

Verdicts: `pass` (all five hold) / `fail` (behavior contradicts expectation) / `insufficient` (evidence doesn't establish either — the rubric's most important output; C5-shaped and R3-quarantine-shaped cases belong here, never in `pass`).

## Question shape sent to Jev

Per case, three noul questions against the evidence text as `state`:

- `supports_pass`: "Does this evidence, on its own, establish that the described check passed?"
- `evidence_sufficient`: "Is the evidence sufficient to reach ANY confident verdict (pass or fail)?"
- `confound_present`: "Does the evidence itself disclose a confound (wrong deployment, stale fixture, repaired data, inferred-not-observed) that undermines the verdict?"

Mapping to expected: pass ⇒ (yes, yes, no) · fail ⇒ (no, yes, maybe) · insufficient ⇒ (no, no, often-yes).

## Scoring the pilot

- **Catch rate:** of cases labeled fail/insufficient, how many did Jev refuse to pass?
- **Trap rate (the one that matters):** of `trap` cases — well-formatted, confident evidence with a buried confound (C5, PP-DEFAULT, marker-true-before) — how many sailed through as pass? Any trap pass is a strike against gating use.
- **Calibration:** do confidence values separate clean passes from marginal ones?

Decision line: trap rate 0 across ≥5 traps AND catch rate ≥90% → wire as advisory column in Astra's gate reports. Otherwise: playground curiosity, revisit in a quarter.

## Non-goals

Jev never replaces: SHA comparisons, DB reads, overflow measurements (ordinary code checks); Astra's evidence-gathering; Travis's product judgment. It cannot verify anything nobody captured.
