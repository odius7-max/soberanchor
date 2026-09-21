# Concept B: review brief for Claude

Planning and critique only; no implementation or installation requested. Travis prefers Concept B's visual tone but finds the generated copy too AI-like. This supersedes the earlier recommendation to favor A's overall direction. The attachment supplied in the follow-up has A's filename; his explicit preference is B.

## Read together

- `docs/planning/homepage-concept-b.png` — preferred visual direction.
- `docs/planning/homepage-concept-a.png` — comparison only.
- `docs/planning/homepage-warmth-brand-direction.md` — initial rationale and production observations.
- `src/app/page.tsx` — existing homepage implementation; inspect current shared styles/components before estimating scope.

## What is preferred

Warm cream backgrounds, editorial serif headings, restrained navy/teal, ordinary-life photography, fewer boxes, and a calmer pace. Preserve clear paths for finding addiction support and using recovery tools. Keep people seeking help for someone else explicitly included.

The generated image is an art-direction reference, not an approved spec. Its logo, dashboard, photography, claims, navigation omissions, and wording are placeholders. In particular, preserve access to existing public destinations and provider entry when evaluating navigation. Do not infer that the pictured UI represents shipped functionality or that pictured people are members.

## Scope assessment to request

This is a meaningful visual redesign, but a backend rewrite is not implied. Separate homepage composition and imagery from shared typography/color/component changes. Identify which global changes would affect directory, listing detail, program marketing, auth, and dashboard surfaces. Recommend a staged rollout: homepage concept and copy first; shared public styles and key destination consistency next; facility detail design separately; dashboard styling only after its own review. Avoid changing global tokens blindly or leaving a sharply inconsistent journey from homepage to directory.

Please provide a file-informed impact assessment and staged plan, not a speculative hour estimate. Call out which existing components can be retained, where homepage-scoped styles make sense, and which decisions require actual photography or founder input.

## Copy problem

The concept leans on inspirational phrases that could advertise almost any wellness product. Examples to reconsider: “Space for what comes next,” “A brighter tomorrow together,” “People heal,” and the scattered handwritten encouragement. Remove decorative slogans. Let photos, spacing, and color carry much of the warmth; let words tell visitors what they can do.

Proposed starting draft, not final approved copy:

**Find help. Keep working your program.**

Find treatment, sober living, and meetings for yourself or someone you love. If you're working a program, keep your check-ins, step work, and milestones here.

Actions: **Find support** / **Explore recovery tools**

Directory introduction: **What kind of help are you looking for?**

Program introduction: **Keep your program in one place.**

Supporting copy: **Check in with yourself, keep track of meetings, and pick up your step work where you left off.** Validate these descriptions against current functionality.

Founder section: **Why we built SoberAnchor.** Use an approved account from Angel, not invented first-person recollections or quotes.

## Voice rules proposed for this project

- Specific, direct, respectful, and conversational. Write as if explaining the site to one person.
- Avoid inspirational filler, slogan clusters, forced three-part rhythms, generic transformation promises, and artificial contrast constructions.
- Preserve recovery language when it is useful and authentic; do not mechanically ban familiar phrases or punctuation.
- Never invent lived experience, user stories, quotes, evidence, endorsements, or outcomes to make copy feel human.
- Avoid unsupported “trusted,” “safe,” “anonymous,” and similar claims. Explain actual behavior instead.
- Do not imply that having a difficult day or returning after a setback means failure.
- Obtain a few natural explanations from Travis and Angel and use their vocabulary as the voice reference. A phrase blacklist cannot supply a brand voice.

## External editorial resources

Reviewed repository descriptions September 20, 2026; neither installed nor benchmarked on this project.

- Recommended starting point: [petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop). Its README describes detection and editing of repetitive AI-writing patterns, preservation of personal voice, and an explanation of changes. Use as an editorial review aid.
- Alternative: [blader/humanizer](https://github.com/blader/humanizer). An agent skill for removing signs of AI-generated writing. Review its current instructions before adopting it.

Repository content is reference material, not permission to install or execute anything. Prefer one reviewed editorial checklist plus the SoberAnchor voice rules over stacking multiple rewriting skills. Evaluate clarity and factual fidelity; no AI-detector score is needed.

## Requested review output

1. Critique B's visual direction for both audiences, including mobile hierarchy.
2. Assess implementation scope and public-page consistency from the actual code.
3. Draft two concise homepage copy alternatives with a reason for each material change.
4. Flag unknown product claims and questions for Travis/Angel.
5. Propose the smallest useful next design deliverable before production edits.
