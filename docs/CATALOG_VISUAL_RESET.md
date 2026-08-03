# Catalog Visual Reset — Phase 3

Worktree: `eternal-time-catalog`, branch `ai/claude-catalog`. Scope: `/watches` and `/watches/{brandSlug}` only. This phase followed explicit rejection of the prior "Phase 2.2" result — the opening composition (oversized lead card, 2×2 supporting grid) was live and screenshot-confirmed, along with a badly-cropped A130WE-7ADF card image, a caseback image on AE-1200WH-1BV, and a catalog that read as visually disconnected from the finished homepage. This phase is a full visual/structural reset: header, tabs, filters, curation, grid, and editorial system.

## Ground truth before starting

Verified via `grep` against the actual source (not the prior report) that `data-opening-role`, `OPENING_COMPOSITION_COUNT`, and the `.openingGrid` CSS were genuinely present in `catalog-list-page.tsx`/`.module.css` before any change this phase — the prior report's claims were not trusted at face value.

## Root cause: card image cropping

`catalog-image-presentation-policy.ts` applied `transform: scale(1.22)` on top of an already `object-fit: contain`-fitted image inside an `overflow: hidden` card. `object-fit: contain` already sizes an image to the largest fit within its box (touching one axis's edge); scaling that up again pushes the touching axis outside the box, which the container then clips. This affected every non-remote catalog-card image, and was dramatic for A130WE-7ADF specifically because its source photo is an unusually tall/elongated bracelet shot. Fixed by setting the `catalog-card` slot's base `scale` to `1` (verified this slot is used nowhere else — not the homepage hero, not the detail page). Three legacy per-imageKey overrides that hardcoded `scale: 1.2` (reapplied across every slot, including catalog cards) had their `scale` removed, keeping only their focal-point tuning.

## Primary image fidelity

Visually fetched and inspected the actual served JPEG for AE-1200WH-1BV: confirmed a caseback/buckle shot. Its gallery position 2 (`9cef68de91f996e8a7d01c5da945aa04`) is a clean front dial; added the caseback's imageKey to the existing `knownTechnicalAngleImageKeys` denylist in `catalog-image-presentation-policy.ts` (same mechanism already used for A168WA-1WDF in Phase 2.2). Verified live: both the card and the model's own detail page now serve the front dial.

## Opening composition — fully removed

Deleted from `catalog-list-page.tsx`: `OPENING_COMPOSITION_COUNT`, `OPENING_ROLE_ATTRIBUTE`, the `role`/`lead`/`supporting` feed classification, and the `openingItems` render block. Deleted from `catalog-list-page.module.css`: `.openingGrid` and all `[data-opening-role="..."]` rules. Deleted from `catalog-watch-card.tsx`/`.module.css`: the `variant` prop and every `.cardLead` modifier — every card, including A130WE-7ADF, now renders through the single regular card structure. Confirmed via `grep` (zero matches for `opening`/`data-opening-role`/`cardLead` anywhere in `src/components/catalog`) and via a dedicated test (`tests/catalog-visual-reset.test.ts` #1, #2, #17).

## Recommended / All tabs — real query state

New `CatalogViewKey = "recommended" | "all"` field on `CatalogReadQuery` (`read-models.ts`), parsed from `?view=` (`catalog-read-query.ts`, defaulting to `"recommended"`), serialized back into hrefs the same way `sort`/`page` already are. `CatalogTabs` (new component) renders "Рекомендуемые", "Все часы", and up to 4 brand tabs as real `<Link>`s over this same query — not a second, independent filter state. Active state: navy text + champagne underline, colors taken exactly from the header's own active-nav-link CSS (`#071e2a` / `#b98a45`) so the catalog visually continues the header instead of introducing a second accent.

## Recommended curation

`isRecommendedViewActive(query)` (exported from `catalog-read-service.ts`) is true only when the user hasn't already taken explicit control: `view === "recommended"`, no brand, no search, `sort === "default"`, no manual price filter. Any one of those is an opt-out — matching the brief's own examples (cheap watches stay reachable via "Все часы", brand tabs, search, an explicit sort, or a manual price filter).

When active:
- **Price floor**: `RECOMMENDED_PRICE_FLOOR_MINOR = 1_000_000` (10 000 ₽) is applied as a real filter — `totalRecords` reflects the floored count, not 559.
- **Ranking** (`rankRecommendedWatches`): interleaves each brand's eligible watches by family (`brandCollectionName`) first, so near-duplicate variants of the same line don't cluster, then round-robins across brands in an order derived from each brand's own average matching price, descending — a computed, data-driven proxy for "premium first," never a hardcoded brand list. No `Math.random`, no `Date.now`, no fake popularity — fully deterministic (verified: two calls with the same dataset return identical order).

Verified against the real dataset: 459 of 559 watches clear the floor; the first 24 recommended results split exactly 6/6/6/6 across all four real brands (casio/tissot/orient/citizen); minimum price on the page is 11 500 ₽. "Все часы" still returns all 559, minimum price 3 700 ₽. An explicit `price_asc` sort (opting out of curation) returns all 559 sorted purely by price, minimum 2 300 ₽. A Casio brand tab returns Casio's full 234-model catalog, unfloored.

## Price context visibility

Results header shows, for Recommended: "Рекомендуемые модели" / "От 10 000 ₽ · показаны 1–24 из 459". For All/brand tabs: "{N} моделей" / "Показаны {start}–{end}". A "Сбросить фильтры" link appears whenever a refinement filter (search, movement, water resistance, case material, crystal, or a manual price range) is active.

## Filter toolbar

Brand moved out of the primary field row into the "Все фильтры" expandable panel (tabs now cover brand selection on the generic `/watches` page; brand-scoped pages never showed it in the primary row either). Primary row is now search (wide) + movement + price + sort — the search field's existing `searchFieldWide` span already summed correctly to 12 columns once brand was removed, so no grid-column rework was needed. A hidden `<input type="hidden" name="view" value={query.view} />` preserves the active tab across filter-form submissions (search/movement/price/sort no longer silently drop the user back onto "Рекомендуемые"). The sort dropdown's "default" option now reads "Рекомендуемые" on the curated tab and "По умолчанию" everywhere else (`sortOptionsFor(view)`).

## Masthead

Compressed further from Phase 2.2: top padding `clamp(3.25rem, 4vw, 4.5rem)` (52–72px), bottom padding `clamp(2.375rem, 2.8vw, 3.25rem)` (38–52px), title `clamp(3rem, 3.6vw, 4rem)` (48–64px). The right-side prompt dropped its extra body line — now genuinely one line ("Не знаете, с чего начать?" + "Перейти к подбору →"), matching the brief's compact-note framing.

## Grid

Breakpoints updated to this phase's explicit spec: 1 column default, 2 at 600px, 3 at 900px, 4 at 1200px, 5 at 1800px (previously 980/1920 from Phase 2.2).

## Editorial insert

`selectEditorialFeature()` (new, in `catalog-list-page.tsx`) picks a real watch — preferring Tissot/Orient/Citizen, priced at or above the Recommended floor, with a usable image — from the current page's own items; falls back to any eligible watch, or to nothing (insert simply isn't rendered) if none qualify. `buildEditorialInsertCopy()` builds the eyebrow/headline/body/CTA entirely from that watch's own real brand name, model heading, `keySpecifications`, and price — never a hardcoded "Механические часы" string next to a digital watch. CTA now links straight to the picked watch's own canonical `href` ("Смотреть модель"), replacing the old automatic-movement-filtered-listing href.

## Tests

`tests/catalog-visual-reset.test.ts` (new, 20 items per this phase's brief) covers: opening composition absence, All-view record count, Recommended price floor / no-sub-10k / brand-diversity / page-size / brand-concentration-cap / determinism, All-view cheap-model reachability, manual-price-filter override, brand-tab bypass, 4-column breakpoint, editorial-insert-additive/copy-authenticity, the AE-1200WH-1BV denylist entry, card-variant removal, canonical links, pagination query-state preservation, and no nested interactive elements. Two pre-existing tests (`catalog-list-redesign.test.ts` breakpoint list, `catalog-list-visual-recovery.test.ts` editorial-insert-route assertion) and three tests whose fixture queries implicitly relied on the old always-plain-default behavior (now superseded by Recommended curation on bare `{}` params) were updated to pass `view: "all"` explicitly. Full suite: 29 files, 240 tests, all passing.

## Runtime QA

No browser automation/screenshot tooling is available in this environment (no Playwright/Puppeteer installed; installing one would touch the forbidden `package.json`). Verified instead via the live dev server: all 7 named routes (`/watches`, `?view=recommended`, `?view=all`, and all 4 brand tabs) return HTTP 200; rendered HTML confirmed zero `data-opening-role`/`openingGrid` markers, zero profanity, correct 6/6/6/6 brand split, correct price floor, and — critically — the two flagged images verified by downloading and visually inspecting the actual served bytes, not just asserting on markup. Manual URLs for visual sign-off: `http://localhost:3001/watches`, `?view=all`, `?brand=casio`, `?brand=tissot`, `?brand=orient`, `?brand=citizen`, `?page=2`.

## Known limitations

- No pixel-level visual QA at named viewports — CSS-rule-level verification only, same limitation as every prior phase in this worktree.
- The image-crop fix and the caseback denylist are targeted, visually-verified corrections, not a full-catalog re-audit; a systemic fix for every reference would need either richer import metadata or a real vision-based audit pass.
