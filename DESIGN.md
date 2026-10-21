# SkillBridge AI design system

## 1. Purpose and scope

Use this file to generate, extend, or critique every SkillBridge AI interface.

SkillBridge AI is a Malaysian skills-based talent platform. It connects candidate profiles, private resume intelligence, explainable job matching, skills-gap guidance, internal employer postings, and authorized external opportunities.

Support:

- Responsive web on desktop, tablet, and mobile.
- Light and dark themes.
- Public marketing, candidate, employer, and administration surfaces.

Do not treat this as a generic AI SaaS template.

## 2. Product and user principles

Primary users are Malaysian graduates and career changers. Employers and platform administrators are secondary users.

Design for these jobs:

- Understand which roles fit a candidate’s confirmed skills.
- Explain why a score exists before emphasizing the score.
- Improve how a resume communicates genuine evidence.
- Distinguish ATS readiness from job-description alignment.
- Identify the next useful skill or documentation action.
- Discover attributed internal and authorized external vacancies.
- Preserve human control over applications and hiring decisions.

Apply these principles:

1. Explain before celebrating.
2. Put the next useful action above decorative analytics.
3. Skills open the door; people make the decision.
4. Label demonstration, inferred, unverified, stale, and unavailable data explicitly.
5. Never imply that a score predicts hiring, eligibility, or competence.
6. Use calm, direct, evidence-first language.

Brand personality: grounded, warm, transparent, capable, and quietly optimistic. Avoid hype, futurism, and institutional coldness.

## 3. Visual hierarchy and layout rules

- Give each viewport one primary focal point.
- Use sentence case. Reserve uppercase tracking for infrequent 10–13 px status or category labels.
- Keep headings closer to their supporting content than to the preceding section.
- Use whitespace or dividers before adding containers.
- Do not wrap every section in a card.
- Use cards for peer records, summaries, or genuinely raised surfaces.
- Use a tinted sidebar for product navigation. Do not use a full-black sidebar.
- Use at least three content types in dashboard viewports: metric, chart, table, list, form, or explanatory panel.
- Differentiate one primary metric; keep secondary metrics neutral.
- Use split or asymmetric layouts only when they improve comprehension.
- Keep public page sections between the established `1192px` and `1240px` maximum widths.
- Keep the opportunity workspace’s source rail, results list, and detail panel relationship on wide screens.
- Use `font-variant-numeric: tabular-nums` for scores, counts, percentages, dates in tables, and comparable values.
- Keep prose lines approximately 50–75 characters where practical.

## 4. Token and visual-system guidance

Consume semantic CSS variables. Do not place primitive hex values inside new components.

### Light theme

| Role | Token | Current value |
| --- | --- | --- |
| Canvas | `--background`, `--surface-canvas` | `#F5F8FC` |
| Primary ink | `--foreground` | `#0B1D3A` |
| Raised surface | `--card`, `--surface-raised` | `#FFFFFF` |
| Overlay surface | `--surface-overlay` | `#F9FBFE` |
| Primary action | `--primary` | `#075CC5` |
| Primary hover | `--primary-hover` | `#06499E` |
| Primary action ink | `--primary-foreground` | `#FFFFFF` |
| Secondary surface | `--secondary` | `#EDF3FA` |
| Soft accent | `--accent-soft` | `#E3F5FC` |
| Cyan accent | `--accent` | `#08AEE8` |
| Supporting violet | `--accent-violet` | `#7047E8` |
| Muted ink | `--muted` | `#52647D` |
| Muted foreground | `--muted-foreground` | `#687991` |
| Border | `--border` | `#D8E2EF` |
| Input border | `--input` | `#AFC2D9` |
| Focus ring | `--ring` | `#168FD5` |
| Success | `--success` | `#2F6B54` |
| Warning | `--warning` | `#956018` |
| Danger | `--danger` | `#B3423D` |
| Information | `--information` | `#536C79` |

### Dark theme

Use the existing `[data-theme="dark"]` semantic remapping. The canvas is midnight navy `#061126`; the card is raised navy `#0C1B35`. Do not use pure black. Raise dark surfaces by increasing luminance and border contrast, not by copying light-mode shadows.

### Color rules

- Keep at least 90% of each viewport neutral.
- Use primary blue for actions and selections.
- Use cyan for focused emphasis and violet only as a small supporting brand accent, never as a competing action.
- Use success, warning, danger, and information colors only for their semantic meanings.
- Preserve official SDG colors only where SDG identity is being represented.
- Do not use decorative neon treatments, multi-colour gradients, or gradient text. The logo's blue, cyan, and violet are controlled brand colours, not a general licence for high-saturation decoration.

