# Eternal Time Product Journey Review

This document records the product architecture and UX journey review completed before User Watch Collection, Candidates, Compare, Cart, Checkout, and Orders implementation. It is a design and domain contract, not authorization to create migrations, fake recommendations, fake inventory, or provider integrations.

## Product Promise

Eternal Time helps a person understand watches, understand the structure of their own collection, and make a deliberate next choice.

The primary value statement is:

```text
Understand watches -> understand what you already own -> identify a useful next role ->
study real candidates -> compare trade-offs -> make a deliberate purchase -> add it to ownership
```

The first screen must communicate more than catalog access. A user should understand that Eternal Time connects editorial learning, structured selection, ownership, and collection development.

Purchase is an available outcome, not the organizing metaphor of the product.

## Current State Audit

### Reusable Foundations

- The modular monolith, App Router boundaries, Supabase Auth/RLS model, and server-only infrastructure are appropriate.
- `watch_references` is correctly separated from `catalog_offers`, price, inventory, and delivery estimates.
- The Catalog Read Repository exposes public-safe catalog read models and fails closed in production.
- Public catalog, Brand discovery, watch detail, Journal, committed article content, and deterministic Editorial Selections exist.
- Manufacturer Reference normalization, staged import, public hygiene, and controlled apply boundaries are mature enough to support future product workflows.
- User Watch Collection, manual-watch handling, provenance, matching, reconciliation, and Collection Intelligence are already designed in depth.
- The target database documentation already distinguishes ownership, selection, comparison, cart, order, payment, and delivery concepts.

### Implemented Product Surface

- `/`, `/watches`, Brand browse, watch detail, `/brands`, `/journal`, and article routes are real read surfaces.
- `/selection` and `/collection` are product explanation pages, not functioning workflows.
- `/compare`, `/cart`, account collection, account analysis, favorites, comparisons, and orders are foundation/empty states.
- Journal articles currently support only explicit `relatedWatchRefs`; they do not yet link to scenarios, Brand Collections, Editorial Selections, or recommendation traits.
- Editorial Selections are deterministic read models but do not yet have canonical public detail routes or persistence.
- Current migrations implement identity, roles, catalog, commercial catalog state, media, imports, and audit foundations. They do not yet implement user behavior, ownership, intelligence, cart, checkout, or orders.

### Primary Product Gaps

- The homepage explains the system but its strongest action still begins with catalog browsing.
- The value of building and understanding a real User Watch Collection is not demonstrated above the fold.
- Watch detail has navigation-shaped actions, but no Candidate, Compare, ownership, or Cart state exists behind them.
- Journal and catalog are connected by related watches, but not by a structured next-step context.
- The product has no persistent consideration state between interest and purchase.
- The account area has many future navigation items before the underlying workflows exist.
- Commercial state exists in the catalog foundation, but checkout lifecycle and idempotency boundaries are not yet specified precisely enough for implementation.

## Visual Density Audit

### Why The Current Surface Feels Heavy

- Large type is used too often as the primary hierarchy mechanism.
- The current Journal experiment allows display sizes up to `9rem`, article titles up to `8.25rem`, and section spacing up to `8.5rem`.
- Home and watch detail use media stages with desktop minimum heights of `620px` and `660px`; this leaves little room for context and next actions above the fold.
- Several page sections use `64-136px` vertical separation regardless of information value.
- Repeated hero-like introductions slow down movement between catalog, Brands, Selection, Collection, and Journal.
- Product explanation pages contain little actionable information per viewport because they use the same generous layout language as mature data views.
- Some surfaces use panels, large media, large titles, and generous spacing simultaneously. Each device is reasonable alone, but together they reduce information density.

### Target Type Scale

Use a small role-based scale. Do not scale typography directly with viewport width outside bounded `clamp()` values.

| Role | Mobile | Desktop | Typical use |
| --- | ---: | ---: | --- |
| Display | 48px | 72-80px max | Home or Journal issue statement only |
| Page title | 36-42px | 52-64px | One H1 per route |
| Section title | 28-32px | 36-44px | Major page sections |
| Subsection | 21-24px | 24-30px | Article and data sections |
| Lead/dek | 18-20px | 20-24px | One supporting statement |
| Reading body | 17-18px | 18-20px | Editorial body, 1.65-1.8 line height |
| Product/UI body | 15-16px | 15-17px | Controls, facts, summaries |
| Metadata | 12-13px | 12-13px | Date, category, reference, source |

