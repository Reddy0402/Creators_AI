---
name: CreatorOS AI
description: "Neo-brutalist design system for the AI campaign studio — warm off-white canvas, thick ink borders, hard offset shadows, electric-lime primary, Space Grotesk + Inter."
colors:
  canvas: "#f7f4ed"
  surface: "#ffffff"
  ink: "#171717"
  line: "#171717"
  ink-soft: "#454545"
  ink-mute: "#666666"
  lime: "#c4f53c"
  lime-soft: "#eafcb4"
  coral: "#ff6b4a"
  coral-soft: "#ffdcd2"
  lav: "#b8a6ff"
  lav-soft: "#e7e0ff"
  accent: "#c4f53c"
  accent-hover: "#b6e82f"
  error: "#d92d20"
  error-soft: "#fee4e2"
  success: "#12805c"
  success-soft: "#def7ec"
  warning: "#b54708"
  warning-soft: "#fef0c7"
  info: "#175cd3"
  info-soft: "#d1e9ff"
typography:
  display:
    fontFamily: "Space Grotesk, Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 700
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    lineHeight: 1.5
rounded:
  default: "0px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
shadows:
  xs: "2px 2px 0 0 #171717"
  sm: "3px 3px 0 0 #171717"
  md: "4px 4px 0 0 #171717"
components:
  button-primary:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    border: "2px solid {colors.ink}"
    shadow: "{shadows.sm}"
    rounded: "0px"
    padding: "10px 16px"
    typography: "14px / 600 Inter"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "2px solid {colors.ink}"
    shadow: "{shadows.sm}"
    rounded: "0px"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    border: "none"
  card:
    backgroundColor: "{colors.surface}"
    border: "2px solid {colors.ink}"
    shadow: "{shadows.md}"
    rounded: "0px"
    padding: "24px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "2px solid {colors.ink}"
    rounded: "0px"
    padding: "8px 12px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    border: "2px solid {colors.ink}"
    shadow: "{shadows.xs}"
    rounded: "0px"
    padding: "2px 10px"
    typography: "12px / 600 Inter"
---

# Design System: CreatorOS AI — Neo-Brutalist

## Overview

**Creative North Star: "The Bold Poster."**

CreatorOS is an expressive, confident, tactile marketing SaaS. The interface reads like a printed poster stapled to a wall: a warm off-white canvas, near-black ink doing the structural work (text *and* borders), hard offset shadows for depth, and a single electric-lime accent that always means "this is the action." Typography is bold and editorial — Space Grotesk for headings, Inter for interface text.

This replaces the earlier dark "control room" system. The old rules that no longer apply: no tonal dark surfaces, no 1px hairline borders, no 8/12px soft radii, no "One Violet Rule."

**Key Characteristics:**
- Light theme (`color-scheme: light`), warm off-white canvas `#f7f4ed` with a faint dot grid.
- Near-black `#171717` ("ink") carries both text and every structural border — borders are 2px, never 1px.
- Depth is a hard offset shadow in pure ink (no blur, no color): 2px chips, 3px buttons, 4px cards.
- One accent voice — electric lime `#c4f53c` — for the primary action, active nav, and focus-adjacent highlights. Coral and lavender are supporting accents for secondary emphasis and status.
- Sharp corners (0px radius) everywhere; a full-pill radius appears only on status dots/badges that need it.

## Colors

A warm off-white canvas with a near-black ink layer and a lime-coral-lavender accent set. Status colors are darkened to stay ≥4.5:1 on white and canvas.

### Surfaces
- **Canvas** (`#f7f4ed`): Page background, warm off-white with a faint 1px dot grid.
- **Surface** (`#ffffff`): Cards, panels, inputs, and most interactive fills.

### Ink (text + structure)
- **Ink** (`#171717`): Headings, body emphasis, **and all borders**.
- **Ink Soft** (`#454545`): Secondary text, ghost-button text, metadata labels.
- **Ink Mute** (`#666666`): Placeholders, muted text, tertiary metadata, disabled-leaning.

### Accents
- **Lime** (`#c4f53c`): The primary accent — primary buttons, active navigation, active tabs, the step indicator, icon tiles. **Lime-Soft** (`#eafcb4`) is its pale fill for tints.
- **Coral** (`#ff6b4a`): Secondary accent — section-number tiles, the keyboard focus ring, the "saved" star, destructive emphasis. **Coral-Soft** (`#ffdcd2`) for tints.
- **Lavender** (`#b8a6ff`): Supporting accent — stat tiles, "Completed" status, tagline-style tints. **Lav-Soft** (`#e7e0ff`) for tints.

**The One-Lime Rule.** `#c4f53c` is reserved for the primary action, active navigation, and active states. If an element isn't the primary action or an active state, it is not lime. Its rarity is what makes the primary action read as primary.

### Status (accessible on white/canvas)
- **Error** (`#d92d20`) on **Error-Soft** (`#fee4e2`)
- **Success** (`#12805c`) on **Success-Soft** (`#def7ec`)
- **Warning** (`#b54708`) on **Warning-Soft** (`#fef0c7`)
- **Info** (`#175cd3`) on **Info-Soft** (`#d1e9ff`)

Status colors fill a banner/chip's soft background; the dark text variant carries the text and icon so contrast holds.

## Typography

**Display Font:** Space Grotesk (headings, section titles, numbers, card titles, large taglines)
**Body Font:** Inter (form content, descriptions, generated copy, labels)

Both load from Google Fonts with `display=swap`. Hierarchy is carried by font family (display vs body), size, and weight.

