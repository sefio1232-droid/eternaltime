# Admin

Admin access is role-based and checked server-side.

Canonical role data lives in:

- `roles`
- `user_roles`

Application code must not use email as the source of admin authorization. The owner email can appear only in the operational bootstrap tooling below.

## Owner admin bootstrap

Store owner:

- `s3rgushik@yandex.ru`

After this person has completed a real Supabase Auth registration/sign-in, grant the `admin` role with:

```bash
npm run admin:bootstrap
```

The script:

- reads `.env.local` locally without printing `SUPABASE_SECRET_KEY`;
- searches Supabase Auth users for `s3rgushik@yandex.ru`;
- does not create a fake `auth.users` record if the user is missing;
- finds `public.roles.code = 'admin'`;
- inserts an active `public.user_roles` row only if the role is not already active.

Equivalent SQL shape, after the real auth UUID is known:

```sql
insert into public.user_roles (user_id, role_id)
select '<real-auth-user-uuid>'::uuid, r.id
from public.roles r
where r.code = 'admin';
```

Check for an existing active row first, because the active uniqueness rule is implemented as a partial index.

## Server-side RBAC

Admin routes are guarded by `requireAdminAccess()`, which:

1. resolves the current Supabase Auth user server-side;
2. reads active roles from `user_roles` joined to `roles`;
3. fails closed when auth is unavailable, unauthenticated, or the role source fails;
4. allows only admin-like operational roles configured in code, never hardcoded email checks.

Admin repositories call `requireAdminAccess()` before creating the elevated Supabase admin client. UI pages receive only shaped, safe data.

Anonymous and ordinary authenticated users must not access admin data. The admin UI may render a denial state, but authorization must happen on the server, not only by hidden navigation.

## Admin orders

`/admin/orders` is a real Supabase list view with filters and search. It shows compact operational fields and links to the order detail view.

Order detail exposes:

- order number and internal id;
- created/updated/paid timestamps;
- user id;
- customer email, full name, phone;
- item snapshots: brand, model/display name, reference, quantity, unit price, line subtotal;
- product subtotal;
- customer-facing delivery amount;
- customer total;
- payment status and YooKassa payment id when present;
- payment attempts, refunds, and events;
- order status;
- delivery provider/method;
- destination city and CDEK city/location id;
- pickup point code/address or courier address snapshot;
- CDEK shipment UUID;
- CDEK order number;
- tracking number;
- shipment/CDEK status;
- carrier actual cost;
- retry/error state and sync timestamps.

Customer-facing delivery amount and CDEK carrier actual cost are separate. Carrier cost is an admin operational cost and must never be added to the customer's total after checkout.

## Admin users

`/admin/users` is the registry of real Supabase Auth registrations plus safe public profile/order statistics.

It exposes:

- user id;
- email;
- registration date;
- last sign in date when available from the server-side Supabase Auth Admin API;
- display name;
- phone;
- city;
- active roles;
- order count;
- paid order count;
- lifetime paid amount;
- collection watch count when available.

It must not expose password hashes, access tokens, refresh tokens, session data, or provider secrets to the client.

## Delivery business rule

Eternal Time charges the customer by store policy:

- product subtotal `< 10 000 ₽` → delivery `500 ₽`;
- product subtotal `>= 10 000 ₽` → delivery `0 ₽`.

Boundary examples:

- `9 999 ₽` → delivery `500 ₽` → total `10 499 ₽`;
- `10 000 ₽` → delivery `0 ₽` → total `10 000 ₽`;
- `10 001 ₽` → delivery `0 ₽` → total `10 001 ₽`.

This is not the CDEK tariff. The real CDEK waybill cost is stored separately as carrier actual cost and paid/absorbed by the store.
