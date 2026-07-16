# Design Language

## Reway: calm access to what you meant to keep

Reway is not designed around the act of collecting links. Saving is already easy; the real failure begins afterwards, when a useful page disappears into an indistinguishable pile of tabs, folders, and forgotten bookmarks.

The design language therefore serves retrieval. It makes a personal library feel present, legible, and low-pressure enough to return to. A person should be able to save something without ceremony, then recognise it later through a familiar icon, image, title, collection, tag, or place in their own library.

This is a design direction and engineering contract, not a wireframe or a prescribed page layout. It describes what Reway should communicate, why those choices work for people, and the constraints that keep future surfaces coherent.

## The design problem

Saving often creates a small amount of cognitive debt. The link is safe, but it is no longer visible. Asking people to name, tag, classify, and file everything before saving simply moves that debt into the capture moment, where it becomes friction.

Reway resolves the tension in two phases:

1. Save without interrupting the thought or task already in progress.
2. Make the saved object increasingly recognisable and retrievable after the fact.

The interface must support both phases without pretending they are the same job. Capture should feel instant and forgiving. Retrieval should feel deliberate, visual, and trustworthy. Organisation is useful when a person wants it, but never a toll required to preserve a link.

This is why Reway should feel more like opening a well-kept personal library than entering a generic workspace. It is private, quiet, and structured around the reader's own history.

## Design thesis

**Make the library easy to enter, easy to scan, and hard to lose things in.**

That thesis creates four working principles:

### 1. Calm is functional, not decorative

Whitespace, limited chrome, and quiet surfaces give saved items enough separation to be recognised. Calm does not mean sparse for its own sake. It means that the page does not ask for attention before the bookmark does.

The interface should not turn every saved link into a card, every preference into a panel, or every action into a visible control. A library becomes easier to use when its structure is clear and its secondary machinery appears only at the point of need.

### 2. Recognition comes before recall

People often remember a favicon, an image, a fragment of a title, a collection, or the context in which they saved something before they remember its exact URL. Reway treats favicons and enriched images as retrieval tools, not decoration.

List view makes this recognition fast and dense. Image-led grid views create a different scanning mode for visually remembered material. Neither should hide the bookmark's core identity: its title, source, and available actions.

### 3. The interface earns speed through restraint

A fast save is undermined by an interface that demands confirmation, classification, or loading choreography. The product must confirm the thing that matters: the bookmark exists in the library. Enrichment can continue quietly after that.

The same discipline applies to search, navigation, hover states, sound, and motion. Feedback should explain a real state change, not celebrate ordinary interaction.

### 4. One person owns the space

The library is personal by default. Its language, hierarchy, and controls should feel addressed to one person and their material. Reway is not a collaborative canvas, an AI command centre, or a team dashboard wearing bookmark language.

## Visual register

Reway is whitespace-calm, light-theme default, and restrained. Its register is closer to Apple or ElevenLabs than to a typical dark, techy SaaS surface: precise, spacious, useful, and not interested in proving sophistication through visual noise.

Dark mode remains a standard secondary mode, available from the footer toggle. It preserves the same hierarchy, layout, density, and interaction model as light mode. It is not a separate branded experience, a neon inversion, or a place to introduce new effects.

The product's visual identity should come primarily from the library itself: favicons, source images, tag colour when deliberately assigned, and the individual patterns in a person's saved material. Reway's chrome stays quiet enough to let that material do its job.

### Surface hierarchy

Use surface distinction to explain ownership and interaction, not to decorate empty space.

- The page background establishes room to think.
- A navigation surface, when present, establishes orientation and movement through the library.
- The active working surface establishes where scanning, sorting, or searching happens.
- Inputs, menus, and dialogs receive the smallest additional distinction necessary to be actionable.

There should normally be one primary boundary plane in a dashboard composition. Whether that boundary belongs to the sidebar or the main library surface is a composition decision to validate against real density, not an assumption to hard-code now. Giving both equal bordered-card weight risks making the application feel boxed in and visually louder than its content.

Borders are structural. Shadows are exceptional. Bookmark rows remain primarily flat so their icon, title, and metadata form the rhythm.

### Navigation and the sticky bar

The primary navbar is sticky at the viewport top with an opaque `background`-token surface and a bottom border. It does not blur or reveal scrolling content beneath it.

An opaque bar preserves orientation without visually mixing navigation with a moving library underneath. The effect should be stable rather than cinematic: a person can always find their way back without the interface becoming a persistent focal point.

On desktop, library navigation may be persistent when it materially improves orientation. On touch devices, the navigation trigger remains visible and opens the library navigation as a floating sheet or drawer. Touch must not depend on hover, right-click, or a hidden desktop-only affordance.

The line-navigation reference is a future installed component, not a custom recreation. It may serve a quieter secondary navigation context when its interaction model fits; it is not automatically the primary library sidebar.