### Hierarchy
- **Display** (Space Grotesk, 700): Page titles (24–36px), section headings (18–20px), card titles (16px), stat numbers (30px).
- **Body** (Inter, 400, 14px, 1.5): The default working size — form content, descriptions, generated copy.
- **Label** (Inter, 600–700, 12px, uppercase where used): Badges, chips, metadata, form labels, button text.

**The Display-For-Emphasis Rule.** A heading or number that should "pop" uses Space Grotesk at 700; running text stays Inter. Never set body copy in Space Grotesk.

## Layout

Container-centered pages on the dot-grid canvas, max-width ~64rem. Panels (`.card`) are the unit of structure: white, 2px ink border, 4px hard shadow, 16–24px internal padding. The dashboard uses a responsive card grid; the workspace stacks the header, a tab bar, and one active panel. Spacing follows a 4/8px rhythm: 8px within clusters, 16px between groups, 24px between major regions, 40px (space-y-10) between workspace regions.

## Elevation & Depth

Depth is a **hard offset shadow in pure ink** — no blur, no color. The scale is fixed:

- **xs** — `2px 2px 0 0`: chips, badges, small icon tiles.
- **sm** — `3px 3px 0 0`: buttons at rest, icon tiles, stat tiles.
- **md** — `4px 4px 0 0`: cards, banners, the image-preview dialog.

**The Tactile-Press Rule.** Buttons and tab/chip controls are tactile: at rest they carry a `sm` shadow; on `:active` the shadow collapses to `0 0 0 0` and the element translates by the shadow offset (3px, 3px), so it looks pressed into the page. On hover the shadow grows by 1px. This press feedback must respect `prefers-reduced-motion` (see below).

**The Surface-Step Rule (updated).** A nested row or control that sits *inside* a card uses the canvas fill with a 2px ink border (the `.panel` pattern) — it is a step down, not a step up. Shadows are reserved for elements resting on the page background; an element nested inside another shadowed surface does not add a second shadow.

## Shapes

Sharp corners are the system. Radius is `0px` on cards, buttons, inputs, chips, and panels. A full-pill radius appears only on genuinely round elements (e.g. a status dot). Borders are 2px ink and do the structural work that soft themes hide behind shadows.

## Components

### Buttons
- **Primary:** Lime fill, 2px ink border, ink text, `sm` hard shadow, `px-4 py-2.5`, 14px/600. One per view for the main action.
- **Secondary:** White (surface) fill, 2px ink border, ink text, `sm` hard shadow. Tint text (e.g. `text-error`) for a destructive secondary like "Delete campaign."
- **Ghost:** Transparent, ink-soft text, no border or shadow; hover takes a faint `ink/5` fill. For tertiary actions and toolbars.
- **Disabled:** 50% opacity, `not-allowed` cursor, no shadow change, on all variants.
- **Press:** `:active` collapses the shadow to zero and translates the button by the offset (see Tactile-Press Rule).

### Inputs / Fields
- **Style:** Surface (white) fill, 2px ink border, 0px radius, 14px ink text, `px-3 py-2`.
- **Focus:** The global coral focus ring (3px) applies; the field additionally tints its background to `lime-soft` and gains a 2px shadow so the focused input reads clearly.
- **Placeholder:** `ink-mute`.
- **Disabled:** 60% opacity, `not-allowed` cursor.

### Cards / Containers
- **Shape:** 0px radius.
- **Background:** Surface; **2px ink border; `md` hard shadow.**
- **Internal Padding:** 16px (p-4) for compact panels, 24px (p-6) for primary cards.
- **Hover (interactive cards, e.g. campaign cards):** shadow grows to a larger offset and the card translates on `:active`.

### Badges / Chips (`.chip`)
- **Style:** 0px radius, 2px ink border, surface (or a soft status/accent) fill, ink text, 12px/600, `xs` hard shadow. Status variants tint the fill (success-soft, lav-soft, coral-soft, lime-soft) and keep ink text for contrast.

### Forms
- **Section grouping:** Long forms (campaign creation) split into numbered sections (01, 02, …), each a `.card` with a coral number tile and a Space Grotesk heading. A workflow step indicator near the top shows the current stage.
- **Labels:** Visible, 14px/600 ink, with a coral `*` (and sr-only "required") for required fields.
- **Errors:** Below the field, coral-red `error` text with an alert icon, announced via the field's `aria-describedby` where wired.
- **Feedback:** Loading states show a bordered square spinner; success toasts are a green-soft bordered card bottom-right.

### Navigation
- **Sidebar (desktop) / top bar (mobile):** White surface, 2px ink border on the edge.
- **Links:** Icon + label, ink-soft text. The active route is a lime, ink-bordered, `xs`-shadowed tile — the active state *is* the accent.

## Do's and Don'ts

### Do:
- **Do** use 2px ink borders and hard ink offset shadows (2/3/4px) for all structure and depth.
- **Do** reserve lime for the primary action, active nav, and active states; use coral for focus and secondary emphasis, lavender for supporting tints.
- **Do** set headings and emphasis numbers in Space Grotesk 700 and keep running text in Inter.
- **Do** give every button a tactile press (shadow collapse + translate) and every control a visible coral focus ring.
- **Do** honor `prefers-reduced-motion` by disabling the press translate and hover-grow.

### Don't:
- **Don't** reintroduce the dark control-room palette, tonal (shadow-free) depth, or 1px hairline borders.
- **Don't** use rounded (6/8/12px) corners on cards, buttons, inputs, or chips — the system is sharp.
- **Don't** use blurred or colored shadows; depth is a pure-ink hard offset.
- **Don't** place lime on more than the primary action and active states in a single view.
- **Don't** rely on hover alone for feedback, or use a color as the sole state indicator without text/icon.