### Typography

- Product body and product headings: `Instrument Sans`.
- Landing-page display copy only: `Fraunces`.
- Use no more than three visible font weights per viewport.
- Tighten headings above 24 px with approximately `-0.02em` to `-0.04em` tracking.
- Do not use Inter, Roboto, Arial, or a system stack as visible brand typography.
- Keep Fraunces out of forms, tables, navigation, dashboards, and document data.

### Spacing

The codebase does not yet define a canonical spacing-token scale. `[NEEDS TEAM INPUT]`

Until one exists:

- Reuse spacing already present in the component family being changed.
- Maintain `within < between < section` at every nesting level.
- Do not add arbitrary one-off spacing values merely to patch alignment.

### Radius

- Inputs and small chips: 5–7 px.
- Buttons: 7 px.
- Cards and structured panels: 9–12 px.
- Modal, hero, and major overlay surfaces: 14–18 px.
- Circles are reserved for avatars, status dots, score rings, and true circular controls.
- Do not apply one radius to every component.

### Elevation

- Prefer tonal surface separation and borders for dense product UI.
- Use the existing layered `--shadow` only for genuinely raised surfaces.
- Avoid heavy shadows on every card.
- Use stronger elevation only for overlays, menus, and focused document previews.

### Motion

- Keep routine UI feedback between 100 and 300 ms.
- Use 400 ms only for large spatial transitions or score changes.
- Animate `transform` and `opacity` for spatial motion.
- List transitioned properties explicitly. Never use `transition: all`.
- Do not use bounce or elastic motion for routine product actions.
- Gesture-driven interactions must be interruptible and must not use CSS keyframes.
- Honor `prefers-reduced-motion`; retain state feedback through instant changes or short crossfades.
- A spring/gesture library is not currently installed. `[NEEDS TEAM INPUT]`

## 5. Component selection and usage rules

The application uses hand-built React components, semantic HTML, Lucide icons, Recharts, and shared CSS/Tailwind tokens. There is no external component library or Storybook.

### Buttons

- Use one solid primary action per view section.
- Use `.button.secondary` for supporting actions.
- Use `.text-link` for tertiary actions.
- Use `.icon-button` only when the icon has an accessible name.
- Use danger styling only for destructive actions.
- Provide rest, hover/focus, active, disabled, loading, and success feedback where relevant.
- Use a specific verb and outcome. Avoid “Learn more,” “Submit,” and “Click here.”

### Navigation

- Public navigation remains a compact top bar.
- Authenticated workspaces use the role-aware sidebar and top bar.
- Resume tools use horizontal tabs with an active underline.
- On mobile, preserve accessible labels even when visible text is reduced.
- Keep route and active-state behavior consistent with React Router links.

### Forms

- Use visible `<label>` elements.
- Keep inputs at least 44 px high on touch layouts.
- Validate inline and state the next corrective action.
- Do not block paste.
- Preserve native input, select, details, and file controls unless replacement behavior is fully accessible.
- Keep destructive changes confirmable or recoverable.

### Cards and panels

- Use `.panel` for a coherent raised region, not for every content group.
- Use flat rows and dividers for lists, tables, histories, and opportunity results.
- Give selected rows a background or indicator plus text/state—not color alone.
- Do not build nested rounded cards.

### Tables and structured lists

- Use a real table when column relationships must be read across rows.
- Responsive row grids may replace tables only when semantics remain clear.
- Align comparable numbers and use tabular numerals.
- Provide loading, empty, partial, and error states.

### Icons

- Use Lucide only. Do not mix icon families.
- Default product icon sizes are 16–20 px unless the component already defines another size.
- Do not use emoji as product icons.
- Do not use a decorative icon when text already communicates the same information.

### Charts and scores

- Use Recharts for existing data visualizations.
- Use bars for categorical comparison and area/line charts for time series.
- Do not use 3D charts or multi-segment pie charts.
- Explain every score with criterion-level evidence and limitations.
- Keep ATS readiness and job alignment visually and conceptually separate.

### Empty, loading, success, and error states

