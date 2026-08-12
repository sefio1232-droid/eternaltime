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
};

export class YooKassaConfigurationError extends Error {
  constructor() {
    super("YooKassa is not configured. Set YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY.");
    this.name = "YooKassaConfigurationError";
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

function amountMinorToYooKassaValue(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
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

export async function createYooKassaPayment(input: {
  amountMinor: number;
  orderNumber: string;
  orderId: string;
  userId: string;
  returnUrl: string;
  idempotencyKey: string;
}): Promise<YooKassaPayment> {
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
      description: `Заказ ${input.orderNumber}`,
      metadata: {
        order_id: input.orderId,
        order_number: input.orderNumber,
        user_id: input.userId,
      },
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
}): Promise<YooKassaRefund> {
  return yookassaFetch<YooKassaRefund>("/refunds", {
    method: "POST",
    idempotencyKey: input.idempotencyKey,
    body: {
      amount: {
        value: amountMinorToYooKassaValue(input.amountMinor),
        currency: "RUB",
      },
      payment_id: input.paymentId,
      description: input.reason || undefined,
    },
  });
}

export async function getYooKassaRefund(refundId: string): Promise<YooKassaRefund> {
  return yookassaFetch<YooKassaRefund>(`/refunds/${encodeURIComponent(refundId)}`, {
    method: "GET",
  });
}
