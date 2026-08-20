# Eternal Time Development Rules

Eternal Time is a greenfield production project for watch discovery, purchase, ownership, and collection development. This file is the permanent working contract for future Codex tasks. It is intentionally concise; the full architecture lives in `docs/`.

## Read Before Changing

- Product scope and user flows: `docs/PRODUCT.md`.
- Application architecture and module boundaries: `docs/ARCHITECTURE.md`.
- Ubiquitous language and domain concepts: `docs/DOMAIN.md`.
- Pre-implementation domain review decisions: `docs/DOMAIN_REVIEW.md`.
- Manual User Watch lifecycle, matching, reconciliation, and privacy: `docs/MANUAL_WATCHES.md`.
- Database model, RLS expectations, and table ownership: `docs/DATABASE.md`.
- Collection analysis and recommendation logic: `docs/COLLECTION_INTELLIGENCE.md`.
- AI boundaries and approval workflows: `docs/AI.md`.
- Route and SEO implications: `docs/ROUTES.md` and `docs/SEO.md`.
- Security, auth, roles, storage, and secrets: `docs/SECURITY.md`.
- Catalog import workflow: `docs/IMPORTS.md`.
- Delivery sequence: `docs/ROADMAP.md`.

Before changing domain logic, database structure, recommendation logic, auth, admin access, SEO routes, imports, payments, delivery, or storage, read the relevant document first.

## Core Rules

- Keep business logic out of UI components.
- Do not duplicate domain or recommendation logic across routes, components, actions, and jobs.
- Do not create one huge `page.tsx` or monolithic feature component.
- Preserve Server Component and Client Component boundaries. Use Client Components only where browser-side interactivity is required.
- Never expose server secrets, service role keys, webhook secrets, or private storage signing logic to the client bundle.
- Treat RLS as a required part of the data model, not an afterthought.
- Do not bypass the role model. Admin access must never be determined by hardcoded email checks in frontend code.
- Do not add tables without checking `docs/DATABASE.md`.
- Do not change the domain model without updating `docs/DOMAIN.md` and `docs/DATABASE.md`.
- When changing Collection Intelligence, update `docs/COLLECTION_INTELLIGENCE.md`.
- Do not create public routes without checking SEO indexation and canonical implications.
- Do not add AI dependencies to core catalog, cart, order, collection, or recommendation flows.
- Do not publish AI-generated content automatically. AI output must go through draft and admin approval flows.
- Do not use `any` unless the reason is documented near the code and a safer type is impractical.

## Architecture Defaults

- Stack: Next.js App Router, TypeScript strict mode, Tailwind CSS, PostgreSQL, Supabase Auth, Supabase Storage.
- Shape: modular monolith first. Avoid microservices until a real operational boundary exists.
- Data: separate descriptive catalog data from commercial state such as price, inventory, delivery terms, carts, and orders.
- Catalog identity: `watch_references` is the MVP canonical concrete watch entity. Do not add a separate `watch_variants` table unless a documented implementation-phase decision reopens this architecture.
- Ownership: separate catalog watches from user-owned watches. Manual User Watches must not automatically create public catalog records.
- Manual user-entered facts, photos, notes, documents, and service history must never be promoted into public catalog data without the normal catalog validation workflow.
- Recommendations: rule-based and deterministic by default. AI may assist only through optional, reviewable workflows.
- Imports: staged, validated, previewed, and approved before they mutate production catalog data.
- Storage: public catalog/content assets and private user assets must use separate access boundaries.

## Verification

After substantial changes:

- Run lint.
- Run typecheck.
- Run tests relevant to the changed modules.
- Run production build before completing a significant implementation phase.
- Check `git diff` and make sure unrelated user changes are not reverted.
- Update architecture documentation when architecture decisions change.

## Legal And Business Data

Do not invent legal details, seller requisites, phone numbers, email addresses, guarantees, delivery promises, merchant identifiers, API keys, or provider credentials. Business information must come from a centralized configuration or verified source.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
