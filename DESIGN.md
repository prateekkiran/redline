---
name: Redline
description: A contract set as a critical edition, each flag a margin gloss keyed to the exact words it quotes.
colors:
  cloth: "#6e1418"
  cloth-deep: "#4e0e11"
  cloth-ink: "#e6c9c4"
  page: "#f6f7f4"
  ink: "#17181b"
  ink-muted: "#55575c"
  rule: "#c9cbc6"
  rubric: "#c4231a"
typography:
  display:
    fontFamily: "Cardo, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(36px, 4.6vw, 64px)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Cardo, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(30px, 3.1vw, 44px)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.012em"
  display-clause:
    fontFamily: "Cardo, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(24px, 2.3vw, 32px)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.008em"
  title:
    fontFamily: "Cardo, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(28px, 2.6vw, 36px)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  subheading:
    fontFamily: "Cardo, Iowan Old Style, Georgia, serif"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.25
  body:
    fontFamily: "Cardo, Iowan Old Style, Georgia, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.55
  gloss:
    fontFamily: "Cardo, Iowan Old Style, Georgia, serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  rank-numeral:
    fontFamily: "Cardo, Iowan Old Style, Georgia, serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 0.9
    fontFeature: "lnum"
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.2
  label-note:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  action: "2px"
spacing:
  gutter: "40px"
  number-column: "48px"
  text-column: "600px"
  margin-column-min: "260px"
  leaf-max: "1180px"
  leaf-pad-x: "56px"
  leaf-gap: "40px"
  cloth-pad: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.page}"
    typography: "{typography.label}"
    rounded: "{rounded.action}"
    padding: "15px 24px"
  button-primary-hover:
    backgroundColor: "{colors.cloth}"
    textColor: "{colors.page}"
  button-on-cloth:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.action}"
    padding: "15px 24px"
  button-on-cloth-hover:
    backgroundColor: "{colors.cloth-ink}"
    textColor: "{colors.ink}"
  leaf:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    padding: "28px 56px 24px"
    width: "{spacing.leaf-max}"
  gloss:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    typography: "{typography.gloss}"
  gloss-active:
    textColor: "{colors.rubric}"
  cloth-band:
    backgroundColor: "{colors.cloth}"
    textColor: "{colors.page}"
---

# Design System: Redline

## Overview

**Creative North Star: "The Annotated Edition"**

Redline sets a contract the way a scholar sets a critical edition. The document is the text; every flag is a gloss in the outer margin, keyed by a rank numeral and a lemma bracket to the exact words it quotes. Oxblood book cloth is the ground everything lies on, and one cool, bright page at a time carries the contract. The reader should feel that the text has been read closely by an editor, not scored by a dashboard.

Density is that of a well-made book: a numbered clause column, a measured text column, and a generous outer margin, separated by hairline rules rather than boxes. Hierarchy comes from type size, italic, numerals and position, never from fills, badges or color coding. Color is nearly absent on the page itself; the single loud mark, rubric red, belongs only to the flag being read. The edition refuses the category's split hero with a dashboard screenshot and traffic-light risk badges.

Motion is ruled and linear, like a pen drawing a line. The one signature movement is the cited sentence lifting out of the text into its ranked place in the margin, and a leader rule drawn from sentence to gloss. Nothing bounces.

**Key Characteristics:**
- Oxblood cloth field; bright page leaves lying on it with cloth showing between them.
- A scholarly book face (Cardo) sets document, glosses and headings; a grotesk (Archivo) sets only controls and small action notes.
- Clause numbers, rank numerals, lemma brackets, running heads, folios and hairline rules are the whole ornament vocabulary.
- Rubric red marks exactly one thing at a time: the active flag.
- Severity is shown by rank order alone.
- Flat: no shadows, gradients, pills, icons or badges.

## Colors

A two-material palette: deep oxblood cloth around a cool near-white page, near-black ink, and one rubric red held in reserve.

### Primary
- **Oxblood Book Cloth** (cloth): the full-bleed ground of the site, the top band carrying wordmark and sign-in, the closing band and colophon. It is also the hover state of the ink action button and the text-selection background. Page-white on cloth measures 11.0:1.
- **Bound Oxblood** (cloth-deep): the darker fold of the cloth; used for the scrollbar track and reserved for recessed cloth surfaces such as the app shell's binding edge.
- **Rubric Red** (rubric): the editor's red. Brackets, rank numeral, underline and leader rule of the active flag only; also the focus outline and text caret. 5.4:1 on the page, so it is legible as text, but its rarity is the point.

### Neutral
- **Edition Page** (page): the cool, bright leaf that carries all document text. Also the text color on cloth, and the fill of the action button when it sits on cloth.
- **Press Ink** (ink): body text, headings, rank numerals at rest, the primary action fill, and the heavier 1px rule that opens the apparatus and variant sections. 16.5:1 on the page.
- **Faded Ink** (ink-muted): line and clause numbers, running heads, folios, clause references, lemmas, inactive brackets, the underline of cited sentences at rest, and secondary notes. 6.7:1 on the page.
- **Hairline** (rule): the 1px dividers between glosses, variants, limits and list items, and under the running head. Never used for text.
- **Cloth Ink** (cloth-ink): muted text on cloth (colophon, closing note) and the hover fill of the action button on cloth. 7.6:1 on cloth.

