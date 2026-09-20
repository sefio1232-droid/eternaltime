import { z } from "zod";

export const analyticsEventNames = [
  "home_view",
  "journal_index_view",
  "journal_article_view",
  "journal_product_click",
  "journal_selection_click",
  "catalog_view",
  "catalog_filter_changed",
  "watch_view",
  "candidate_saved",
  "candidate_status_changed",
  "candidate_removed",
  "compare_added",
  "compare_viewed",
  "selection_started",
  "selection_completed",
  "selection_result_opened",
  "selection_candidate_saved",
  "add_to_cart",
  "remove_from_cart",
  "checkout_started",
  "checkout_validation_failed",
  "order_created",
  "order_claimed",
  "collection_view",
  "collection_watch_added",
  "collection_recommendation_opened",
] as const;

export const analyticsSourceSurfaces = [
  "catalog",
  "watch_detail",
  "selection",
  "compare",
  "candidates",
  "journal",
  "collection",
  "cart",
  "checkout",
  "home",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export type AnalyticsSourceSurface = (typeof analyticsSourceSurfaces)[number];

export type AnalyticsEventPayload = {
  eventName: AnalyticsEventName;
  sessionId: string;
  pathname?: string;
  properties: Record<string, unknown>;
};

export type ValidatedAnalyticsEvent = {
  eventName: AnalyticsEventName;
  sessionId: string;
  pathname: string | null;
  properties: Record<string, unknown>;
};

export type AnalyticsValidationCode =
  | "unknown_event"
  | "invalid_session"
  | "invalid_properties"
  | "oversized_properties"
  | "pii_forbidden";

export class AnalyticsEventValidationError extends Error {
  readonly code: AnalyticsValidationCode;

  constructor(code: AnalyticsValidationCode) {
    super(code);
    this.name = "AnalyticsEventValidationError";
    this.code = code;
  }
}

const eventNameSet = new Set<string>(analyticsEventNames);
const sourceSurfaceSchema = z.enum(analyticsSourceSurfaces);
const commerceStateSchema = z.enum(["purchasable", "temporarily_unavailable", "catalog_only"]);
const safeString = z.string().trim().min(1).max(160);
const safeSlug = z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/);
const safePath = z.string().trim().max(240).regex(/^\/[^\s]*$/).optional();
const optionalPositiveInt = z.number().int().positive().max(1000).optional();
const optionalMinorAmount = z.number().int().nonnegative().max(100_000_000_000).optional();

const noProps = z.object({}).strict();
const watchIdentityProps = z.object({
  brand: safeString,
  reference: safeString,
  commerce_state: commerceStateSchema,
}).strict();
const sourceWatchProps = watchIdentityProps.extend({
  source_surface: sourceSurfaceSchema,
}).strict();

