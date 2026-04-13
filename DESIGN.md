# Design System: SoberAnchor

## 1. Visual Theme & Atmosphere

SoberAnchor's design embodies a calm harbor — safe, sturdy, hopeful. The system is built on warm neutrals with nautical undertones, creating an approachable warmth that feels like a trusted hand on your shoulder rather than a clinical intake form. The page canvas is pure white (`#ffffff`) but the neutral scale carries subtle warm undertones (`#FAFAF8`, `#F5F3F0`, `#E8E4DF`), giving the interface a tactile, almost analog quality — closer to quality stationery than sterile glass.

The typography pairing is the heartbeat of the system. Cormorant Garamond — an elegant, high-contrast serif — handles all display text, lending headlines the gravity and intimacy of a personal letter. At display sizes (52px+), it uses moderate negative letter-spacing (-1.5px), creating headlines that feel composed and intentional. Outfit — a geometric sans-serif with rounded terminals — handles everything else: body text, navigation, buttons, forms. The contrast between the two creates a warm editorial quality: serious enough to trust, approachable enough to confide in.

What makes SoberAnchor's visual language distinctive is its border philosophy, inspired by Notion's approach. Rather than heavy borders or pronounced shadows, SoberAnchor uses whisper-weight borders — `1px solid rgba(0,0,0,0.08)` — that create structure without weight. The shadow system is equally restrained: multi-layer stacks with cumulative opacity never exceeding 0.06, creating depth that's felt rather than seen. The only moment the interface raises its voice is the dashboard banner — a deep navy-to-teal gradient that serves as the emotional anchor of the recovery journey.

**Key Characteristics:**

* Cormorant Garamond (serif) for display/headlines with negative letter-spacing at larger sizes
* Outfit (geometric sans-serif) for body, UI, and all interactive elements
* Warm neutral palette with subtle yellow-cream undertones (`#FAFAF8` off-white, `#F5F3F0` warm gray)
* Near-black body text via `#2C2C2C` — not pure black, creating micro-warmth
* Whisper borders: `1px solid rgba(0,0,0,0.08)` throughout — barely-there division
* Multi-layer shadow stacks with sub-0.06 opacity for natural depth
* Three accent colors with distinct emotional roles: Navy (structure), Teal (hope), Gold (celebration)
* Nautical motifs as subtle undercurrent — anchor marks, wave textures, rope-line borders — never overwhelming
* 8px base spacing unit with generous vertical rhythm

**Emotional Guardrails:**

* **Welcoming, not clinical** — "What are you dealing with?" not "Select your disorder"
* **Hopeful, not preachy** — show possibility without toxic positivity
* **Inclusive, not assuming** — never assume identity, readiness, or belief system
* **Sturdy, not sterile** — reliable, grounded, warm (the anchor metaphor)
* **Never use red for form validation** — this audience is fragile. Use gold/warm tones for gentle corrections.

## 2. Color Palette & Roles

### Primary Brand

* **Navy** (`#003366`): The structural anchor. Nav bar, headlines, primary buttons, key UI anchors. Never used as full section backgrounds — it's for punctuation, not wallpaper.
* **Navy Dark** (`#002244`): Footer background, hover states on navy elements, deep gradient terminus.
* **Teal** (`#2A8A99`): Hope and warmth. Links, secondary buttons, CTAs, accent elements, interactive states. The color of forward motion.
* **Teal Light** (`#3AA5B6`): Hover state for teal elements.
* **Gold** (`#D4A574`): Celebration and milestones. Featured badges, active step indicators, premium feel. Used sparingly — gold is earned, not given.
* **Gold Light** (`#E8C9A8`): Soft gold for backgrounds and hover states.

### Warm Neutral Scale

* **Pure White** (`#FFFFFF`): Page background, card surfaces, button text on navy/teal.
* **Off-White** (`#FAFAF8`): Section background alternation, subtle surface tint. The cream undertone is essential — creates visual rhythm without harsh breaks.
* **Warm Gray** (`#F5F3F0`): Card backgrounds, input fills, subtle containers, badge backgrounds. Warmer than standard grays.
* **Border** (`#E8E4DF`): Fallback border color for non-transparent contexts. Warm undertone prevents coldness.
* **Mid Gray** (`#888888`): Secondary text, captions, timestamps, descriptions.
* **Dark** (`#2C2C2C`): Primary body text. Not pure black — softens reading experience.

