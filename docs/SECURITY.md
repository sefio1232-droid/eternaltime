# Security Architecture

Security is a core architecture concern for Eternal Time. Public catalog data, private User Watch Collection data, admin operations, elevated Supabase admin-secret usage, and provider callbacks must have distinct access boundaries.

## Authentication

Use Supabase Auth for user identity. The app uses:

- Anonymous sessions for guest browsing, cart, recently viewed, and comparison.
- Authenticated sessions for account, orders, User Watch Collection, Candidates, saved comparisons, and addresses.
- Server-only privileged clients for trusted jobs and admin operations.

`profiles.id` should match `auth.users.id`.

## Authorization

Authorization is enforced through:

- RLS policies.
- Server-side checks in route handlers, server actions, and admin layouts.
- Role model in `roles` and `user_roles`.
- Storage policies.

Frontend checks are only UI convenience.

## Roles

Initial roles:

- `customer`: normal authenticated user.
- `admin`: broad admin access.
- `catalog_manager`: catalog and import operations.
- `content_manager`: content and SEO operations.
- `order_manager`: orders, payment status, delivery status.

Roles should be granted and revoked through server-authorized admin operations. Never identify an admin by hardcoded email checks in frontend code.

Implementation detail: role lookup is backed by `roles` and `user_roles`, with helper functions used by RLS and server-side authorization. Initial admin assignment is a controlled database operation by Supabase Auth user ID, not an application email fallback.

## RLS Expectations

Public readable:

- Published brands, Brand Collections, Watch Models, Manufacturer References, images, articles, SEO landing pages, and safe offer data.

Catalog RLS is implemented for the catalog foundation tables. Public policies are read-only and lifecycle-scoped; catalog writes require `admin` or `catalog_manager`.

User-owned:

- Profiles.
- Addresses.
- Candidate Lists and Candidate Items.
- Comparisons.
- Selection sessions.
- User Watch Collections.
- User watches.
- Service records.
- User watch files.
- Orders.

Admin-controlled:

- Catalog mutation.
- Price and inventory mutation.
- Imports.
- SEO metadata.
- Promo codes.
- Audit logs.
- Business settings.

Elevated server/admin access:

- Used only in server-only trusted code when user-scoped RLS is insufficient.
- Never exposed to client code.

Catalog import apply uses the server-only `SUPABASE_SECRET_KEY` only from CLI/server operational code after dry run, database preflight, and explicit confirmation. The apply process must not log or report secret keys, connection strings, or access tokens.

The controlled import apply RPC is restricted to the Supabase/Postgres `service_role` database role. The migration revokes function execution from `public`, grants execute only to `service_role`, uses `SECURITY DEFINER` with explicit `search_path = public`, and does not use dynamic SQL with uncontrolled identifiers. Application code reaches this boundary with `SUPABASE_SECRET_KEY`; the key itself is not the SQL role name.

## Storage Security

Recommended buckets:

- `catalog-images-public`: public catalog images.
- `content-images-public`: public content images.
- `user-watch-collection-media-private`: private User Watch Collection photos.
- `user-documents-private`: private receipts, warranty cards, service documents.
- `admin-imports-private`: uploaded import files and reports.

Private storage rules:

- Path includes owner user ID or import batch ID.
- Database row records ownership.
- Upload endpoints verify owner and allowed MIME type.
- Signed URLs are generated server-side after authorization.
- Signed URLs have short TTL.
- Delete operations verify ownership and audit sensitive admin actions.

## Private Collection Data

Private by default:

- Purchase price.
- Purchase source if sensitive.
- Manual User Watch source data.
- Manual User Watch normalized traits unless explicitly exposed through a public-safe view.
- Receipts.
- Warranty documents.
- Service documents.
- Private notes.
- Order links.
- Address and contact details.

Public User Watch Collection visibility is opt-in and per-watch visibility is explicit. Public views render only safe fields.

