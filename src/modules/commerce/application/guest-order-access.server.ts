import "server-only";

import crypto from "node:crypto";
import { getServerEnv } from "@/config/server-env";

export const guestOrderAccessCookieName = "et_guest_order_access";

type GuestOrderAccessPayload = {
  version: 1;
  orderNumbers: string[];
};

const maxGuestOrderGrants = 10;

function signingSecret() {
  const secret = getServerEnv().supabase.adminSecretKey;
  return secret || null;
}

function signPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function parseCookieValue(value: string | null | undefined): GuestOrderAccessPayload | null {
  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");
  const secret = signingSecret();
  if (!encodedPayload || !signature || !secret) {
    return null;
  }

  const expected = signPayload(encodedPayload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<GuestOrderAccessPayload>;
    if (decoded.version !== 1 || !Array.isArray(decoded.orderNumbers)) {
      return null;
    }

    return {
      version: 1,
      orderNumbers: decoded.orderNumbers.filter((orderNumber): orderNumber is string => typeof orderNumber === "string"),
    };
  } catch {
    return null;
  }
}

export function createGuestOrderAccessCookieValue(orderNumber: string, previousCookieValue?: string | null) {
  const secret = signingSecret();
  if (!secret) {
    return null;
  }

  const previous = parseCookieValue(previousCookieValue);
  const orderNumbers = [
    orderNumber,
    ...(previous?.orderNumbers ?? []).filter((candidate) => candidate !== orderNumber),
  ].slice(0, maxGuestOrderGrants);
  const encodedPayload = Buffer.from(JSON.stringify({ version: 1, orderNumbers } satisfies GuestOrderAccessPayload)).toString("base64url");
  return `${encodedPayload}.${signPayload(encodedPayload, secret)}`;
}

export function verifyGuestOrderAccessCookie(orderNumber: string, cookieValue?: string | null) {
  const payload = parseCookieValue(cookieValue);
  return Boolean(payload?.orderNumbers.includes(orderNumber));
}