### Semantic & State

* **Green** (`#27AE60`): Success, completed steps, confirmed sobriety check-ins. Never for general decoration.
* **Destructive Red** (`#C0392B`): Delete actions only. Never for form validation, errors, or warnings.

### Transparency Variants

* **Navy 10** (`rgba(0,51,102,0.08)`): Navy-tinted backgrounds, card hover fills.
* **Navy 20** (`rgba(0,51,102,0.15)`): Navy accent borders.
* **Teal 10** (`rgba(42,138,153,0.08)`): Teal-tinted backgrounds, fellowship badges.
* **Teal 20** (`rgba(42,138,153,0.15)`): Teal accent borders, focus states.
* **Gold 10** (`rgba(212,165,116,0.1)`): Gold-tinted backgrounds, milestone badges.
* **Whisper Border** (`rgba(0,0,0,0.08)`): Universal whisper border — cards, dividers, sections.

### Color Rules

* Canvas is white/off-white dominant (80%+). Pages breathe.
* Navy is for **UI anchors** (nav, headlines, primary buttons). Never as full section backgrounds.
* Teal conveys **warmth and hope**. Use for interactive elements and accents.
* Gold is **celebratory and premium**. Milestones, featured badges, active step indicators. Always sparingly.
* Section alternation: `#FFFFFF` ↔ `#FAFAF8` — the warm shift creates rhythm without harsh color breaks.
* Never use pure black (`#000000`) for text. Always `#2C2C2C`.
* Never use blue-gray or cool-toned neutrals. All grays carry warm undertones.

## 3. Typography Rules

### Font Families

* **Display**: `'Cormorant Garamond', Georgia, serif` — Headlines, section titles, dashboard counters, milestone labels. An elegant high-contrast serif with calligraphic roots.
* **Body**: `'Outfit', sans-serif` — Body text, UI labels, buttons, navigation, form inputs. A geometric sans-serif with rounded terminals that softens the interface.

```
Google Fonts: https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap
```

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Hero Headline | Cormorant Garamond | clamp(36px, 5vw, 52px) | 600 | 1.10 | -1.5px | Maximum impact. Navy color. |
| Section Title | Cormorant Garamond | clamp(28px, 3.5vw, 40px) | 600 | 1.15 | -1.0px | Section openers. Navy color. |
| Card Title | Cormorant Garamond | 20–22px | 600 | 1.20 | -0.5px | Card headings, article titles. Navy. |
| Dashboard Counter | Cormorant Garamond | 52–56px | 700 | 1.00 | -1.5px | Sober day count. White on gradient. |
| Stat Value | Cormorant Garamond | 28–40px | 700 | 1.00 | -0.75px | Meeting counts, sponsee counts. |
| Quote Text | Cormorant Garamond | 17–18px | 500 | 1.50 | normal | Motivational quotes. Italic. White 85%. |
| Section Label | Outfit | 12px | 700 | 1.33 | 2.0px | Uppercase. Teal color. Above section titles. |
| Body Large | Outfit | 17px | 400 | 1.70 | normal | Hero subtitles, feature descriptions. |
| Body | Outfit | 15–16px | 400 | 1.70–1.85 | normal | Standard reading text. Dark. |
| Body Medium | Outfit | 15px | 500 | 1.50 | normal | Navigation links, emphasized text. |
| Body Semibold | Outfit | 14px | 600 | 1.50 | normal | Button text, card labels, strong UI text. |
| Nav Link | Outfit | 15px | 500 | 1.33 | normal | Navigation. Dark default, teal active. |
| Button | Outfit | 13–14px | 600 | 1.33 | 0.01em | All button variants. |
| Caption | Outfit | 13px | 500 | 1.40 | normal | Timestamps, metadata, secondary labels. Mid gray. |
| Micro | Outfit | 11–12px | 500–600 | 1.33 | normal | Badge text, step labels, small metadata. |
| Badge | Outfit | 12px | 500 | 1.33 | normal | Pill badges, tags, status indicators. |