Display type is an accent. Most pages should use the Page title scale.

### Target Spacing Scale

```text
4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 88px
```

- Page top/bottom: `32px` mobile, `48-64px` desktop.
- Standard section separation: `48px` mobile, `64-72px` desktop.
- Narrative exception: up to `88px`; never a default for every section.
- Component internal spacing: `12-32px` based on density.
- Above the fold should contain the route purpose, one primary action, and either real content or a useful state summary.
- No single non-immersive text section should consume most of a desktop viewport.

### Width And Rhythm

- Editorial reading measure: `62-72ch`.
- Product explanation measure: `52-64ch`.
- Metadata and side notes: `28-42ch`.
- Use images, facts, compact lists, and comparison summaries to create hierarchy; do not rely only on title size.
- Use one strong visual moment per viewport, not several competing stages.
- Keep borders as separators. Avoid nested panels and decorative shadows.

### Journal Correction

The Journal should remain editorial, but become easier to scan:

- reduce the issue display maximum from `9rem` to approximately `5rem`;
- reduce article H1 maximum from `8.25rem` to approximately `4.5rem`;
- reduce repeated section gaps from `8-9vw` to bounded `56-88px`;
- place more article metadata, a short dek, and one next-step cue above the fold;
- alternate image-led, text-led, list, and narrow-column compositions without making every block a full-page event;
- keep product integration after the introduction or after the article unless a specific paragraph has a real semantic relation;
- show related watches as editorial references, not commerce cards;
- add one scenario continuation and one related-reading continuation, not several equally strong CTA groups.

## Journey Architecture

The journey is a network with contextual next-best actions, not a forced funnel.

### Entry: Homepage

```text
Home -> understand the promise -> choose one of three intents
  -> learn about watches
  -> find a role/model
  -> understand my collection
```

Primary action: `Начать с задачи` or `Понять, какие часы нужны`.

Secondary actions: open Journal or browse watches.

The homepage should demonstrate the ownership loop with a compact example, not only describe a future feature.

### Entry: Journal Article

```text
Article -> understand criteria -> related scenario -> real related watches
  -> save as Candidate
  -> compare
  -> check collection fit when available
```

Next-best action priority:

1. Continue into the scenario explained by the article.
2. Open explicitly related real watches.
3. Continue reading in the same subject.

Do not interrupt the article with generic product blocks.

### Entry: Catalog Or Brand

```text
Catalog/Brand -> narrow by facts -> open Watch Detail -> understand role/trade-offs
  -> save Candidate
  -> compare
  -> check collection fit
  -> add an orderable offer to Cart
```

The catalog supports exploration. It should not imply that every visible reference is currently orderable.

### Entry: Watch Detail

The page should answer, in order:

1. What exactly is this watch?
2. What role and scenarios does it suit, based on available data?
3. What are the important trade-offs?
4. How does it differ from sibling references or active Candidates?
5. Is there a verified orderable offer?

Contextual actions:

- Primary for exploration: `Добавить в кандидаты`.
- Primary for high purchase intent when an offer is orderable: `Перейти к оформлению` or `Добавить в корзину`.
- Secondary: `Сравнить`.
- Secondary for authenticated owners: `У меня уже есть эти часы`.
- Context link: `Как они дополнят мою коллекцию` only when an analysis can be calculated or a controlled enrichment prompt is available.

### Entry: Selection

```text
Selection intent -> structured answers -> explainable result set -> Candidate workspace
  -> compare finalists -> collection-fit context -> Cart
```

Selection results should create or update a Candidate context, not a disconnected result page.

### Entry: User Watch Collection

```text
My Collection -> watches and ownership history -> profile -> roles/repetitions
  -> gaps -> scenario -> real Candidates -> compare -> Cart
```

Collection is the primary returning-user home. It should show current ownership first, then interpretation, then possible next directions.

### Entry: Candidate Workspace

```text
Saved/considering watches -> active Candidates -> differences -> finalists
  -> Compare -> choose an orderable offer -> Cart
```

The workspace should remain useful without a User Watch Collection. With a collection, it gains collection-fit explanations.

### Entry: Direct Purchase Intent