Manual-watch matching and catalog enrichment must use privacy-safe aggregates. Admin catalog teams may see normalized missing-watch signals such as counts by brand/reference/model, but must not see private notes, documents, user photos, service history, acquisition details, or personal stories.

Implemented User Watch Collection guarantees:

- all user-owned collection tables have RLS policies scoped to `auth.uid()`;
- Server Actions derive ownership from `auth.getUser()` and never accept client-provided `user_id`;
- detail/update/delete queries include both User Watch ID and authenticated owner ID;
- catalog-linked create validates the existing published/archival `watch_reference` in the database;
- manual create writes only private User Watch/source/trait rows and never mutates public catalog tables;
- private photos use owner-prefixed Storage paths and short-lived signed URLs;
- magic-link return paths accept local paths only and reject external redirects.

## Private Documents

Private documents must not be stored in public buckets. They should have:

- MIME validation.
- File size limits.
- Owner checks.
- Optional virus/malware scanning when available.
- Signed URL access only.
- No direct public links.

User Watch photos are private user media by default and are separate from catalog images. They must not be copied into public catalog image storage automatically, even when a User Watch is later linked to a catalog reference.

## Development Catalog Images

Before Supabase Storage is connected, local development can render real catalog source images through the Catalog Read Experience dev image resolver.

Rules:

- resolver is disabled in production;
- browser receives only an opaque validated image key;
- browser cannot request arbitrary filesystem paths or arbitrary ZIP entries;
- `..` traversal and absolute paths are rejected;
- only valid image candidates from the current generated image upload plan can resolve;
- manual-review and intentionally skipped records cannot resolve images;
- broken image candidates cannot resolve;
- source Excel/ZIP files are never served through HTTP;
- no directory listing is exposed.

Future production catalog images must come from the public catalog image storage boundary, not local ZIP packages.

## Server Secrets

Server secrets include:

- Supabase admin secret key (`SUPABASE_SECRET_KEY` / `sb_secret_...`).
- Provider API keys.
- Webhook signing secrets.
- AI provider credentials.
- Storage signing credentials.

Rules:

- Use environment variables.
- Keep secrets in server-only modules.
- Do not log secrets.
- Do not return secrets to the client.
- Do not use secrets in Client Components.

## Elevated Supabase Admin Secret Usage

Allowed:

- Trusted import apply workflow.
- Webhook processing after signature validation.
- Admin operations that require bypassing user RLS.
- Storage signing after authorization.
- System maintenance jobs.

Not allowed:

- General client data fetching.
- Client-side uploads.
- Browser-visible admin state.
- Any code imported by Client Components.

Catalog import apply does not add broad authenticated write policies for catalog tables. The controlled database apply function is restricted to Supabase/Postgres `service_role` execution and is called only from server-side code configured with `SUPABASE_SECRET_KEY`.

## Admin Access

Admin pages must:

- Require authentication.
- Check role server-side.
- Keep admin navigation hidden from non-admins.
- Enforce authorization on every mutation.
- Write audit logs for sensitive changes.
- Avoid relying only on middleware or UI.

## Webhook Validation

Payment and delivery webhooks must:

- Validate provider signature or equivalent authenticity proof.
- Be idempotent.
- Store safe event metadata.
- Reject unknown providers.
- Avoid logging full sensitive payloads.
- Translate provider events into internal events.

No provider integration is active until a real provider is chosen and credentials are verified.

## Audit Logging

Audit logs should record:

- Actor.
- Action.
- Entity type and ID.
- Timestamp.
- Safe metadata.

Audit logs should not contain:

- Secrets.
- Tokens.
- Raw private documents.
- Full payment credentials.
- Sensitive auth data.

## User-Safe Errors

Server logs can contain technical error codes and safe context. User-facing errors should explain the next step without exposing internals.

Examples:

- "Не удалось сохранить изменения. Проверьте данные и попробуйте ещё раз."
- "Эти часы сейчас недоступны для заказа."
- "У вас нет доступа к этому разделу."
