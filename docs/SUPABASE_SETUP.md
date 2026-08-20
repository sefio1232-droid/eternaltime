# Supabase setup

Current Eternal Time project ref:

```text
wnqmgdobphunmkjaugex
```

Environment contract:

```env
NEXT_PUBLIC_APP_URL=https://eternaltime.shop
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
CATALOG_READ_SOURCE=database
```

Rules:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public client settings.
- `SUPABASE_SECRET_KEY` must be a server-only `sb_secret_...` key from Dashboard → Settings → API Keys → Secret keys.
- Do not put `SUPABASE_SECRET_KEY` in any `NEXT_PUBLIC_*` variable.
- Do not commit `.env.local`.
- The secret key is optional for public app boot, but required for controlled catalog apply and trusted elevated backend operations.

Magic-link local auth settings:

```text
Site URL: http://localhost:3004
Redirect URL: http://localhost:3004/auth/callback
```

The callback route is implemented at `/auth/callback`.

Production magic-link redirect:

```text
https://eternaltime.shop/auth/callback
```

The application resolves this origin from `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_SITE_URL`. Localhost fallback is disabled when `NODE_ENV=production`.