### Principles

* **Serif for headings only**: Cormorant Garamond never appears in body text, buttons, or UI labels. It's reserved for moments of gravity and warmth.
* **Compression at scale**: Cormorant Garamond uses -1.5px letter-spacing at 52px, relaxing to -0.5px at 22px and normal below 20px. Tighter headlines feel composed and intentional.
* **Three-weight body system**: Outfit at 400 (read), 500 (interact/navigate), 600 (emphasize/label). 300 is available for ultra-light decorative use but rarely needed.
* **Warm line-height scaling**: Line height tightens as size increases — 1.70–1.85 at body (15–16px), 1.15–1.20 at section titles, 1.00–1.10 at display. Dense headlines, breathable body text.
* **Section label pattern**: Always 12px Outfit, weight 700, uppercase, 2px letter-spacing, teal color. Appears above every section title. This is a signature pattern — use it consistently.

## 4. Component Stylings

### Buttons

**Primary Navy**
* Background: `#003366`
* Text: `#ffffff`
* Padding: 11px 24px
* Radius: 8px
* Border: none
* Hover: background `#002244`, translateY(-1px)
* Large variant: padding 14px 32px, font-size 16px, radius 10px

**Teal**
* Background: `#2A8A99`
* Text: `#ffffff`
* Hover: background `#3AA5B6`, translateY(-1px)

**Gold Gradient**
* Background: `linear-gradient(135deg, #D4A574, #c49564)`
* Text: `#ffffff`
* Shadow: `0 4px 12px rgba(212,165,116,0.3)`

**Outline**
* Background: transparent
* Text: `#003366`
* Border: `1.5px solid #003366`
* Hover: background `rgba(0,51,102,0.08)`, translateY(-1px)

**Ghost**
* Background: transparent
* Text: `#2A8A99`
* Border: none
* Padding: 6px 2px
* Hover: underline (no transform)

**Destructive**
* Background: transparent
* Text: `#C0392B`
* Border: `1.5px solid #C0392B`

### Cards & Containers

**Standard Card**
* Background: `#ffffff`
* Border: `1px solid rgba(0,0,0,0.08)`
* Radius: 14px
* Padding: 24px
* Shadow at rest: none
* Shadow on hover: `0 4px 18px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.027), 0 0.8px 3px rgba(0,0,0,0.02)`
* Hover: translateY(-2px), transition 0.25s

**Dashboard Card**: radius 16px, all else same

**Focus Card** (Current Step)
* Background: `linear-gradient(135deg, rgba(0,51,102,0.03), rgba(42,138,153,0.05))`
* Border: `1.5px solid rgba(42,138,153,0.15)`
* Radius: 16px

### Badges & Pills

| Variant | Background | Border | Text |
|---------|-----------|--------|------|
| Default | `#F5F3F0` | `1px solid #E8E4DF` | `#2C2C2C` |
| Teal | `rgba(42,138,153,0.08)` | `rgba(42,138,153,0.15)` | `#2A8A99` |
| Gold | `rgba(212,165,116,0.1)` | `rgba(212,165,116,0.2)` | `#9A7B54` |
| Green | `rgba(39,174,96,0.08)` | `rgba(39,174,96,0.15)` | `#27AE60` |
| Navy | `rgba(0,51,102,0.06)` | `rgba(0,51,102,0.1)` | `#003366` |

Base: `padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500;`

### Form Inputs

```css
border: 1.5px solid rgba(0,0,0,0.08);
border-radius: 8px;
padding: 11px 14px;
font-size: 14px;
font-family: 'Outfit', sans-serif;
/* Focus: border-color #2A8A99 */
/* Placeholder: color #a39e98 */
```

### Navigation