- Empty: explain why the state is empty and provide one primary next action.
- Loading: use a skeleton matching the final geometry; avoid generic spinners where layout is known.
- Error: name what failed and what the user can do next.
- Success: provide text or an icon change, not color alone.
- Partial/unknown: use explicit language or an em dash. Never substitute zero, fake data, or `N/A` when the value is unknown.

## 6. Interaction states and behavior

- Respond on pointer-down for pressable controls when the implementation supports it.
- Keep keyboard and pointer behavior equivalent.
- Use `:focus-visible` with the semantic ring token and visible offset.
- Do not lock unrelated interface regions during asynchronous work.
- Keep long-running operations cancelable when technically possible. `[NEEDS TEAM INPUT: upload cancellation contract]`
- Preserve spatial entry and exit paths for drawers, sheets, menus, and overlays.
- Anchor menus and filters to their trigger.
- Use scrims only when interaction outside an overlay must pause.
- Do not infer external-application success after opening another website.
- Do not animate high-frequency keyboard, toggle, typing, or table-selection actions.

## 7. Content and microcopy guidance

- Use plain Malaysian English. `[NEEDS TEAM INPUT: required locale variants]`
- Lead with the user outcome, then explain the mechanism.
- Keep button labels specific: “Analyze latest resume,” “Search opportunities,” “Apply on source.”
- Use “match score,” “readiness,” “alignment,” and “recognized evidence” consistently.
- Never call a heuristic score a probability, guarantee, ranking verdict, or official ATS score.
- Say “not detected” or “not recognized in this document,” never “you do not have this skill.”
- Mark seeded records as “Demo” or “Demonstration.”
- Mark extracted requirements as “Unverified.”
- Mark unavailable integrations as “Integration Pending.”
- State when an external description is only a snippet.
- Avoid hype words: revolutionary, magical, perfect, guaranteed, effortless.
- Avoid em-dash-heavy prose inside UI. Split ideas into separate sentences or elements.
- Use date, number, salary, and relative-time formatting according to the user’s decision context. Exact locale rules are `[NEEDS TEAM INPUT]`.

## 8. Accessibility requirements

Target standard: `[NEEDS TEAM INPUT: formally adopt WCAG 2.2 AA]`.

Current minimum requirements:

- All functionality must be keyboard reachable.
- Use semantic buttons and links. Do not place click behavior on non-interactive containers without full keyboard semantics.
- Maintain visible `:focus-visible` treatment.
- Provide accessible names for icon-only controls.
- Use labels for every input.
- Keep touch targets at least 44 px where practical; never below 24 px.
- Do not communicate state through color alone.
- Preserve readable contrast in both themes.
- Add `aria-busy` for loading regions and live announcements for consequential asynchronous status changes.
- Honor `prefers-reduced-motion` without removing essential feedback.
- Keep focus trapped only inside true modal dialogs and return focus to the trigger on close.
- Test at 200% zoom and with browser text enlargement.
- Maintain meaningful DOM order when visual columns collapse.

## 9. Responsive behavior

Current CSS breakpoints:

- `1180px`: opportunity workspace drops the persistent right detail column.
- `950px`: public navigation collapses; shell sidebar compacts; major dashboard layouts stack.
- `850px`: resume analysis and job-match layouts stack.
- `820px`: opportunity search becomes two columns; source rail hides.
- `680px`: primary mobile breakpoint; layouts become single-column and navigation labels may compact.
- `560px`: opportunity cards and actions adopt narrow-phone layout.

Rules:

- Design mobile behavior explicitly. Do not rely only on natural wrapping.
- Preserve the primary action above the fold when possible.
- Convert wide tables into labeled rows or horizontal scrolling without hiding essential data.
- Keep mobile actions full-width only when the action hierarchy benefits.
- Avoid hiding meaning-bearing text solely to save space.
- Prevent horizontal overflow from long titles, emails, filenames, and provider names.
- Use `min-width: 0`, wrapping, or deliberate truncation with a discoverable full value.
- Safe-area inset support is `[NEEDS TEAM INPUT]`.

## 10. AI-specific UI patterns

SkillBridge currently uses deterministic local rules, not a generative model.

- Describe outputs as estimates, guidance, extracted signals, or advisory matches.
- Show criterion breakdowns and recognized/missing evidence.
- State the algorithm version where history or auditability matters.
- Separate source facts from locally inferred or extracted values.
- Let candidates confirm resume-derived skills before profile import.
- Never train on or transmit private resumes without explicit consent.
- Treat external listing text as untrusted input.
- Never allow listing text to become system or agent instructions.
- If a future AI provider is added, disclose the provider, transmitted data, purpose, retention, and local fallback. `[NEEDS TEAM INPUT]`
- Keep core deterministic matching available without a paid model or API key.

