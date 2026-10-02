# Brand system — design C, modern refresh

**2026-10-02, operator: "work with what we got and make it have a modern feel and look to it".** The content, structure and Vue brand colours are unchanged. The look moved from editorial to modern:
- **Type.** Inter Tight (sans, 650–700, tight tracking) replaces the Fraunces serif for display. Body stays Instrument Sans.
- **Grounds.** Cool white and blue-grey (#ffffff / #f3f6fa) replace warm paper and sand.
- **Buttons and labels.** Primary buttons are azure (white on azure-deep, 6.42:1). Section labels are small uppercase pill chips.
- **Surfaces.** Soft azure and gold glows sit behind the hero and the page heroes. Cards have soft surfaces and larger radii (18/28px). Navy sections use a gentle gradient.
- **Booking section.** It is a rounded navy card with the map inside.
- **Accents.** Gold is kept for stars. Secondary accents on navy are sky (#7cc6ea, 9.13:1).
- **Removed.** The drop cap and the iris-ring decorations are gone.

The sections below describe the earlier editorial version where they differ (typefaces, paper colours, italic labels). The tokens in `src/styles/tokens.css` are the current truth.

Every value lives in `src/styles/tokens.css`; `site.css` holds no colour or font literal. Change a value there, never at a call site.

## Colour

The four brand colours are Vue Eyecare's own, measured from computed style on the live site by `sr-tokens` (`audit/source-tokens.css`, `audit/design-baseline.json`).

| token | value | role |
|---|---|---|
| `--navy` / `--ink` | #001b3a | text, ink sections (doctor, reviews, footer), primary buttons |
| `--azure` | #0878aa | decorative rings; never text on navy (3.51:1) |
| `--azure-deep` | #066590 | links and text-azure on paper (5.90:1) |
| `--gold` | #eaaf2f | accents on navy, stars, CTA band, gold buttons |
| `--gold-ink` | #7a5300 | gold-family text on paper (6.30:1) |
| `--paper` | #f8f5ef | page ground |
| `--paper-2` | #efe8db | interior heroes and the eyewear/insurance ledger band |
| `--muted` | #4a5a70 | secondary text (6.46:1 on paper, 5.77:1 on paper-2) |
| `--on-ink-muted` | #b9c6d8 | secondary text on navy (9.96:1) |

The contrast ratios above are WCAG 2.x values, computed during this build.

## Type

- **Fraunces** (variable serif with an optical-size axis) is used for every heading, the intro standfirst, review quotes, the brand name and kickers. Display sizes use `opsz` 144 and small sizes drop to 18–24.
- **Instrument Sans** (variable) is used for body, UI and buttons.
- The scale runs `--fs-xs` to `--fs-hero`. Display steps are fluid `clamp()` values.

## Shape and motif

- **Photo frames.** Every photo sits in a plain rounded rectangle (`--photo-r`, 24px corners). The doctor portrait alone is a circle. Arch frames were dropped on 2026-10-01 at the operator's request.
- **The iris.** Thin concentric rings (`.iris`, four spans, CSS only, `aria-hidden`) appear behind the doctor block, the CTA band and the footer. They are static. The rings behind the hero photos framed the old arch and were removed with it.
- **Logo tiles.** Designer-frame and insurance logos sit in white tiles, with the last row centred. Column counts are picked per breakpoint so the last row is as full as possible: 41 frames → 7/6/3 columns, 27 plans → 7/4/3. Every source logo file shares one 1.21:1 canvas with very different amounts of padding, so each logo is cropped to its measured ink box (`audit/logo-ink.json`) and shown at the same visual area (width 62px × √aspect, max 140px).
- **Image + copy rows.** In the home feature rows the photo fills the row height the copy sets (floor `--feature-min`, 260px). Stacked on narrow screens, the photo returns to 5:4.
- **Bands.** Interior copy sits in full-width bands, one per source H2: the heading in a narrow left column (sticky on desktop) and the copy beside it, on alternating paper and sand grounds. Bands stack on screens of 900px and narrower.
- **Labels.** Every home section and every page hero has a gold italic label (Fraunces, with the iris icon). Labels are navigation labels, never claims.
- **Buttons.** All buttons are pills: ink (primary), gold (on navy and gold), and line and line-light (secondary).

## Motion

- **Reveal on scroll.** A 700 ms fade and 18px rise, staggered 90 ms per card. It applies only when JS runs.
- **Hover.** Image zoom on cards (1.04) and a 1px button lift.
- **Reduced motion.** Everything above is off under `prefers-reduced-motion: reduce`. The source's own keyframes inventory is kept in `src/styles/motion.css` as the record. It is not shipped, because the redesign does not reuse the old platform's animation.

## Accessibility

- **Touch targets.** Every target is at least 44px at touch widths (834px and below). Inline prose links get an invisible hit-area pad.
- **Semantics.** Each page has one H1, landmarks, a skip link, and mega menus driven by `aria-expanded` buttons. The phone drawer is a modal dialog that returns focus.
