---
name: karpathy-guidelines
description: Behavioral guidelines to reduce common LLM coding mistakes. Use when writing, reviewing, or refactoring code to avoid overcomplication, make surgical changes, surface assumptions, and define verifiable success criteria.
license: MIT
---

# Karpathy Coding Guidelines

Behavioral guidelines for writing, reviewing, and refactoring code. Apply these
whenever you are producing code changes in this repository. These principles are
about *how* to code; project-specific rules (stack, RLS, nav, QA checklist) live
in `CLAUDE.md` at the repo root.

Source: https://github.com/forrestchang/andrej-karpathy-skills

---

## 1. Think Before Coding

**Don't assume. Ask or surface.**

- If the request is ambiguous, list your interpretation before writing code.
- If you are about to make a non-obvious choice (schema shape, API contract,
  naming, file location, library pick), call it out explicitly rather than
  burying it in the diff.
- If you are confused about the codebase, say so. Don't paper over it with
  plausible-looking code.

**Surface tradeoffs.**

- When there's more than one reasonable approach, name the options and why you
  picked one — even if the answer is "this is slightly simpler."
- Flag any assumption that could reasonably be wrong (e.g., "assuming
  `user_profiles.timezone` exists — confirm before running the migration").

---

## 2. Simplicity First

**Write the minimum code that answers the request.**

- No speculative abstractions. No "we might need this later" helpers. No
  configuration layers that don't have a second caller today.
- Prefer inline code over a new module until there are at least two callers.
- Prefer existing patterns in the codebase over introducing new ones.
- If a one-line change works, don't write ten.

**The test: every changed line should trace directly to the user's request.**

If you can't point at the request and say "this line exists because of that,"
delete it.

---

## 3. Surgical Changes

**Touch only what you must.**

- Don't rename things you weren't asked to rename.
- Don't reformat files you're editing unrelated lines in.
- Don't "improve" adjacent code while you're there. Leave a comment or open a
  follow-up instead.
- Keep diffs small. Reviewers should be able to read the whole change in one
  sitting.

**If a fix genuinely requires touching many files, say so explicitly** and list
them. Don't sprawl silently.

---

## 4. Goal-Driven Execution

**Define success criteria before you start.**

- What does "done" look like? Write it down as a short checklist or a test.
- Prefer criteria you can *verify*, not just describe. A passing test beats a
  claim that it works.

**Loop until verified.**

- After implementing, run the verification. If it fails, fix and re-run.
- Don't hand something off as complete based on "it looks right."

**Examples of goal conversion:**

- "Add validation" → "Write tests for invalid inputs, then make them pass."
- "Fix the bug" → "Reproduce the bug, then confirm the reproduction no longer
  triggers after the fix."
- "Make it faster" → "Measure current time, set a target, confirm the measure
  hits the target."
- "Refactor for clarity" → "Identify the specific confusing thing, then confirm
  a second reader can follow the new version without asking."

---

## Applying these in SoberAnchor

These principles pair with the project-specific rules in `CLAUDE.md`:

- **Think Before Coding** → before editing Supabase migrations, confirm column
  and table names against the current schema. Don't assume.
- **Simplicity First** → reuse existing design tokens, components, and Tailwind
  utility classes before introducing new ones. Match the patterns already in
  `src/components/`.
- **Surgical Changes** → when fixing a bug in a shared component, verify the
  change against every page listed in CLAUDE.md §4 (Shared Component Impact) —
  but don't rewrite the component while you're there.
- **Goal-Driven Execution** → the Pre-Push QA Checklist in CLAUDE.md is the
  success criteria. Walk it. Don't claim done without it.