* Sticky top, white background, `1px solid rgba(0,0,0,0.08)` bottom border, height 68px
* Logo: Anchor SVG (28×28) + "SoberAnchor" in Cormorant Garamond 22px weight 700 Navy
* Links: Outfit 15px weight 500, `#2C2C2C`. Active: `#2A8A99` + `rgba(42,138,153,0.08)` bg pill
* Mobile: hamburger at 768px

### Footer

* Background: `#002244`, padding 56px 24px 32px
* Logo in gold stroke, column headers gold 12px weight 700 uppercase
* Crisis hotline always visible: SAMHSA 1-800-662-4357 in gold

## 5. Layout Principles

### Spacing

* Base unit: 8px
* Scale: 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 64, 80px
* Between major sections: 64–80px vertical padding
* Between cards: 20–24px gap
* Inside cards: 24–28px padding

### Grid

* Max width: 1120px, centered, 0 24px padding
* `.grid-2`: `repeat(auto-fit, minmax(320px, 1fr))`, gap 24px
* `.grid-3`: `repeat(auto-fit, minmax(280px, 1fr))`, gap 20px

### Whitespace

* Generous vertical rhythm — 64–80px between sections. This is a site people visit during emotional moments.
* White/off-white (`#FAFAF8`) alternation for visual rhythm without harsh breaks.
* Body text uses 1.70–1.85 line-height surrounded by ample margin.

### Border Radius Scale

| Radius | Usage |
|--------|-------|
| 4–6px | Checkboxes, compact step boxes |
| 8px | Buttons, inputs, avatars |
| 10px | Tab buttons |
| 12px | Inner containers, quote blocks |
| 14px | Standard cards, lead forms |
| 16px | Dashboard cards, focus cards |
| 18–20px | Dashboard banner, showcase mockups |
| 20px | Badges, chips, pills |

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat | None | Page background, text blocks |
| Whisper | `1px solid rgba(0,0,0,0.08)` | Standard borders — cards, dividers, inputs |
| Soft Card | `0 4px 18px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.027), 0 0.8px 3px rgba(0,0,0,0.02)` | Card hover |
| Feature | `0 8px 30px rgba(0,51,102,0.08)` | Featured cards, listing hover |
| Hero | `0 24px 80px rgba(0,51,102,0.15)` | Dashboard banner, showcase mockup |
| Button | `0 4px 12px rgba(0,51,102,0.2)` | Primary buttons |
| Gold Glow | `0 4px 12px rgba(212,165,116,0.3)` | Gold buttons, active step |
| Step Active | `0 0 16px rgba(212,165,116,0.4)` | Current step box |
| Toast | `0 8px 30px rgba(0,0,0,0.2)` | Notifications |

**Shadow Philosophy**: Multi-layer shadows with individual opacity never exceeding 0.06. Elements feel embedded in the page rather than floating above it. The only pronounced shadow is the dashboard banner (Hero level), which serves as the emotional focal point.

### Decorative Depth

* Dashboard banner: navy→teal gradient, SVG wave at bottom (opacity 0.04), anchor watermark top-right (opacity 0.03)
* Section alternation: `#FFFFFF` → `#FAFAF8` — no hard borders between sections
* Quote blocks: `border-left: 3px solid rgba(212,165,116,0.4)` — rope-line nautical accent
* Dot texture (rare): `radial-gradient(circle, #003366 1px, transparent 1px)` at 24px, opacity 0.025

## 7. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <560px | Single column, full-width listing images |
| Tablet | 560–768px | Hamburger nav, 2-column grids |
| Desktop | 768–1120px | Full nav, standard grids |
| Large | >1120px | Centered, generous margins |

### Collapsing

* Hero: `clamp(36px, 5vw, 52px)` — fluid, no breakpoint jumps
* Nav: horizontal → hamburger at 768px
* Cards: 3-col → 2-col → 1-col
* Step progress: horizontal scroll on mobile
* Section spacing: 64–80px → 48px mobile

## 8. Accessibility & States

### States

| State | Treatment |
|-------|-----------|
| Hover | translateY(-1px) buttons, translateY(-2px) + shadow cards |
| Focus | `2px solid #2A8A99` outline, 2px offset |
| Disabled | Opacity 0.5, cursor default |

