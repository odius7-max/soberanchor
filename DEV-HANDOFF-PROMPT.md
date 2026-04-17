# Dashboard Today Queue — Claude Code Handoff Prompt

## The one-sentence prompt to paste into Claude Code

> Read `CLAUDE.md` and `.claude/skills/karpathy-guidelines/SKILL.md`, then implement the dashboard redesign specified in `dashboard-today-handoff-spec.md` in the phase order it lists (A → G), committing after each phase with the commit messages the spec provides. Target branch is `dev`. Stop and ask me if any of the four "decisions to confirm" in §1 of the spec are blocking.

## Why this works

- `CLAUDE.md` now tops with a pointer to the karpathy-guidelines skill, so Claude Code loads coding behavior rules before touching code.
- The handoff spec is self-contained (14 sections + appendices, ~48 KB) — it names every file to create, every migration to run, every copy string, every commit message.
- The wireframe at `dashboard-today-wireframe.html` (v5.1) is the visual source of truth — Claude Code should open it in a browser while building to compare against.
- Phase A is database-only (no UI) and can be run against the `ybpwqqbnfphdmsktghqd` Supabase project via the MCP tool Claude Code has available.

## Four decisions the spec will ask Claude Code to confirm

The spec calls these out in §1. If Claude Code hits any of them and the answer isn't obvious from the codebase, it should pause and ask:

1. **Mood enum — keep `crisis` alongside the new `hard` value?** (Yes — keep for legacy data. `hard` is the new user-facing 5th option.)
2. **`sponsor_relationships` table name** — confirm actual name before the cross-role pull-through query. Check `supabase/migrations/` for the latest sponsor-related migration.
3. **`user_profiles.timezone` column** — does it exist? If not, default to `America/Los_Angeles` and add a TODO.
4. **Skip formal Angel validation?** — Yes. Ship to `dev`, not `main`. Feature flag is `NEXT_PUBLIC_TODAY_QUEUE_ENABLED` (default off).

## Safety rails already in place

- Feature flag off by default — production users see nothing until it's flipped.
- Target branch is `dev`, not `main`.
- All Phase A writes are additive (new tables, new column, new view, enum value add) — no destructive migrations.
- QA checklist in spec §G maps 1:1 to `CLAUDE.md` Pre-Push QA Checklist.

## If something gets weird

Hit Claude Code with: *"Stop. Show me the git diff of what you've changed so far and what phase you were on. Don't commit anything else until I review."*

Then we can either course-correct or roll back with `git reset --hard origin/dev`.
