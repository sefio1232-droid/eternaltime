# Orders

Order rows are stored in Supabase and protected by RLS plus server-side authorization.

Expected customer flow:

```text
cart or buy-now
→ checkout
→ server product/price/delivery validation
→ order row
→ order item snapshots
→ payment attempt
→ provider confirmation when configured
```

Snapshot fields must preserve the purchased watch identity, display name, reference, image metadata where available, unit price, quantity, line total, delivery, and final total.

Delivery snapshots are split:

- `orders` keeps customer-facing delivery method, contact, address/PVZ choice, customer delivery charge, and total;
- `order_shipments` keeps CDEK operational state, carrier actual cost, CDEK UUID/order number/tracking number, mapped shipment status, sync timestamps, and retry metadata.

Shipment creation starts only after provider-confirmed payment success. Repeated payment webhooks must reuse the existing `order_shipments` row.

Customers can read only their own orders. Status transitions, refunds, payment reconciliation, and admin notes are controlled by server/admin paths.
