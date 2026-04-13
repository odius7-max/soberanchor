# SoberAnchor Recovery Program Skill
## Guidelines for building fellowship step work programs

Use this document when adding new recovery programs (NA, Al-Anon, Celebrate Recovery, SMART Recovery, etc.) to ensure consistency with patterns established in the AA 12-step workbook.

---

## Database Architecture

### Tables involved

- `program_workbooks` — Stores sections and prompts per fellowship
- `step_completions` — High-level "is this step done" per user per fellowship
- `step_work_entries` — Detailed prompt-level responses from sponsees
- `fellowships` — Master list of all fellowships (referenced by UUID)
- `activity_feed` — Surfaces step reviews, completions, and task assignments on dashboard

### Key relationships

- `program_workbooks.fellowship_id` → `fellowships.id`
- `step_completions.user_id` → `auth.users.id`
- `step_completions.fellowship_id` → `fellowships.id`
- `step_work_entries.workbook_id` → `program_workbooks.id`
- One user can have multiple `step_completions` rows across different fellowships (multiple sobriety dates)

---

## Program Structure Rules

### 1. Self-contained prompts — NO external references

Every prompt must be fully answerable without the user having a book, pamphlet, or external resource. This was a critical lesson from AA:

**Wrong:** "Read pages 30-43 of the Big Book. What stood out to you?"
**Right:** "Step 1 begins with understanding the nature of addiction — the physical craving and the mental obsession that together make it impossible to use safely. Reflect on how this applies to your experience."

Explain concepts inline within the question text. A user should be able to complete the entire workbook without ever opening another resource.

### 2. Prompt types (JSONB format in `program_workbooks.prompts`)

All programs use the same prompt type system:

```json
{
  "prompts": [
    {
      "id": "p1",
      "type": "text",
      "question": "The full question text with context built in",
      "hint": "Optional helper text",
      "required": false
    }
  ]
}
```

| Type | UI Rendering | When to use |
|------|-------------|-------------|
| `text` | Textarea (long-form) | Open reflection, journaling, narrative answers |
| `yesno` | Toggle + conditional textarea | Self-assessment questions with elaboration |
| `table` | Dynamic rows with defined columns | Inventories (resentments, fears, amends lists) |
| `scale` | Slider with labels | Self-rating questions (willingness, honesty) |

**Removed types:** `reading` was removed because all reading context is now embedded in the question itself.

### 3. Section organization

Each step can have multiple sections. The AA structure:

- Steps with simple concepts → 1 section (e.g., Step 2: Hope)
- Steps with complex work → 2-4 sections (e.g., Step 1: Reading/Powerlessness/Unmanageability, Step 4: Resentments/Fears/Sex & Relationships)

**Naming convention:** `{fellowship-slug}-step-{N}-{section-slug}`
Example: `aa-step-1-powerlessness`, `na-step-4-inventory`, `cr-step-3-decision`

**Fields per section:**
- `fellowship_id` — UUID reference to fellowships table
- `step_number` — Integer (1-12 for 12-step, 1-4 for SMART, etc.)
- `title` — Display title (e.g., "Step 1: Powerlessness")
- `slug` — URL-friendly unique identifier
- `description` — 1-2 sentence description of the section's purpose
- `reference_text` — Contextual explanation (NOT page references)
- `prompts` — JSONB array of prompt objects
- `sort_order` — Integer for ordering within the program

### 4. Step count varies by program

Do NOT hardcode "12 steps" anywhere in the UI or logic. Use the actual step count from the program:

| Program | Steps/Points | Sections (estimated) |
|---------|-------------|---------------------|
| AA | 12 steps | 16 sections, 85 prompts |
| NA | 12 steps | ~16-20 sections (similar structure, different language) |
| Al-Anon | 12 steps | ~16 sections (family-focused lens) |
| Celebrate Recovery | 8 principles / 12 steps | ~25 sections (lesson-based curriculum) |
| SMART Recovery | 4-point program | ~8-12 sections (CBT worksheets) |
| ACA/ACoA | 12 steps | ~16 sections (inner child focus) |
| GA | 12 steps | ~16 sections (gambling-specific) |

---

## Three Completion Methods

Every program must support all three methods equally:

### Digital
- Sponsee fills out prompts in the app
- Auto-saves to `step_work_entries`
- Sponsor reviews responses, adds per-prompt feedback
- Status flow: `draft → submitted → reviewed → needs_revision`

### Print
- "Print this section" generates a clean PDF workbook page
- Layout: step title header, numbered questions, lined space for handwriting, SoberAnchor footer
- Should look like a bookstore workbook, NOT a screenshot of a website
- Sponsor marks step complete in the system with note ("Reviewed handwritten work 4/10")

### Discussion
- Sponsor and sponsee work through it verbally in person
- Sponsor marks step complete with a note ("Discussed in person, strong understanding")
- No digital prompt responses required

All three methods track the same in `step_completions` via `completed_method` field.

---

## Completion Status Logic

### Two levels of completion

1. **Step-level** (`step_completions`) — High-level "is this step done?"
   - Set by sponsor OR sponsee
   - Toggleable (can be unchecked if accidentally marked)
   - Confirmation prompt before unchecking: "Mark Step X as incomplete?"
   - When toggled, `user_profiles.current_step` recalculates to lowest incomplete step

2. **Section-level** (`step_work_entries`) — Detailed prompt responses
   - If parent step is marked complete in `step_completions`, ALL sections display as "Completed" even if no digital entries exist
   - Show indicator: "Completed via sponsor" or "Completed outside app"
   - Sections remain clickable for retroactive digital entry

