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
