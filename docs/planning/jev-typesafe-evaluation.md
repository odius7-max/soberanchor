# Jev / TypeSafe evaluation for SoberAnchor

Date: 2026-09-20. Recommendation: a small, advisory QA pilot using the official skill and API; do not make it a merge gate or production dependency yet. No installation or API calls performed in this research pass.

## What it provides

Jev evaluates supplied state against narrow typed questions. Choice returns a selected option and probabilities/confidence; Score evaluates a rubric; Noul estimates whether a statement is true. The official documentation recommends atomic questions and composing results in code, rather than asking it to perform extended reasoning. It does not itself supply a browser, observe the live database, or generate our reports. Those observations still need to be collected and provided.

Sources: [Introduction](https://docs.typesafe.ai/introduction), [confidence documentation](https://docs.typesafe.ai/confidence).

Type-safe answers are not proof of factual correctness. An evaluator given incomplete or misattributed evidence can still reach a wrong conclusion. Vendor speed/cost comparisons do not establish the benefit on our workflow; measure locally on representative cases.

## Integration

The Codex plugin-directory search for Jev/TypeSafe returned no matches. TypeSafe publishes an official agent skill at [typesafe-ai/skills](https://github.com/typesafe-ai/skills), with a Claude Code plugin and an other-agent installer through skills.sh. The skill teaches integration/workflow design; installing it alone does not connect a running Jev decision service to every agent action.

The [official quick start](https://docs.typesafe.ai/introduction/quickstart) documents a Playground, API key, POST https://api.typesafe.ai/v1/systemone, and SDKs. A small local wrapper can make explicitly selected calls from our QA workflow. API credentials stay outside committed documents/code. Account credits and billing need checking with the provider actually used; existing Codex usage is not evidence of TypeSafe API credit.

## Proposed bounded pilot

1. Install the official TypeSafe skill for the chosen agent(s), then configure a local API caller separately.
2. Use a curated set of synthetic/redacted QA cases, with expected labels decided before running the model. Include known passes, failures, and insufficient-evidence examples.
3. Ask narrow questions: does the trace support the claimed outcome; does deployment attribution match the tested build; does provider copy contain recovery onboarding language? Literal SHA equality and numeric overflow checks should remain deterministic code.
4. Compare model judgments with human-reviewed answers, record disagreements, false passes, latency and cost. Send uncertain results to review. Keep Jev advisory until its measured performance warrants more responsibility.
5. Keep real member recovery data, credentials, auth tokens and full browser sessions out of this first pilot. Transmit only deliberately selected synthetic/redacted evidence.

This is a recommendation, not an installed capability or completed evaluation. The provider-path QA task remains separate; demoprovider login is still needed for independent 1016px label-overflow closure on c2edc8a.