### Named Rules
**The One Rubric Rule.** Rubric red marks only the flag currently being read: its brackets, rank numeral, cited-sentence underline and leader rule. Every other bracket and cited sentence waits in faded ink. If two flags are red at once, one of them is wrong.

**The Rank Not Rating Rule.** Severity is shown as rank order (1, 2, 3...) only. No Low/Medium/High labels, no traffic-light colors, no severity hues; a label scale is an undecided product item.

**The Cloth Holds, The Page Speaks Rule.** Content lives on the page. The cloth carries only the wordmark, navigation, the closing call and the colophon.

## Typography

**Display Font:** Cardo (with Iowan Old Style, Georgia, serif), regular 400 and bold 700, roman and italic, self-hosted via next/font.
**Body Font:** Cardo, the same face.
**Label/Mono Font:** Archivo (with Helvetica Neue, Arial, sans-serif), width axis loaded, for controls and action notes only.

**Character:** Cardo was drawn for scholarly critical editions, so the document and its apparatus speak in one bookish voice; Archivo is the plain tool-hand that marks what can be pressed.

### Hierarchy
- **Display** (400, clamp(36px, 4.6vw, 64px), 1.05): the closing line on the cloth.
- **Headline** (400, clamp(30px, 3.1vw, 44px), 1.12, balanced wrap, max 19em): the one-line promise on the first leaf.
- **Display Clause** (400, clamp(24px, 2.3vw, 32px), 1.2): the top-ranked cited sentence set large inside rubric brackets, hanging the opening bracket outside the measure.
- **Title** (400, clamp(28px, 2.6vw, 36px), 1.15): leaf headings.
- **Subheading** (400, 22px, 1.25): section heads within a leaf; limit heads run at 21px.
- **Body** (400, 18px, 1.55, max 58-62ch): contract clauses and prose. Contract titles and section heads inside the document use bold 700 at 20px and 17px.
- **Gloss** (400, 15-16px, 1.4-1.45): the plain reading of a flag. Counter-offer variants run at 17px, 1.5.
- **Reference** (italic, 15px, faded ink): "Clause 3.1" lines, running heads (italic 15px), questions in a Q&A exchange.
- **Lemma** (400, 14px, 1.32, faded ink): the quoted sentence repeated in the margin, closed by a bracket.
- **Rank Numeral** (400, 34px, 0.9, lining figures): the flag's rank, ink at rest, rubric when active.
- **Numbers** (15px, lining tabular figures, right-aligned, faded ink): clause and line numbers.
- **Label** (Archivo 600, 16px): action buttons. Archivo 400 at 14.5-15px sets action notes and the sign-in link.

### Named Rules
**The Two Hands Rule.** Cardo for anything that is read, Archivo for anything that is pressed or that explains a press. Do not set document text, glosses or headings in Archivo, and do not set buttons in Cardo.

**The Italic Is Apparatus Rule.** Italic marks the editorial layer (running heads, clause references, questions, the empty-margin note), never emphasis inside contract text.

## Layout

The page is a stack of leaves on cloth. Each leaf is the page color, at most 1180px wide, centered, padded 28px top, 56px sides, 24px bottom, with 40px of cloth between leaves and 24px of cloth at the viewport edge. Every leaf opens with a running head (title left, note right, italic, hairline beneath) and closes with a centered folio numeral.

Inside a leaf, the edition grid is three columns: a 48px right-aligned number column, a text column up to 600px, and an outer margin of at least 260px, with a 40px gutter. Content that is not a numbered clause (headings, apparatus, variants, the four-up feature grid) indents by the number column plus gutter (88px) so it aligns with the text column. On the full agreement, each margin gloss is hung level with the sentence it quotes; when a gloss is taller than its clause, space opens under that clause so no gloss drifts away from its words. Without script, glosses stack in order.

Below 900px the margin folds in: the grid becomes a 34px number column and one text column with a 12px gutter, each gloss sits directly beneath the clause it cites, separated by a hairline, and the leader rule is dropped. Leaves tighten to 20px/18px padding with 24px between, the cloth edge narrows to 10px, running heads stack, the apparatus stacks with a full-width action, and the first leaf shows only the top-ranked flag.

Spacing is set by eye in a loose 2px/4px-multiple rhythm (14, 18, 22, 24, 28, 32, 36, 40px recur); there is no enforced 8px scale.

### Adapting to the app shell (guidance, not yet built)

The signed-in shell (Operate mode) inherits this world at a restrained setting. This section is direction for a surface that does not exist yet; re-run documentation once it is built.
- The bright page dominates the viewport and carries the user's document with clause or line numbers in the number column.
- The oxblood cloth narrows to a binding edge (cloth or cloth-deep) at one side, holding navigation: document, red lines, library. The cloth stops being a field and becomes the spine.
- Flags hang as glosses in the outer margin, ranked by numeral, keyed by lemma bracket, with the same hang-to-sentence behavior.
- Counter-offers sit as variant readings beneath each gloss, in the variant style.
- Questions work like margin queries: italic question, answer indented, followed by its clause reference, or a plain statement that the document doesn't say.
- On narrow screens, glosses fold in beneath the paragraph they cite, exactly as on the landing page.
- Rubric red still marks only the gloss being read.

