export type NormalizedCdekWidgetPickupPoint = {
  code: string;
  name: string;
  city: string;
  cityCode: number | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  postalCode: string;
  workTime: string;
  note: string;
  providerSnapshot: Record<string, unknown>;
};

type CdekWidgetOfficeAddress = {
  city_code?: unknown;
  city?: unknown;
  code?: unknown;
  name?: unknown;
  address?: unknown;
  postal_code?: unknown;
  work_time?: unknown;
  address_comment?: unknown;
  note?: unknown;
  location?: unknown;
};

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberField(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function coordinates(value: unknown): { latitude: number | null; longitude: number | null } {
  if (!Array.isArray(value) || value.length < 2) {
    return { latitude: null, longitude: null };
  }

  const first = numberField(value[0]);
  const second = numberField(value[1]);
  if (first === null || second === null) {
    return { latitude: null, longitude: null };
  }

  return { latitude: first, longitude: second };
}

function snapshot(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function normalizeCdekWidgetPickupPoint(
  mode: unknown,
  _tariff: unknown,
  address: unknown,
): NormalizedCdekWidgetPickupPoint | null {
  if (mode !== "office" || !address || typeof address !== "object" || Array.isArray(address)) {
    return null;
  }

  const raw = address as CdekWidgetOfficeAddress;
  const code = stringField(raw.code);
  const fullAddress = stringField(raw.address);
  if (!code || !fullAddress) {
    return null;
  }

  const { latitude, longitude } = coordinates(raw.location);

  return {
    code,
    name: stringField(raw.name) || code,
    city: stringField(raw.city),
    cityCode: numberField(raw.city_code),
    address: fullAddress,
    latitude,
    longitude,
    postalCode: stringField(raw.postal_code),
    workTime: stringField(raw.work_time),
    note: stringField(raw.address_comment) || stringField(raw.note),
    providerSnapshot: snapshot(address),
  };
}