```text
Watch Detail -> orderable offer -> Cart -> Checkout -> Order
```

Users who are ready should not be forced through Journal, Selection, Candidates, or Collection Intelligence.

## Progressive Commitment State Model

These are related states, not mandatory sequential gates.

| Stage | Stored state | Primary user question | Natural action |
| --- | --- | --- | --- |
| Interest | recent view / article context | What is this? | Continue learning |
| Saved | Candidate item: `saved` | Do I want to remember it? | Add to Candidates |
| Consideration | Candidate item: `considering` | Could this work for me? | Compare or inspect role |
| Finalist | Candidate item: `finalist` | Which one should I choose? | Open focused Compare |
| Purchase intent | Cart item | Do I intend to acquire this offer now? | Checkout |
| Checkout | Checkout Session | Are contact, delivery, price, and offer valid? | Create Order |
| Transaction | Order + Payment/Delivery states | What is happening with my purchase? | Track Order |
| Ownership | User Watch | How does this watch live in my collection? | Add details and recalculate profile |

Rules:

- A Watch Reference can be a Candidate without an active Catalog Offer.
- Cart always references an orderable Catalog Offer, not only a Watch Reference.
- Order items are immutable snapshots.
- A delivered Order Item can create at most one User Watch through an idempotent user-confirmed transition.
- Purchase does not automatically imply ownership until delivery/hand-off is confirmed.

## Collection Integration Model

### Collection Surface

Avoid a generic card grid as the only representation. The collection page should combine:

- a visual watch rail or chronological ownership strip;
- grouped roles and use cases;
- distribution summaries for movement, size, color, material, and attachment;
- repeated patterns and strengths;
- gaps with evidence and confidence;
- current Candidate overlap;
- one recommended next scenario when evidence is sufficient.

### Empty And Partial States

- No watches: start with catalog search plus manual Quick Add.
- One watch: describe known traits and invite one or two high-value details.
- Low profile completeness: show known facts and enrichment prompts, not broad recommendations.
- Strong profile: show gaps, scenarios, and Candidate fit.

### Collection-Aware Product Context

Collection fit is a deterministic application service shared by Watch Detail, Candidates, Compare, and recommendation results. It must not be reimplemented in React components.

Outputs may include:

- covered scenarios;
- new scenario coverage;
- overlap with owned watches;
- diversity gain;
- missing evidence;
- explanation key and evidence references.

If evidence is insufficient, show what information is missing instead of a recommendation.

## Candidates, Saved, Compare, And Cart

### Decision

Do not implement a separate Wishlist for MVP.

Use one Candidate workspace with item stages:

- `saved`: low-intent memory;
- `considering`: active shortlist;
- `finalist`: narrowed choice;
- `removed`: retained only when history is useful.

The UI can present `Сохранено` and `Кандидаты` as filters over the same domain, not separate databases and navigation systems.

### Candidate Workspace Rules

- Default active Candidate count guidance: 3-6.
- Soft warning after 8 active considering/finalist items; do not hard-block saving.
- Preserve source context: article, selection session, editorial selection, recommendation scenario, catalog, or manual addition.
- Store user notes and optional intended role/goal.
- Candidate state is tied to `watch_references`, not offers, so it survives offer changes.
- Final purchase chooses a current orderable `catalog_offer`.

### Compare Rules

- Compare 2-4 references at once.
- Lead with differences and scenario trade-offs.
- Collapse identical specifications.
- Show factual price/offer state separately from immutable watch facts.
- Add collection-fit comparison only when sufficient evidence exists.
- A comparison may be guest/session-scoped or saved to a user.

### Cart Rules

- Cart contains only current purchase intent.
- Cart is not named or presented as a User Watch Collection or future collection.
- Cart items reference `catalog_offers` and show the underlying Manufacturer Reference.
- Quantity should default to one; enforce offer purchase limits and avoid quantity controls when only one is permitted.

## Minimal Domain Additions

No migrations are authorized by this review. The target model is:

### `candidate_lists`

- Owner: `user_id` nullable or server-managed `session_id` nullable.
- Optional `selection_session_id` or `recommendation_result_id` context.
- `title`, `goal_code`, `status`: `active`, `archived`, `completed`.
- One default active list per owner; additional goal-specific lists only when a real workflow requires them.

### `candidate_items`