## Spatial discipline

Reway deliberately rejects the inherited `1680px` site-container assumption. Long lines and widely dispersed controls make a library harder to scan, not more premium.

The exact shared container is not yet locked. The current candidates are `768px`, `896px`, and `1024px`, to be tested against real bookmark density, sidebar presence, grid modes, and narrow desktop windows. The decision must be made from a working library rather than from a marketing mockup.

The system should use measures by job instead of one width everywhere:

- A focused list, command surface, or settings task benefits from a narrow readable measure.
- A library with navigation and an active list needs enough width for both orientation and metadata without turning rows into long horizontal sentences.
- Image grids may need a broader available area, but their cards still need a compact, repeatable rhythm.
- Public marketing surfaces and authenticated library surfaces should not inherit each other's width blindly.

Whitespace is therefore active space. It isolates the current task, gives bookmark rows room to scan, and prevents application chrome from competing with retrieval.

## Command, search, and capture

Reway has one command surface for finding and adding. It should not permanently spend a separate library row on a quick-save field when the same surface can handle both jobs clearly.

The command surface supports two intents:

- Search bookmarks and collections with keyboard-first retrieval.
- Paste or type a URL and save it immediately with `metadata_status = 'pending'`.

The footer of that component is the appropriate place for compact discovery help, including the shortcut and the direct-paste path. It explains capability at the moment a person is deciding what to enter, without permanently competing with the library.

`Ctrl+V` / `Cmd+V` on the dashboard provides an additional capture path: when a valid URL is pasted outside an editable control, Reway saves it immediately. This is a convenience path, not a global override. It must not intercept normal pasting into search, settings, profile fields, dialogs, or any other editable surface. Non-URL clipboard text must not become a bookmark by surprise.

The save confirmation should be local and factual. The bookmark appears; its details may follow. A person does not need to wait for enrichment before returning to what they were doing.

## Library grammar

### The list is the default retrieval instrument

The core library should read as a flat, ordered field of recognisable bookmarks rather than a wall of cards. A row earns its space through the information that helps retrieval:

- favicon or source image as the first visual anchor;
- title as the primary text;
- source/domain and relevant metadata at lower contrast;
- date, collection context, or other comparison data only when it helps the current view;
- a persistent, discoverable overflow entry point for secondary actions.

Rows should not be individually framed by default. Repeated cards make a large library feel heavier, reduce visible density, and imply that every bookmark is equally important. Flat rows let the library become a continuous scanning surface.

The overflow menu and right-click context menu are required across list and grid views. Their visual treatment may be quiet, but their target must remain discoverable and touch-accessible. Reway cannot trade away necessary secondary actions merely to look minimal.

### Views express different ways of remembering

List view supports textual comparison and dense scanning. Compact grids support visual recognition. Image grids let OG imagery and favicons become memory cues for reference-heavy libraries.

These are not cosmetic view toggles. Each view should preserve the bookmark's identity, predictable overflow entry point, selection behavior, and clear enrichment state. A person must not learn a different action model every time they change view.

### Collection, tag, and sort controls stay subordinate

Collections describe durable personal groupings. Tags provide lightweight cross-cutting signals. Sort order changes how a current view is read. None should crowd the initial capture moment or turn the library into a control panel.

Custom order is collection-local. All Bookmarks and Uncollected remain system-sorted. The interface should make this distinction legible through available controls and state, not through explanatory prose that a person must decode before acting.

## State and enrichment

The central interaction contract is simple: save now, improve later.

Immediately after capture, the bookmark may show a raw URL or minimal title with a small pending indicator. It is already real, searchable by its available data, and safely in the person's library. The UI must never imply that saving is incomplete because enrichment is still happening.

When asynchronous enrichment completes, title, favicon, and image can update in place. Motion and loading treatment will use the approved primitive and loader when supplied. Until then, the design contract is deliberately outcome-based:

- pending is local to the bookmark, not a page-level interruption;
- completion is readable without a toast or modal;
- failure is a quiet card-level state with a clear manual re-enrichment route;
- no automatic retry creates invisible churn or false certainty.

The absence of a global error message is intentional. A failed metadata fetch did not undo the saved link.

## Interaction and feedback

Interactions should make state, hierarchy, and consequence clearer.

- Animate navigation transitions, state changes, feedback on explicit actions, and genuine loading progress.
- Do not animate the act of submitting a form while awaiting its response.
- Do not use repeated decorative micro-interactions after the first use.
- Pause or reduce non-essential motion when the surface is offscreen or a person prefers reduced motion.
- Treat keyboard focus, pointer hover, touch activation, and context-menu invocation as different paths to the same underlying action.

Sound follows the same rule. It may reinforce a deliberate action when enabled, but it cannot be required for comprehension and should never turn passive hover into noise.