const eventPropertySchemas: Record<AnalyticsEventName, z.ZodType<Record<string, unknown>>> = {
  home_view: noProps,
  journal_index_view: noProps,
  journal_article_view: z.object({ article_slug: safeSlug }).strict(),
  journal_product_click: z.object({
    article_slug: safeSlug,
    brand: safeString,
    reference: safeString,
    block_position: z.number().int().nonnegative().max(100),
    commerce_state: commerceStateSchema.optional(),
    showcase_emphasis: z.enum(["fit", "water", "movement"]).optional(),
  }).strict(),
  journal_selection_click: z.object({ article_slug: safeSlug }).strict(),
  catalog_view: z.object({ brand: safeSlug.optional(), query: z.string().trim().max(160).optional() }).strict(),
  catalog_filter_changed: z.object({
    action: z.enum(["changed", "opened", "applied", "cleared", "sort_changed"]).optional(),
    filter: z.enum(["panel", "brand", "price", "movement", "style", "water_resistance", "sort", "search", "availability"]),
    value: z.string().trim().max(120),
  }).strict(),
  watch_view: watchIdentityProps,
  candidate_saved: sourceWatchProps,
  candidate_status_changed: sourceWatchProps.extend({
    status: z.enum(["saved", "considering", "finalist"]),
  }).strict(),
  candidate_removed: sourceWatchProps,
  compare_added: z.object({
    brand: safeString,
    reference: safeString,
    commerce_state: commerceStateSchema.optional(),
    source_surface: sourceSurfaceSchema,
  }).strict(),
  compare_viewed: z.object({ item_count: z.number().int().nonnegative().max(4) }).strict(),
  selection_started: noProps,
  selection_completed: z.object({ result_count: z.number().int().nonnegative().max(80) }).strict(),
  selection_result_opened: sourceWatchProps.extend({ rank: z.number().int().positive().max(80) }).strict(),
  selection_candidate_saved: sourceWatchProps,
  add_to_cart: sourceWatchProps.extend({ quantity: z.number().int().positive().max(5) }).strict(),
  remove_from_cart: sourceWatchProps.extend({ quantity: z.number().int().positive().max(5) }).strict(),
  checkout_started: z.object({
    source: z.enum(["cart", "buy_now"]),
    item_count: optionalPositiveInt,
    subtotal_minor: optionalMinorAmount,
  }).strict(),
  checkout_validation_failed: z.object({ reason: safeString }).strict(),
  order_created: z.object({
    order_number: safeString,
    source: z.enum(["cart", "buy_now"]),
    item_count: z.number().int().positive().max(100),
    total_minor: optionalMinorAmount,
  }).strict(),
  order_claimed: z.object({ order_number: safeString }).strict(),
  collection_view: noProps,
  collection_watch_added: sourceWatchProps,
  collection_recommendation_opened: sourceWatchProps.extend({ intent: safeString.optional() }).strict(),
};

const uuidSchema = z.string().uuid();
const forbiddenKeys = [
  "email",
  "mail",
  "phone",
  "tel",
  "address",
  "name",
  "recipient",
  "comment",
  "token",
  "password",
  "secret",
  "session",
  "cookie",
] as const;

const emailPattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const phonePattern = /(?:\+?\d[\s().-]*){9,}/;
const maxPropertiesBytes = 4096;

function jsonByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function keySuggestsPhone(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  return normalizedKey.includes("phone") || normalizedKey.includes("tel") || normalizedKey.includes("contact");
}

function containsForbiddenPersonalData(value: unknown, key = ""): boolean {
  if (typeof value === "string") {
    return emailPattern.test(value) || (keySuggestsPhone(key) && phonePattern.test(value));
  }

  if (Array.isArray(value)) {
    return value.some((item) => containsForbiddenPersonalData(item, key));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).some(([key, nested]) => {
      const normalizedKey = key.toLowerCase();
      return forbiddenKeys.some((forbidden) => normalizedKey.includes(forbidden)) || containsForbiddenPersonalData(nested, key);
    });
  }

  return false;
}

export function validateAnalyticsEvent(input: unknown): ValidatedAnalyticsEvent {
  const envelope = z.object({
    eventName: z.string(),
    sessionId: z.string(),
    pathname: safePath,
    properties: z.record(z.string(), z.unknown()).default({}),
  }).strict().safeParse(input);

  if (!envelope.success) {
    throw new AnalyticsEventValidationError("invalid_properties");
  }

  if (!eventNameSet.has(envelope.data.eventName)) {
    throw new AnalyticsEventValidationError("unknown_event");
  }

  if (!uuidSchema.safeParse(envelope.data.sessionId).success) {
    throw new AnalyticsEventValidationError("invalid_session");
  }

  if (jsonByteLength(envelope.data.properties) > maxPropertiesBytes) {
    throw new AnalyticsEventValidationError("oversized_properties");
  }

  if (containsForbiddenPersonalData(envelope.data.properties)) {
    throw new AnalyticsEventValidationError("pii_forbidden");
  }

  const eventName = envelope.data.eventName as AnalyticsEventName;
  const parsedProperties = eventPropertySchemas[eventName].safeParse(envelope.data.properties);
  if (!parsedProperties.success) {
    throw new AnalyticsEventValidationError("invalid_properties");
  }

  return {
    eventName,
    sessionId: envelope.data.sessionId,
    pathname: envelope.data.pathname ?? null,
    properties: parsedProperties.data,
  };
}
