# AI Architecture

AI is optional in Eternal Time. The core product must work without an AI provider: catalog, search, filters, selection, comparison, User Watch Collection, Collection Intelligence, cart, checkout, orders, imports, admin, and SEO publication workflows remain functional when AI is disabled.

## Non-AI Core Principle

The source of truth is structured application data:

- Catalog attributes and offers.
- User watches and Collection Profile.
- Rule-based recommendation scenarios.
- Admin-approved content.
- SEO metadata and landing pages.
- Import validation output.

AI may assist with drafts, summaries, suggestions, and quality checks. It must not become the required backend for business logic, recommendations, publication, payment, delivery, or authorization.

## Possible AI Use Cases

Post-MVP AI use cases:

- Draft watch description improvements from structured catalog data.
- Draft SEO titles and descriptions.
- Detect missing or weak SEO metadata.
- Detect orphan pages or weak internal linking.
- Suggest FAQ drafts for pages with real content basis.
- Suggest related models or related articles.
- Identify content gaps and article topic ideas.
- Summarize collection analysis in warmer language.
- Suggest normalized analysis traits for manual User Watches, pending user/admin confirmation.
- Help admins map messy import columns to known catalog fields.
- Suggest attribute normalization candidates during imports.

These use cases are assistive. The system should store AI outputs as suggestions or drafts.

## Provider Boundary

Use a provider-neutral application interface when AI is introduced:

```text
AI task request
  -> AI application service
  -> provider adapter
  -> structured response validation
  -> suggestion/draft storage
  -> admin review
```

The core domain should know about task types and structured outputs, not about a specific AI vendor. Provider-specific SDKs belong behind server-only adapters.

## Fallback Behavior

If AI is disabled or unavailable:

- Catalog pages render normally.
- SEO metadata uses existing approved metadata or deterministic templates.
- Collection Intelligence uses rule-based explanations.
- Imports continue through deterministic validation.
- Admin screens show AI assistant features as unavailable, not broken.
- No checkout, order, payment, delivery, or auth flow is blocked.

## Structured Output Expectations

AI output must be validated before storage:

- JSON schema or equivalent runtime validation.
- Explicit task type.
- Source entity IDs.
- Confidence or caveats when useful.
- No executable code in content fields.
- No unsupported claims.
- No private data echo beyond the task's allowed scope.

Invalid output is rejected or stored as failed task output.

## Safety Boundaries

AI must not:

- Invent legal requisites, seller identity, guarantees, delivery promises, phone numbers, or emails.
- Invent stock, price, payment status, delivery status, or order state.
- Publish content automatically.
- Modify catalog records directly.
- Grant roles or make authorization decisions.
- Process private documents unless a specific user-approved workflow exists.
- Receive Supabase admin secret keys, legacy service role keys, auth tokens, raw payment credentials, or webhook secrets.

## Draft And Approval Flows

All publishable AI output follows:

```text
finding
  -> suggestion
  -> draft
  -> admin review
  -> approve/reject
  -> publish through normal content system
```

Admin review should show:

- Source entity.
- AI-generated draft.
- Structured reasons.
- Detected risks or missing data.
- Approve/reject/edit actions.
- Audit log entry after publication.

## Data Sent To AI

Allowed data depends on task:

- Public catalog data: published attributes, descriptions, approved metadata.
- Admin catalog drafts: only for admin-triggered tasks.
- SEO analysis: URLs, approved metadata, publication status, link graph metadata.
- Collection explanation polishing: only derived profile dimensions and non-sensitive watch attributes, when user context permits.

Avoid sending:

- Private documents.
- Receipts.
- Purchase price from User Watch Collection.
- Address, phone, email, payment data.
- Auth tokens.
- Service role secrets.
- Full raw import files unless reviewed and allowed for a specific admin workflow.

## Private Data Restrictions

User Watch Collection data is private by default. AI workflows involving a user's watch collection require a clear product reason and must use the minimum derived information needed. Public User Watch Collection visibility does not imply consent to send private details to an AI provider.

AI-assisted classification of manual User Watches is a suggestion layer only. Suggested traits must remain pending until accepted through the product workflow and must not create public catalog records automatically.

Manual watch classification workflow:

```text
raw User Watch source data
  -> classification suggestion
  -> normalized trait suggestions
  -> provenance/confidence
  -> user/admin acceptance where appropriate
  -> accepted private analysis traits
```

Only safe deterministic mappings may be applied automatically. AI-generated factual watch specifications must not become shared catalog facts without catalog specialist validation through the normal catalog workflow.

## AI SEO Assistant Boundary

AI SEO assistant can:

- Find pages with missing metadata.
- Identify weak titles and descriptions.
- Suggest related articles or models.
- Propose FAQ drafts where real content supports them.
- Suggest internal links.
- Draft content gap reports.

AI SEO assistant cannot:

- Create indexable pages automatically.
- Publish metadata automatically.
- Change canonical or robots rules without review.
- Generate arbitrary filter landing pages.
- Make unsupported product, legal, warranty, delivery, or availability claims.

## Storage Model

When implemented, use tables such as:

- `ai_tasks`: task type, status, requester, source entity, provider code, created_at.
- `ai_suggestions`: task, structured output, validation state, review status.
- `ai_reviews`: reviewer, decision, edited output, published entity.

These tables are optional until AI is actually implemented.
