import "server-only";

import { getServerEnv } from "@/config/server-env";

export type YooKassaAmount = {
  value: string;
  currency: "RUB";
};

export type YooKassaPayment = {
  id: string;
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled";
  paid: boolean;
  amount: YooKassaAmount;
  confirmation?: {
    type: "redirect";
    confirmation_url?: string;
  };
  metadata?: Record<string, string>;
  cancellation_details?: {
    party?: string;
    reason?: string;
  };
};

export type YooKassaRefund = {
  id: string;
  payment_id: string;
  status: "pending" | "succeeded" | "canceled";
  amount: YooKassaAmount;
  created_at?: string;
  metadata?: Record<string, string>;
};

export class YooKassaConfigurationError extends Error {
  constructor() {
    super("YooKassa is not configured. Set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY.");
    this.name = "YooKassaConfigurationError";
  }
}

export class YooKassaReceiptConfigurationError extends Error {
  constructor() {
    super("YooKassa receipts are enabled, but fiscal receipt settings are incomplete.");
    this.name = "YooKassaReceiptConfigurationError";
  }
}

export class YooKassaApiError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(status: number, responseBody: string) {
    super(`YooKassa API request failed with HTTP ${status}.`);
    this.name = "YooKassaApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

export function amountMinorToYooKassaValue(amountMinor: number): string {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error("invalid_yookassa_amount_minor");
  }

  return (amountMinor / 100).toFixed(2);
}

export function yookassaAmountValueToMinor(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("invalid_yookassa_amount_value");
  }

  return Math.round(parsed * 100);
}

function truncateYooKassaDescription(value: string): string {
  return value.trim().slice(0, 128);
}

function authHeader(shopId: string, secretKey: string): string {
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`, "utf8").toString("base64")}`;
}

async function yookassaFetch<T>(
  path: string,
  options: {
    method: "GET" | "POST";
    idempotencyKey?: string;
    body?: unknown;
  },
): Promise<T> {
  const env = getServerEnv();

  if (!env.yookassa.isConfigured) {
    throw new YooKassaConfigurationError();
  }

  const headers: HeadersInit = {
    Authorization: authHeader(env.yookassa.shopId, env.yookassa.secretKey),
    Accept: "application/json",
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (options.idempotencyKey) {
    headers["Idempotence-Key"] = options.idempotencyKey;
  }

  const response = await fetch(`${env.yookassa.apiBaseUrl.replace(/\/$/, "")}${path}`, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();

  if (!response.ok) {
    throw new YooKassaApiError(response.status, text);
  }

  return JSON.parse(text) as T;
}

export type ReceiptItemInput = {
  description: string;
  quantity: number;
  amountMinor: number;
  paymentSubject?: string;
};

function normalizeReceiptPhone(value: string): string | undefined {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 ? digits : undefined;
}

function buildReceipt(input: {
  customerEmail: string;
  customerPhone: string;
  items: ReceiptItemInput[];
}) {
  const env = getServerEnv();
  const vatCode = env.yookassa.receiptVatCode;
  const paymentSubject = env.yookassa.receiptPaymentSubject;
  const paymentMode = env.yookassa.receiptPaymentMode;

  if (!vatCode || !paymentSubject || !paymentMode) {
    throw new YooKassaReceiptConfigurationError();
  }

  const customer: Record<string, string> = {};
  if (input.customerEmail.trim()) customer.email = input.customerEmail.trim();
  const phone = normalizeReceiptPhone(input.customerPhone);
  if (phone) customer.phone = phone;
  if (!customer.email && !customer.phone) {
    throw new YooKassaReceiptConfigurationError();
  }

  const receipt: Record<string, unknown> = {
    customer,
    items: input.items.map((item) => ({
      description: truncateYooKassaDescription(item.description),
      quantity: String(item.quantity),
      amount: {
        value: amountMinorToYooKassaValue(item.amountMinor),
        currency: "RUB",
      },
      vat_code: vatCode,
      payment_subject: item.paymentSubject ?? paymentSubject,
      payment_mode: paymentMode,
    })),
  };

  if (env.yookassa.receiptTaxSystemCode) {
    receipt.tax_system_code = env.yookassa.receiptTaxSystemCode;
  }

  return receipt;
}

export async function createYooKassaPayment(input: {
  amountMinor: number;
  orderNumber: string;
  orderId: string;
  paymentAttemptId: string;
  customerEmail: string;
  customerPhone: string;
  items: ReceiptItemInput[];
  returnUrl: string;
  idempotencyKey: string;
}): Promise<YooKassaPayment> {
  const env = getServerEnv();
  const receipt = env.yookassa.receiptsEnabled
    ? buildReceipt({
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        items: input.items,
      })
    : undefined;

  return yookassaFetch<YooKassaPayment>("/payments", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      amount: {
        value: amountMinorToYooKassaValue(input.amountMinor),
        currency: "RUB",
      },
      capture: true,
      confirmation: {
        type: "redirect",
        return_url: input.returnUrl,
      },
      description: truncateYooKassaDescription(`Заказ Eternal Time №${input.orderNumber}`),
      metadata: {
        order_id: input.orderId,
        order_number: input.orderNumber,
        payment_attempt_id: input.paymentAttemptId,
      },
      receipt,
    },
  });
}

export async function getYooKassaPayment(paymentId: string): Promise<YooKassaPayment> {
  return yookassaFetch<YooKassaPayment>(`/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
  });
}

export async function createYooKassaRefund(input: {
  paymentId: string;
  amountMinor: number;
  idempotencyKey: string;
  reason?: string;
  metadata?: Record<string, string>;
  customerEmail?: string;
  customerPhone?: string;
  items?: ReceiptItemInput[];
}): Promise<YooKassaRefund> {
  const env = getServerEnv();
  const receipt =
    env.yookassa.receiptsEnabled && input.items?.length
      ? buildReceipt({
          customerEmail: input.customerEmail ?? "",
          customerPhone: input.customerPhone ?? "",
          items: input.items,
        })
      : undefined;

  return yookassaFetch<YooKassaRefund>("/refunds", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      amount: {
        value: amountMinorToYooKassaValue(input.amountMinor),
        currency: "RUB",
      },
      payment_id: input.paymentId,
      description: input.reason ? truncateYooKassaDescription(input.reason) : undefined,
      metadata: input.metadata,
      receipt,
    },
  });
}

export async function getYooKassaRefund(refundId: string): Promise<YooKassaRefund> {
  return yookassaFetch<YooKassaRefund>(`/refunds/${encodeURIComponent(refundId)}`, {
    method: "GET",
  });
}
