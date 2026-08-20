# CDEK Integration

Eternal Time uses CDEK as a server-side shipping provider adapter. Browser code never talks to CDEK directly and never receives CDEK credentials.

## Environment

```env
CDEK_API_BASE_URL=https://api.cdek.ru/v2
CDEK_CLIENT_ID=
CDEK_CLIENT_SECRET=
CDEK_WIDGET_YANDEX_MAPS_API_KEY=
CDEK_ORIGIN_CITY_CODE=
CDEK_PICKUP_TARIFF_CODE=
CDEK_COURIER_TARIFF_CODE=
CDEK_DEFAULT_PACKAGE_WEIGHT_GRAMS=
CDEK_DEFAULT_PACKAGE_LENGTH_CM=
CDEK_DEFAULT_PACKAGE_WIDTH_CM=
CDEK_DEFAULT_PACKAGE_HEIGHT_CM=
CDEK_WEBHOOK_TOKEN=
```

`CDEK_CLIENT_SECRET` is server-only. It must not be rendered, returned from API routes, logged, committed, or exposed through `NEXT_PUBLIC_*`.

`CDEK_WIDGET_YANDEX_MAPS_API_KEY` is the public Yandex Maps key required by the official CDEK Widget 3.x. Restrict it by HTTP referrer in the Yandex developer cabinet. It is not a CDEK credential and is delivered to the browser only through `/api/delivery/cdek/widget-config`.

## Origin

Current Eternal Time fulfillment has one shipping origin:

- Moscow, Russia;
- CDEK city/location code: `44`;
- configured through `CDEK_ORIGIN_CITY_CODE`.

Do not hardcode the numeric code in domain logic. Do not model Vladivostok or multiple warehouses in this phase. If another warehouse appears later, it is a separate fulfillment phase.

## Customer delivery policy

Customer-facing delivery charge is Eternal Time policy, not the CDEK tariff:

- product subtotal `>= 10 000 ₽` → customer delivery charge `0 ₽`;
- product subtotal `< 10 000 ₽` → customer delivery charge `500 ₽`.

The actual CDEK tariff, when calculated, is stored separately as `carrier_actual_cost_minor`. It may differ from the amount paid by the customer.

## Checkout

Checkout supports:

- CDEK pickup point;
- CDEK courier.

The primary pickup UX uses the official CDEK Widget 3.x:

- client-side script: `https://cdn.jsdelivr.net/npm/@cdek-it/widget@3`;
- config route: `/api/delivery/cdek/widget-config`;
- widget backend proxy/servicePath: `/api/delivery/cdek/widget-service`;
- callback: `onChoose(mode, tariff, address)`.

For pickup mode, `onChoose` is accepted only when `mode === "office"`. The normalized checkout state keeps:

- CDEK office code;
- office name;
- city;
- city code when supplied;
- full address;
- latitude/longitude when supplied;
- postal code when supplied;
- work time / note when supplied;
- raw provider snapshot for server-side audit.

No technical JSON is shown to the customer. The UI shows a calm selected-PVZ summary: city/address/PVZ code and work time when present.

The widget does not replace the server-side CDEK integration. Before order creation, the backend validates the selected office code through the existing CDEK API client. The server validation snapshot, not the browser payload alone, is used for the final order/shipment data.

If the widget cannot load, checkout shows an explicit unavailable state and keeps the existing server-backed pickup-point list as a technical fallback.

Courier delivery stores a separate normalized address snapshot. Pickup-point data and courier address are intentionally not mixed.

## Package policy

Catalog data does not currently provide reliable per-watch shipping weight and dimensions. Shipping package dimensions therefore come from centralized CDEK package env values. If they are missing, CDEK quote and shipment creation are gated rather than guessed.

Current fallback values are shipping-package defaults for a boxed watch order, not the watch's own weight or dimensions:

- `CDEK_DEFAULT_PACKAGE_WEIGHT_GRAMS=700`
- `CDEK_DEFAULT_PACKAGE_LENGTH_CM=25`
- `CDEK_DEFAULT_PACKAGE_WIDTH_CM=18`
- `CDEK_DEFAULT_PACKAGE_HEIGHT_CM=12`

For multiple watches, the package policy multiplies weight by quantity and keeps box dimensions centralized until a real packaging strategy is approved.

## Shipment lifecycle

The expected sequence is:

```text
Checkout
→ order awaiting_payment
→ payment attempt
→ YooKassa payment.succeeded webhook
→ order paid
→ create CDEK shipment
→ store CDEK UUID / order number / tracking number
→ sync shipment status
```

CDEK shipment creation must not happen before provider-confirmed payment success. User redirects are not payment proof.

## Idempotency

`order_shipments.order_id` is unique. Shipment creation claims a pending shipment row before calling CDEK, so repeated payment webhooks or admin retries do not create duplicate shipments for one order.

## Failure handling

If payment succeeds but CDEK is unavailable or not fully configured, the order remains paid. The shipment moves to `creation_pending_retry` or `creation_failed`; admin can retry creation. The customer sees calm fulfillment copy: payment received, order is being prepared.

## Status mapping

Raw CDEK status codes are mapped to Eternal Time statuses:

- оформляется;
- создана;
- передан в СДЭК;
- в пути;
- прибыл в пункт выдачи;
- готов к выдаче;
- получен;
- возвращается;
- проблема.

Customer UI uses mapped labels. Admin UI can show CDEK identifiers and safe carrier metadata fields.

## Admin

`/admin/orders` and order detail pages show:

- delivery method;
- pickup point or courier address;
- customer delivery charge;
- actual CDEK tariff when available;
- shipment status;
- tracking number;
- CDEK UUID/order number;
- last sync time.

Admin actions are server-side only:

- create/retry shipment;
- refresh shipment status.

## Webhook and polling

`/api/delivery/cdek/webhook` accepts CDEK status updates only when `CDEK_WEBHOOK_TOKEN` is configured and supplied by the caller. Admin refresh provides a safe polling fallback when webhook setup is unavailable.
