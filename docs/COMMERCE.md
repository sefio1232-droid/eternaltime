# Commerce

Commerce uses the catalog repository as source-of-truth for product identity, price, and display snapshots.

Delivery:

- source-of-truth: `src/modules/commerce/application/delivery.server.ts`;
- CDEK is free from 10,000 ₽ product subtotal;
- below 10,000 ₽ delivery is 500 ₽.
- the customer delivery charge is separate from the actual CDEK tariff stored for operations.
- CDEK implementation details live in `docs/CDEK.md`.

Checkout:

- unauthenticated users are redirected to login;
- server validates product identity and price;
- server validates selected delivery and pickup point where applicable;
- order items store immutable purchase snapshots;
- `order_shipments` stores immutable delivery/shipment snapshots and carrier identifiers;
- no payment success is shown without provider confirmation.

Until YooKassa credentials are configured, checkout may create a real order and pending payment attempt, but must not create fake provider ids, confirmation URLs, or success states.

More setup detail: `docs/commerce/COMMERCE_PAYMENT_SETUP.md`.
