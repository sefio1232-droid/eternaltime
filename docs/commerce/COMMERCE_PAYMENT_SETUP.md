# Eternal Time commerce and payment setup

Implemented flow:

1. catalog detail/card resolves a watch by `brandSlug + referenceNormalized`;
2. guest cart stores only versioned identity/quantity/source in `localStorage`;
3. checkout requires Supabase auth and recalculates model, price, CDEK delivery and totals server-side;
4. order is created before redirecting to YooKassa;
5. YooKassa payment is created with `Idempotence-Key` and redirect confirmation;
6. `/api/payments/yookassa/webhook` stores an audit event and reconciles against YooKassa server API before marking paid;
7. account/admin order pages read real Supabase orders;
8. refunds are initiated by admin through YooKassa and stored as payment refund records.

Required environment:

```env
NEXT_PUBLIC_APP_URL=https://example.com
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...
CATALOG_READ_SOURCE=database

DELIVERY_PRICING_MODE=cdek_threshold
CDEK_FREE_DELIVERY_THRESHOLD_RUB=10000
CDEK_BELOW_THRESHOLD_DELIVERY_RUB=500
CDEK_API_BASE_URL=https://api.cdek.ru/v2
CDEK_CLIENT_ID=...
CDEK_CLIENT_SECRET=...
CDEK_ORIGIN_CITY_CODE=...
CDEK_PICKUP_TARIFF_CODE=...
CDEK_COURIER_TARIFF_CODE=...
CDEK_DEFAULT_PACKAGE_WEIGHT_GRAMS=700
CDEK_DEFAULT_PACKAGE_LENGTH_CM=25
CDEK_DEFAULT_PACKAGE_WIDTH_CM=18
CDEK_DEFAULT_PACKAGE_HEIGHT_CM=12
CDEK_WEBHOOK_TOKEN=...

YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_API_BASE_URL=https://api.yookassa.ru/v3
YOOKASSA_WEBHOOK_BASIC_AUTH_USER=optional-extra-guard
YOOKASSA_WEBHOOK_BASIC_AUTH_PASSWORD=optional-extra-guard
YOOKASSA_RECEIPTS_ENABLED=false
```

Delivery rule:

- CDEK delivery is free when the product subtotal is at least 10 000 ₽.
- Below 10 000 ₽ the checkout adds 500 ₽.
- The order stores `delivery_provider`, `delivery_method`, customer delivery charge and selected pickup/courier snapshot before YooKassa payment creation.
- The private `order_shipments` row stores CDEK UUID/number/tracking/status and carrier actual cost separately.

CDEK map / pickup points:

- Checkout supports city search, courier address, and pickup-point card selection.
- Pickup points come from CDEK through server routes, not hardcoded data:

```text
GET /api/delivery/cdek/cities?city=<city>
GET /api/delivery/cdek/pickup-points?city=<city>
GET /api/delivery/cdek/pickup-points?cityCode=<cdekCityCode>
GET /api/delivery/cdek/pickup-points?postalCode=<postalCode>
```

If CDEK credentials are absent, the pickup-points endpoint returns a setup error; payment delivery pricing still follows the explicit business rule above and does not invent live tariffs.

Receipts / 54-FZ:

The YooKassa adapter is ready for receipts, but does not send receipt payloads until fiscal settings are explicitly configured. VAT, taxation system, payment subject/mode and shop fiscal settings must not be guessed in code.

Webhook:

Configure YooKassa to call:

```text
POST https://<domain>/api/payments/yookassa/webhook
```

The handler supports payment and refund events. For payment events it does not trust the incoming JSON as final truth: it finds the stored attempt and fetches the current payment object from YooKassa before changing order status.

Database:

Apply migration:

```text
supabase/migrations/20260811010000_commerce_orders_payments.sql
```

It creates carts, orders, order items, payment attempts/events/refunds and order events with RLS for owners and `admin`/`order_manager`.