## Elevation & Depth

The system is flat. There are no shadows and no gradients. Depth is material, not lit: bright page lying on dark cloth, with cloth showing between leaves. Within a page, structure comes from 1px rules: hairline for dividers between peers, ink for the rule that opens a new apparatus (the action row, the variant list).

### Named Rules
**The Paper On Cloth Rule.** Separation is achieved by placing page on cloth or by drawing a rule. Never lift anything with a shadow, glow or gradient.

## Shapes

Rectangular and square-cornered. Leaves have no radius. The only rounding is a near-square 2px on action buttons, and 3px on the favicon's cloth square. Forms are drawn with brackets, numerals and 1px rules, not containers: there are no cards, pills, chips, badges or icon glyphs. The favicon is the world in miniature: a page on cloth with a binding stroke and a single rubric line.

## Components

### Buttons
The press of a stamp: solid, quiet, square.
- **Shape:** nearly square corners (2px).
- **Primary:** ink fill, page-white Archivo 600 at 16px, 15px by 24px padding. Sits in the apparatus at the foot of the first leaf beside its note.
- **Hover / Focus:** fill shifts to oxblood cloth over 160ms linear; focus shows a 2px rubric outline offset 3px.
- **On cloth:** page fill with ink text; hover to cloth-ink. Focus outline turns page-white on cloth.
- Links are text with a 1px underline offset 0.22em; there is no ghost or pill button.

### Navigation
- **Cloth band:** wordmark in Cardo bold 28px (24px narrow) and a Sign in link in Archivo 15px, both page-white on cloth, baseline-aligned at the band's ends. The colophon repeats the pattern under a translucent page-white hairline.

### Gloss (signature component)
A margin note keyed to a sentence.
- Two-column grid: 34px rank numeral column, 10px gap, then the note.
- Note stack: italic clause reference (faded ink), the lemma (the quoted sentence at 14px in faded ink, closed by a bracket), then the plain reading.
- Peers separate with a hairline and 18px spacing; the last has none.
- **Active:** rank numeral and bracket turn rubric (160ms linear). Hover, focus or click selects a gloss; it is a focusable group with an accessible label naming rank and clause.

### Cited Sentence
- At rest: underlined 1px in faded ink, offset 0.24em.
- Active: text and underline turn rubric and the underline thickens to 2px, with a leader rule (1px rubric, orthogonal path) drawn from the sentence's end to the gloss's numeral.
- On the first leaf, the top-ranked sentence is set at display-clause size inside live rubric brackets.

### Variant Reading (counter-offer)
- Same numeral grid as a gloss, separated by hairline top rules, under an ink rule and a subheading.
- Clause reference closed by a bracket; counter-offer text at 17px. Hovering a variant makes its flag active everywhere.

### Clean Result
- Clause rows with no cited underlines, and the outer margin left empty except for one italic faded-ink note. A footnote under a hairline states what clean does not mean. The empty margin is the designed result.

### Motion
- **Lift:** when the full agreement scrolls 20% into view on wide, motion-allowed screens, each cited sentence turns rubric and a copy travels to its ranked place in the margin (Web Animations, cubic-bezier(0.16, 1, 0.3, 1), 900ms, staggered 260ms by rank). The lift ends by ruling the leader to the top flag.
- **Leader rule:** drawn by stroke-dashoffset, 520ms linear.
- **State color:** 160ms linear.
- **Reduced motion:** the final state is shown immediately, with no lift.

## Do's and Don'ts

### Do:
- **Do** keep rubric red on exactly one flag at a time: its brackets, numeral, cited underline and leader rule.
- **Do** show every flag with its rank numeral, its clause reference and its exact quoted sentence.
- **Do** separate peers with 1px hairlines and open a new apparatus with a 1px ink rule.
- **Do** align non-clause content to the text column (88px in from the leaf's content edge on desktop).
- **Do** fold margin glosses beneath their clause below 900px.
- **Do** keep the cloth for wordmark, navigation, closing call and colophon; put all content on the page.
- **Do** design the clean state as an empty margin with one plain note.
- **Do** honor reduced motion by showing the final state.
- **Do** run all user-facing copy through the humanizer skill before it ships.

### Don't:
- **Don't** use drop shadows, gradients, pills, chips, badges or icon glyphs.
- **Don't** label or color severity (no Low/Medium/High, no traffic lights); rank order is the only severity signal.
- **Don't** set document text, glosses or headings in Archivo, or controls in Cardo.
- **Don't** use rubric red for decoration, headings, links, or more than one flag.
- **Don't** add bounce, spring or overshoot to motion; movement is ruled and linear in feel.
- **Don't** round corners beyond the action button's 2px.
- **Don't** replace the edition with a split hero and a dashboard screenshot.