## 11. Anti-patterns and prohibited choices

- No purple/violet AI gradients or gradient text.
- No generic corporate-blue treatment that ignores the supplied logo's navy/cyan hierarchy.
- No pure-black dashboards or sidebars.
- No decorative gradient text, glows, mesh blobs, or glass stacks.
- No Inter, Roboto, Arial, or system font as brand voice.
- No identical three-to-six card grids with icon, heading, and paragraph repeated mechanically.
- No meaningless `01 / 02 / 03` labels. Numbers are allowed only for a real sequence.
- No nested card-on-card composition.
- No full-width dashed upload zone used as decoration without a clear interaction target.
- No bounce, elastic easing, idle floating, or hover-scale imagery.
- No `transition: all`.
- No unlabeled icon buttons.
- No fake company names, salaries, dates, deadlines, vacancies, live metrics, or AI confidence.
- No unsupported provider shown as active.
- No automated rejection, demographic scoring, or protected attributes in matching.
- No claim that opening an external link submitted an application.
- No fabricated resume achievements or qualifications.

## 12. Canonical design references

Use references in this order:

1. `DESIGN.md` — cross-product generation and critique contract.
2. `.ui-craft/brief.md` — product identity, principles, and learned constraints.
3. `.ui-craft/tokens.md` — concise token memory.
4. `apps/web/src/styles.css` — implemented semantic tokens and component behavior.
5. `apps/web/tailwind.config.js` — Tailwind token aliases.
6. `design-system/skillbridge-ai-warm-editorial/MASTER.md` — extended visual direction.
7. `docs/PRD.md` — product requirements.
8. `docs/ATS_RESUME_CHECKER.md` and `docs/JOB_AGGREGATOR.md` — domain-specific trust constraints.

There is no Figma file, Storybook, or external component-library reference in the repository. `[NEEDS TEAM INPUT: add links if they exist]`

External products may inform information architecture. Do not copy their brand, proprietary assets, or restricted data.

## 13. Preflight checklist before generating UI

- [ ] Read `DESIGN.md`, `.ui-craft/brief.md`, and `.ui-craft/tokens.md`.
- [ ] Identify the user, screen job, primary action, and emotional context.
- [ ] Confirm whether the surface is public, candidate, employer, or admin.
- [ ] Inventory the existing components and reuse their interaction contracts.
- [ ] Use semantic tokens; add no component-local palette.
- [ ] Name one focal point and one signature detail.
- [ ] Decide the loading, empty, error, success, partial, and unauthorized states.
- [ ] Identify which values are verified, inferred, unverified, demo, stale, or unknown.
- [ ] Keep ATS readiness and job alignment separate.
- [ ] Confirm keyboard order, focus behavior, touch targets, and reduced-motion behavior.
- [ ] Define desktop, tablet, and mobile composition before coding.
- [ ] Check whether any missing decision needs `[NEEDS TEAM INPUT]`.
- [ ] Reject any proposal that resembles a generic AI SaaS template.

## 14. Final UI QA checklist

- [ ] One primary focal point is obvious at a glance.
- [ ] The next useful action is visible and specifically labeled.
- [ ] All copy is factual, concise, and consistent with product terminology.
- [ ] Demonstration and unverified data is labeled.
- [ ] No missing value has been invented.
- [ ] Semantic tokens drive both light and dark modes.
- [ ] Typography follows Instrument Sans/Fraunces role boundaries.
- [ ] Cards, inputs, buttons, and overlays use role-specific radii.
- [ ] No nested cards or repeated template grids remain.
- [ ] Every interactive element has rest, hover/focus, active, and disabled states where applicable.
- [ ] Keyboard navigation and visible focus work end to end.
- [ ] Icon-only controls have accessible names.
- [ ] Loading, empty, error, success, and partial states are deliberate.
- [ ] Numbers use appropriate precision and tabular numerals.
- [ ] Motion is purposeful, interruptible where gesture-driven, and reduced-motion safe.
- [ ] Mobile, tablet, desktop, 200% zoom, and long-content behavior were checked.
- [ ] External links preserve attribution and do not imply application completion.
- [ ] Scores include explanation and limitations.
- [ ] No protected trait influences matching.
- [ ] Build and relevant automated tests pass.