### Status display locations (ALL must stay in sync)

- Dashboard "Current Focus" card → reads `step_completions`
- Step Work overview page (summary stats) → reads `step_completions` + `step_work_entries`
- Step Work section list (per-section status) → reads both tables
- Sponsor's sponsee detail page → reads `step_completions`
- Sponsor's sponsee card on Sponsor View → reads `step_completions` for progress %

### Status calculation

```
progress_percent = (completed steps / total steps in program) * 100
current_step = lowest step_number where is_completed = false
if all complete → show "Completed" state, not "Step X"
```

---

## Sponsor/Sponsee Interaction Patterns

### Bidirectional editing
Both sponsor and sponsee can:
- Mark steps complete/incomplete
- Edit step work entries
- Add notes to completions

### Activity feed integration
When any of these events occur, write to `activity_feed`:
- `step_reviewed` — Sponsor reviewed step work submission
- `step_completed` — Step marked complete (by either party)
- `task_assigned` — Sponsor assigned new work
- `journal_entry` — New journal entry submitted
- `check_in` — Daily check-in logged

### Sponsor catch-up flow
When a sponsor takes on a sponsee mid-program, they can batch-mark prior steps as complete. The sponsor detail page shows step progress cards that are toggleable — click to mark complete, click again to unmark.

---

## Language Guidelines

### Adapting language per fellowship

Each fellowship has its own terminology. Prompts must use the correct language:

| Concept | AA | NA | Al-Anon | SMART | CR |
|---------|----|----|---------|-------|----|
| Substance | Alcohol | Drugs/substances | N/A (focus on self) | Addictive behavior | Hurts, habits, hang-ups |
| Higher Power | God / Higher Power | God / Higher Power | God / Higher Power | N/A (secular) | Jesus Christ / Higher Power |
| Core text | Big Book | Basic Text | How Al-Anon Works | SMART Handbook | Celebrate Recovery Bible |
| Meeting style | Shares, speakers | Shares, speakers | Shares, speakers | Cross-talk, tools | Testimony, lesson |

### Tone rules (apply to ALL programs)
- No clinical jargon — use warm, human language
- No judgment or assumptions about readiness
- "I'm not sure" is always valid
- Explain recovery concepts inline, don't assume knowledge
- Acknowledge that the work is hard — "This step requires courage"

---

## Adding a New Program — Checklist

1. **Create fellowship record** in `fellowships` table if it doesn't exist
2. **Research the program's official structure** — steps/principles, sections, question patterns
3. **Write prompts** following the self-contained rule (no external references)
4. **Map to prompt types** — text, yesno, table, scale
5. **Seed `program_workbooks`** with proper `fellowship_id`, `step_number`, `slug`, `sort_order`
6. **Adapt language** per the fellowship's terminology (see table above)
7. **Test completion flow** — verify all three methods (digital, print, discussion) work
8. **Verify status sync** — check all 5 display locations update correctly
9. **Test sponsor catch-up** — mark steps complete out of order, verify progress calculates
10. **Test unchecking** — sponsor deselects a completed step, verify recalculation
11. **Write activity feed events** — ensure step reviews and completions surface on dashboard

---

## Schema Reference

### program_workbooks
```sql
id uuid PK
fellowship_id uuid FK → fellowships
step_number integer
title text
slug text UNIQUE
description text
reference_text text
prompts jsonb  -- array of prompt objects
sort_order integer
created_at timestamptz
```

### step_completions
```sql
id uuid PK
user_id uuid FK → auth.users
sponsor_relationship_id uuid FK → sponsor_relationships
fellowship_id uuid FK → fellowships
step_number integer (1-12+)
is_completed boolean
completed_at timestamptz
completed_method text ('digital'|'print'|'discussion'|'other')
sponsor_approved boolean
sponsor_approved_at timestamptz
sponsor_note text
sponsee_note text
UNIQUE (user_id, fellowship_id, step_number)
```

### step_work_entries
```sql
id uuid PK
user_id uuid FK → auth.users
workbook_id uuid FK → program_workbooks
responses jsonb  -- keyed by prompt id
status text ('draft'|'submitted'|'reviewed'|'needs_revision')
completion_method text ('digital'|'print'|'discussion'|'other')
completion_note text
submitted_at timestamptz
reviewed_at timestamptz
reviewer_id uuid FK → auth.users
reviewer_feedback jsonb
created_at timestamptz
updated_at timestamptz
```

### activity_feed
```sql
id uuid PK
user_id uuid FK → auth.users
event_type text ('step_reviewed'|'step_completed'|'task_assigned'|'check_in'|'journal_entry'|'sponsor_linked'|'sponsor_unlinked'|'milestone'|'system')
title text
description text
metadata jsonb
is_read boolean DEFAULT false
created_at timestamptz
```

---

## Anti-patterns to avoid

1. **Don't hardcode step count** — not all programs have 12 steps
2. **Don't lock steps** — all steps accessible, current step visually emphasized only
3. **Don't require digital entry** — sponsor override must be a first-class path
4. **Don't show stale status** — if `step_completions` says done, every UI surface must agree
5. **Don't reference external materials** — all context self-contained in prompts
6. **Don't use one-way toggles** — sponsors must be able to undo accidental completions
7. **Don't forget the activity feed** — every meaningful state change writes an event
8. **Don't assume AA language** — each fellowship has its own terminology
9. **Don't make print an afterthought** — many recovery members prefer handwriting
10. **Don't separate "tasks from sponsor" from other activity** — use unified activity feed