- `candidate_list_id`, `watch_reference_id`.
- `stage`: `saved`, `considering`, `finalist`, `removed`.
- `source_type`, `source_id`, optional `intended_role_code`, `note`.
- Unique active item per Candidate list and Watch Reference.

This replaces the planned standalone `favorites` table before that table is implemented.

### Existing `comparisons` And `comparison_items`

Keep the existing target entities. Add optional `candidate_list_id`, lifecycle timestamps, and a stable item order. Comparison remains a separate temporary analytical state.

### Existing `carts` And `cart_items`

Clarify lifecycle:

- Cart status: `active`, `converted`, `abandoned`, `merged`, `expired`.
- Cart owner: authenticated user or server-managed anonymous session.
- Cart item: Catalog Offer, quantity, and optional added-price observation for change messaging.
- Checkout always revalidates offer visibility, orderability, price, purchase limit, inventory evidence, and delivery data.

### `checkout_sessions`

- Owner: user/session and source Cart.
- Status: `draft`, `ready`, `order_created`, `expired`, `abandoned`.
- Draft contact, address, selected delivery method/estimate, selected payment method code.
- Currency and totals preview.
- `idempotency_key`, `expires_at`, `order_id` nullable.

Do not store card credentials or provider secrets.

### Existing `orders` And `order_items`

Use independent lifecycle dimensions:

