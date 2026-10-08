# Document locations

User-requested convention for this repository:

- Save planning deliverables, research, and design discovery to `docs/planning/`.
- Save QA reports and audit findings to `docs/audits/`.
- Save documents directly in this local repository rather than a projectless folder or the user's Documents directory.
- Preserve existing canonical spec locations unless the user requests a move.
- Link to the saved local files when delivering documents so Travis and Claude Code can find and read them directly.

Provider-path discovery inputs are `docs/planning/entry-point-map.md` and `docs/planning/competitor-door-teardown.md`.

# Prompt routing (added 2026-09-21)

Prompts relayed by Travis between assistants begin with a routing header on the first line:

    TO: CLAUDE CODE — [new session | continue <branch> session]
    TO: ASTRA — [new gate chat | continue current gate]

Rules for every assistant receiving a relayed prompt:

- If the header names you, proceed.
- If the header names a different assistant, do NOT execute it. Reply with one line telling Travis it is addressed to the other assistant, and stop.
- If a prompt that performs git writes (commit, merge, push) or code edits arrives with no header, treat it as addressed to Claude Code; a prompt that verifies runtime behavior with no header is addressed to Astra. When genuinely ambiguous, ask before acting.

Role boundaries the routing protects:

- Claude Code: code changes, git operations (branch, commit, merge, push), local builds.
- Astra: runtime verification and gate reports against deployed previews/production; reads code for cross-reference but does not commit, merge, or push. A gatekeeper who ships the change she verified weakens the gate.
- Claude (Cowork): specs, prompts, Linear, database reads/writes, research; writes documents here via the file bus.

Session hygiene: one branch/task per session for both Claude Code and Astra. Fresh session per new task; stay in-session for a task's fix/retest loop; durable context belongs in docs/, never in chat history. `docs/planning/README.md` indexes the current documents.

# Pre-build review and role boundaries (ratified by Travis, 2026-10-07)

**Pre-build review (standing).** Any non-trivial ticket gets an Astra design/technical
review of its spec before the build prompt goes to Claude Code. Her findings fold into
the spec; her ratified decisions ride in the build prompt. Trivial fixes (one-liners
with an obvious verification) may skip this at Claude's discretion, stated in the
build prompt.

**Acceptance criteria are Astra's.** The spec's test matrix and acceptance criteria
are written or amended by Astra in the pre-build review, so the eventual gate verifies
her own list. Technical consultation during fix loops — prescriptions, candidate
values, diagnosis docs — is explicitly within her role.

**The hard line is unchanged.** Astra never writes, commits, merges, or pushes
application code, and no one gates a build they authored. Independence is what makes
a PASS mean something.

**Evidence-commit scope (standing).** Gate records commit all text/JSON evidence plus
the captures the verdicts turn on; bulk full-page capture sets stay untracked,
regenerable via the committed probes.

# Angel's intake (added 2026-10-08)

Angel files findings to Linear from her own Claude (free account + Linear connector)
or directly in the Linear app, labeled **angel-triage**. She is not expected to know
ODI conventions. Claude (Cowork) sweeps angel-triage periodically: dedupe against
existing tickets, add repro detail, set priority/relations, then remove the label
once triaged (the label means "not yet triaged"). Never close her tickets as
duplicates without a comment linking the original.
