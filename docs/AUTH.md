# Auth

Eternal Time uses Supabase Auth with server-side session verification through `auth.getUser()`.

Important routes:

- `/login` starts passwordless magic-link auth.
- `/auth/callback` exchanges the Supabase callback code for a session.
- account, collection, checkout, and admin routes use server-side user checks.

Redirect safety:

- login return paths must be local application paths;
- external URLs and protocol-relative URLs must be rejected;
- magic-link callback origin is resolved by the shared site URL resolver;
- production must explicitly configure `NEXT_PUBLIC_APP_URL=https://eternaltime.shop` or `NEXT_PUBLIC_SITE_URL=https://eternaltime.shop`;
- localhost fallback is allowed only outside `NODE_ENV=production`;
- never trust a client-provided role or user id for authorization.

Production Supabase Dashboard settings:

```text
Authentication → URL Configuration
Site URL: https://eternaltime.shop
Additional Redirect URL: https://eternaltime.shop/auth/callback
```

Local Supabase Dashboard settings:

```text
Authentication → URL Configuration
Site URL: http://localhost:3004
Additional Redirect URL: http://localhost:3004/auth/callback
```

Do not use wildcard production redirects.