## Typography

Public content uses semantic, fluid typography roles rather than choosing numeric Tailwind sizes per page:

| Role | Size range | Intended measure/use |
| --- | --- | --- |
| `text-display` | 40–80px | Homepage hero; up to the `max-w-6xl` reading surface |
| `text-page-title` | 40–64px | Primary page headers; roughly 15–24 characters per line |
| `text-section-title` | 32–48px | Major section headings |
| `text-project-statement` | 21–30px | The outcome claim that carries each project row |
| `text-lead` | 19–23px | Introductory/supporting copy; capped near 720px |
| `text-content` | 18–20px | Marketing body prose; capped near 60–65 characters per line |
| `text-site-nav` | 16px | Desktop navigation and language controls |
| `text-menu-title` | 16px | Titles and nested links in public navigation menus |
| `text-menu-description` | 14px | Menu descriptions and category hints |
| `text-content-action` | 16px | Editorial actions such as “See all” and “View project” |
| `text-footer-heading` | 16px | Footer column titles |
| `text-footer-link` | 15–16px | Footer navigation links |
| `text-footer-meta` | 15px | Copyright and legal metadata |

Dashboard density uses the existing compact UI scale for row metadata, controls, keycaps, menus, and form internals. The public roles should not be mechanically applied to a bookmark list simply because they are available.

The current body and heading font approach remains in place. Fonts may change later, but that decision must preserve the semantic split between body and heading roles rather than requiring a component-by-component migration.

## Tokens, color, and implementation constraints

The design is locked to the current tokens in `src/styles.css`: light default, dark as a standard secondary mode. No token, shadow, radius, or palette changes occur without an explicit request. These tokens are no longer treated as a shadcn placeholder.

That lock exists to make visual decisions observable. Reway should first prove hierarchy through layout, density, contrast, typography role, and state before inventing another colour, glow, radius, or elevation treatment.

Implementation follows these constraints:

- Reuse local components under `src/components/ui` and Base UI primitives where appropriate.
- Preserve direction support in the UI system even while the current product is English-only.
- Keep public and dashboard preferences scoped to their intended surfaces.
- Use accessible names for icon-only actions, visible keyboard focus, semantic buttons for actions, and links for navigation.
- Keep destructive actions explicit and pending; keep reversible actions local-first where the data contract permits.
- Never encode a one-off visual correction in a page when the underlying component or global style owns the problem.

## What Reway must not become

- A dark, glowing AI dashboard whose visual language overpowers a person's saved material.
- A generic productivity workspace with chat, documents, or freeform objects standing in for bookmarks.
- A wall of identical cards that makes a large library feel slow before it is even used.
- A collection of permanent controls, filter bars, and empty-state instructions competing with retrieval.
- A browser bookmark clone with only folders and no visual enrichment, command retrieval, or cross-device continuity.
- A motion showcase that makes background work more visible than the saved link itself.
- A faux-minimal surface that hides selection, failure, destructive consequences, or required actions.
- A bespoke dark theme that fragments the product's identity or interaction model.
- A dashboard that relies on hover or right-click as the only way to discover an essential action.

## Validation criteria

The design is successful when a person can understand the current place, save a link, and retrieve a recently saved item within a few seconds of viewing the relevant surface.

Before locking a component or surface, evaluate it with:

- sparse and dense libraries;
- raw URLs, long titles, missing favicons, enriched images, and failed enrichment;
- list and both grid modes;
- long collection and tag names;
- keyboard-only navigation and command use;
- touch navigation through the floating sidebar sheet or drawer;
- light and dark themes at the same density;
- narrow desktop windows, not only a wide design canvas;
- reduced-motion and high-contrast interaction states.

If a surface only feels calm with placeholder content, it is not calm enough.

## Current decisions and open calibration

**Locked:** capture-first behavior, visual retrieval, light-default restrained register, standard dark mode, opaque sticky navbar, current token lock, semantic public typography roles, unified search/add command surface, direct valid-URL paste capture, touch-accessible floating navigation, and preserved process-animation reference code.

**Awaiting supplied primitives or visual validation:** exact shared container width, which surface carries the primary desktop boundary, the installed line-navigation component's final role, and enrichment motion/loading treatment.

## Sources

- `spec/identity/project-dna.md` — product purpose, capture contract, and non-negotiable boundaries.
- `spec/identity/brand-voice.md` and `spec/identity/TONE.md` — tone, personal-library positioning, and language constraints.
- `spec/integrations/features/feature-contract.md` — authoritative feature and interaction behavior.
- `spec/research/design-craft/` — transferable interaction and craft research.
- Comparative bookmark-library references supplied during the design review — used for retrieval density, command discovery, navigation weight, and theme observations; not copied as layouts or object models.