### Contrast

* Dark (`#2C2C2C`) on white: ~13:1 (WCAG AAA)
* Navy (`#003366`) on white: ~10:1 (WCAG AAA)
* Teal (`#2A8A99`) on white: ~4.6:1 (WCAG AA)
* White on navy: ~10:1 (WCAG AAA)

### Sensitive Content

* Never red for validation — gold/warm tones with supportive messaging
* Crisis resources accessible from every page
* No auto-play media, no strobing effects

## 9. Agent Prompt Guide

### Quick Reference

* Primary CTA: Navy `#003366`
* Secondary CTA: Teal `#2A8A99`
* Celebration CTA: Gold `#D4A574` → `#c49564`
* Background: `#ffffff` / Alt: `#FAFAF8`
* Headings: Navy `#003366` (Cormorant Garamond)
* Body: Dark `#2C2C2C` (Outfit)
* Secondary text: `#888888`
* Border: `1px solid rgba(0,0,0,0.08)`
* Link: Teal `#2A8A99`

### Example Component Prompts

* "Create a hero section on white background. Headline in Cormorant Garamond at clamp(36px, 5vw, 52px) weight 600, line-height 1.10, letter-spacing -1.5px, color #003366. Section label above: Outfit 12px weight 700, uppercase, letter-spacing 2px, color #2A8A99. Subtitle in Outfit 17px weight 400, line-height 1.70, color #888888. Navy CTA button (#003366, 8px radius, 14px 32px padding, white text, 16px, weight 600) and outline button (transparent bg, #003366 text, 1.5px solid #003366 border)."

* "Design a card: white background, 1px solid rgba(0,0,0,0.08) border, 14px radius, 24px padding. Hover shadow: 0 4px 18px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.027), 0 0.8px 3px rgba(0,0,0,0.02), translateY(-2px). Title in Cormorant Garamond 20px weight 600, letter-spacing -0.5px, color #003366. Body in Outfit 14px weight 400, color #888888."

* "Build the dashboard banner: linear-gradient(145deg, #002244 0%, #003366 35%, #1a4a5e 70%, #2A8A99 100%), 20px radius, 32px 36px padding. Greeting in Cormorant Garamond 28px weight 600 white. Day counter 56px weight 700 white letter-spacing -1.5px. Milestone badge: rgba(212,165,116,0.2) bg, #D4A574 text, pill radius. Quote: rgba(255,255,255,0.05) bg, 3px left border rgba(212,165,116,0.4), italic Cormorant Garamond 17px rgba(255,255,255,0.85)."

* "Design step progress: 12 equal 38×38px boxes, 8px radius. Done: #2A8A99 bg, white ✓. Active: #D4A574 bg, white border, glow 0 0 16px rgba(212,165,116,0.4). Future: rgba(255,255,255,0.12) bg, muted number. Label below: Outfit 9px weight 600."

* "Create navigation: white sticky, 68px height, 1px solid rgba(0,0,0,0.08) bottom. Logo: anchor SVG + 'SoberAnchor' Cormorant Garamond 22px weight 700 #003366. Links: Outfit 15px weight 500 #2C2C2C, active #2A8A99 with rgba(42,138,153,0.08) bg pill."

### Iteration Rules

1. Warm neutrals only — grays carry yellow-cream undertones, never blue-gray
2. Cormorant Garamond for headings only — never body, buttons, or UI
3. Letter-spacing scales: -1.5px at 52px, -1.0px at 40px, -0.5px at 22px, normal below
4. Three Outfit weights: 400 (read), 500 (interact), 600 (emphasize)
5. Borders are whispers: `1px solid rgba(0,0,0,0.08)` — never heavier
6. Shadows: multi-layer stacks, individual opacity ≤ 0.06
7. Off-white (`#FAFAF8`) alternation creates section rhythm
8. Gold is earned — milestones, celebrations, active step only
9. Navy anchors — headlines and primary buttons, never floods
10. If it feels clinical, cold, or institutional — it's wrong