- Order: `pending_payment`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned`.
- Payment: `not_started`, `pending`, `authorized`, `paid`, `failed`, `cancelled`, `partially_refunded`, `refunded`.
- Delivery: `pending`, `preparing`, `handed_over`, `in_transit`, `delivered`, `failed`, `returned`.

Order creation is idempotent per Checkout Session. Order Items preserve immutable catalog, offer, price, and image snapshots.

### `payment_attempts`

- `order_id`, provider code, provider reference nullable.
- Amount/currency and status.
- Unique idempotency key.
- Safe request/response metadata only.
- Provider events remain append-only in `payment_events`.

### Delivery Selection

Do not create a separate delivery-selection table for MVP. Store the selected method/estimate in the Checkout Session draft and copy an immutable snapshot into the Order. Introduce provider quote/shipment entities only when a real delivery adapter requires them.

### Ownership Transition

Add nullable unique `source_order_item_id` to `user_watches` when ownership implementation begins.

Flow:

```text
delivered order item -> user confirms ownership -> create User Watch once ->
preserve order snapshot link -> increment collection version -> recalculate analysis
```

The user can decline, postpone, or mark the watch as a gift.

## Ownership, RLS, And Anonymous Sessions

- Candidate lists, comparisons, carts, and checkout sessions support either `user_id` or server-managed `session_id`, never unscoped rows.
- Anonymous identifiers are high-entropy, stored in secure HTTP-only same-site cookies, and resolved server-side.
- Login merge operations are idempotent and audited at a safe metadata level.
- User Watch Collection, Candidate notes, addresses, orders, and ownership transitions are user-private.
- RLS enforces authenticated ownership; guest/session access is mediated by server code rather than broad anonymous table policies.
- Admin/order-manager access is server-authorized and audited.
- Service role is reserved for trusted merge, provider callback, and operational workflows where user RLS is insufficient.

## Idempotency Boundaries

- Guest Cart merge: one source Cart can merge once into one target Cart.
- Checkout Session -> Order: one successful Order per Checkout Session/idempotency key.
- Payment Attempt creation: one provider attempt per idempotency key.
- Webhook event processing: unique provider event identity when available; otherwise deterministic event fingerprint.
- Delivered Order Item -> User Watch: one ownership record per `source_order_item_id`.
- Collection recalculation: same collection version and analysis version must not produce duplicate current results.

## Cart UX Specification

### Surfaces

- Header indicator: cart icon/count only; it must remain visually distinct from Collection and Candidates.
- Optional mini-cart/drawer: confirmation and quick inspection after add; not the only cart surface.
- `/cart`: canonical noindex review surface.

### Cart Page Content

- Exact watch identity and selected offer.
- Current verified price and quantity.
- Current orderability/inventory state only when factual.
- Delivery estimate only when verified.
- Price-change or unavailable-offer message after revalidation.
- Subtotal, delivery state, and total.
- One primary action: `Перейти к оформлению`.
- Secondary: return to Candidate workspace or continue exploring.

Do not disguise the cart as `Моя будущая коллекция`. Emotional copy may acknowledge a considered choice, but the commercial function must remain explicit.

### Inventory And Price Behavior

- Adding to Cart does not reserve inventory by default.
- Revalidate on Cart load and before Checkout Session becomes ready.
- Reserve inventory only when a real quantity/reservation policy is approved; current inventory state/event architecture is not sufficient by itself for guaranteed reservation.
- If price changes, require explicit user acknowledgement before Order creation.
- If an offer becomes unavailable, keep the item visible with a clear blocked state and allow removal or return to Candidates.

## Checkout UX Specification

Use a compact staged single-page flow on desktop and progressive sections on mobile:

```text
Contact -> Delivery -> Payment method -> Review -> Create Order
```

Why: the expected watch order has low item count and high consideration. A five-page wizard would add friction without reducing complexity.

Rules:

- Guest checkout is supported.
- Authentication can offer saved addresses and order history but is not mandatory.
- Each completed section shows a compact summary and can be edited.
- Final Review shows immutable-to-be snapshots: items, prices, delivery, contact, address, and totals.
- Order creation and payment initiation are separate idempotent operations.
- Do not show fake payment success or fake provider choices.
- Failure keeps safe Checkout Session state and offers retry without duplicate Order creation.
- Abandoned sessions expire; they do not become Orders.
- Card data is handled only by a selected compliant provider UI/SDK when a real provider is approved.

## Post-Purchase Ownership Flow

```text
Order created -> payment/delivery status -> delivered -> ownership prompt ->
Add to My Collection -> optional acquisition details -> profile recalculation ->
show updated strengths/gaps later
```

- Do not recommend another purchase immediately after checkout.
- During fulfillment, primary actions are order review and tracking.
- After delivery, invite the user to add the watch to their real collection.
- Pre-fill factual identity and order acquisition facts, while keeping private notes/photos optional.
- A gift or returned item must not become owned by default.
- After recalculation, communicate what changed in the profile before showing a future scenario.

## Journal Product Integration

Extend Article relations in the content/domain layer, not in page components:

- related Brands;
- related Brand Collections;
- related Manufacturer References;
- related scenario codes;
- related Editorial Selections;
- related recommendation trait codes.

Integration points:

- after the introduction: one scenario cue when the article defines a practical problem;
- inside the article: only for a direct semantic reference;
- after the article: related watches and one related selection;
- end of page: related reading.

Each relation must be explicit or deterministic from controlled metadata. Do not use broad title similarity or AI inference as source of truth.

## CTA Architecture

Each screen has one primary action and at most two secondary actions.

| Context | Primary | Secondary | Quiet actions |
| --- | --- | --- | --- |
| Home | `Начать с задачи` | `Читать журнал` | Browse watches |
| Journal index | Open lead material | Explore topic | Search |
| Article | `Посмотреть модели по сценарию` | Related reading | Save a related watch |
| Catalog | Open a watch | Adjust filters | Save from quick action later |
| Watch Detail, exploration | `Добавить в кандидаты` | Compare | Mark as owned |
| Watch Detail, high intent | `Добавить в корзину` | Add to Candidates | Compare |
| Selection result | `Собрать кандидатов` | Refine answers | Open watch |
| Candidates | `Сравнить финалистов` | Refine shortlist | Archive/remove |
| Compare | `Выбрать кандидата` | Check collection fit | Edit comparison |
| Collection | `Посмотреть профиль` | Add watch | Edit ownership details |
| Collection profile | `Посмотреть пробелы` | Improve data | View watches |
| Scenario | `Собрать кандидатов` | `Почему эти модели` | Adjust constraints |
| Cart | `Перейти к оформлению` | Return to Candidates | Remove item |
| Checkout | `Создать заказ` | Edit sections | Return to Cart |
| Delivered Order | `Добавить в коллекцию` | View order | Mark as gift |

Use calm verbs: understand, explore, compare, save, choose, continue. Commercial actions must still be unambiguous at Cart and Checkout.

## Navigation Architecture

### Primary Navigation

- `Журнал`
- `Часы`
- `Подбор`
- `Коллекция`

Brand discovery belongs inside Watches/navigation/search and does not need equal top-level weight once Collection becomes functional.

### Utility Navigation

- Search.
- Candidates with count when non-empty.
- Account/profile.
- Cart icon/count, visually distinct from Collection.

Compare is entered from Candidates or Watch Detail; it does not need a permanent header item.

### Authenticated Account Navigation

- Overview.
- My Collection.
- Candidates.
- Orders.
- Settings.

Collection analysis, gaps, and recommendations should be sections/tabs within My Collection unless their complexity later justifies dedicated routes.

## Route Review

### Keep

- `/`
- `/journal`, `/journal/{slug}`
- `/watches`, `/watches/{brandSlug}`, `/watches/{brandSlug}/{referenceSlug}`
- `/brands` as a discovery route, even if it leaves primary header navigation
- `/selection`
- `/compare`, future `/compare/{comparisonId}`
- `/cart`
- `/account/collection`
- `/account/collection/{userWatchId}`
- `/account/collection/analysis`
- `/account/orders`, `/account/orders/{orderId}`

### Add When Implemented

- `/selection/{sessionId}`
- `/selection/{sessionId}/results`
- `/candidates`
- `/checkout`
- `/checkout/confirmation/{orderId}` or redirect directly to `/account/orders/{orderId}` for authenticated users

### Do Not Add For MVP

- `/wishlist`
- separate `/collection/gaps` and `/collection/recommendations` public routes
- separate pages for every Candidate stage
- provider-specific public checkout routes

The public `/collection` remains an indexable product explanation page. Private ownership lives under `/account/collection`.

## Implementation Order

The original roadmap has correct dependencies, but the current state benefits from a more explicit product-journey sequence.

### Phase A: Journey And Density Foundation

- Adopt the type/spacing scale and reduce oversized current Journal/Home/Detail treatments.
- Define shared CTA vocabulary and next-best-action read models.
- Extend Journal relation contracts for scenarios and selections.
- Align `/selection` route naming in docs and code contracts.
- Keep all unavailable actions honest and non-persistent.

### Phase B: Identity Continuity, Candidates, And Compare

- Implement server-managed guest session identity.
- Add Candidate and Comparison domain models, migrations, RLS, repositories, and merge behavior.
- Make Selection results feed Candidate lists.
- Add focused difference-first Compare.

Why before full Collection: it creates a real cross-surface consideration state and can work for guests while ownership is built.

### Phase C: User Watch Collection

- Implement private ownership CRUD, catalog-linked add, manual Quick Add, progressive enrichment, service history, and private media boundaries.
- Make `/account/collection` the returning-user center.
- Add idempotent collection version updates.

### Phase D: Collection Intelligence

- Implement profile, completeness, roles, gaps, scenarios, candidate query, scoring, and explanations.
- Add shared collection-fit application service for Watch Detail, Candidates, Compare, and Selection.

### Phase E: Product Integration

- Connect Journal, Editorial Selections, Selection, Watch Detail, Candidates, and Collection scenarios through explicit relations.
- Add contextual next-best actions without banners or generic recommendation rails.

This phase follows Intelligence because collection-aware claims must be real. Non-personal article/watch relations can begin in Phase A.

### Phase F: Cart And Checkout Foundation

- Implement Cart, Cart merge, revalidation, Checkout Sessions, Order snapshots, and idempotency.
- Keep provider choices abstract until verified.

### Phase G: Payment, Delivery, And Order Operations

- Add real provider adapters only after provider/business data approval.
- Implement webhook validation, Payment Attempts, event processing, order management, and tracking states.

### Phase H: Post-Purchase Ownership

- Add delivered Order Item -> User Watch confirmation.
- Recalculate collection profile after ownership creation.
- Show profile change before any future recommendation.

## Review Decision Summary

- User Watch Collection is the product center, not a saved-products list.
- Candidates are the only MVP saved/shortlist concept; no separate Wishlist.
- Compare is analytical state; Cart is immediate commercial intent; Order is immutable transaction; User Watch is ownership.
- Cart and checkout remain clear commercial surfaces even within an editorial product.
- Journal becomes a structured discovery entry, not content marketing and not a product grid.
- Collection-aware claims are deterministic, versioned, evidence-based, and suppressed when data is insufficient.
- Current catalog and import architecture remains intact.
- No migrations or workflow implementation begins until this review is accepted.
