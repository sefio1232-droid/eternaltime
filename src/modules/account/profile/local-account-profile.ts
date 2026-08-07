export const localAccountProfileStorageKey = "eternal-time.local-account-profile.v1";
export const localAccountProfileVersion = 1;

export type PreferredContact = "" | "email" | "phone";

export type LocalAccountProfile = {
  name: string;
  email: string;
  phone: string;
  city: string;
  preferredContact: PreferredContact;
};

type LocalAccountProfileEnvelope = {
  version: typeof localAccountProfileVersion;
  profile: LocalAccountProfile;
};

export type LocalAccountProfileErrors = Partial<Record<keyof LocalAccountProfile, string>>;

export const emptyLocalAccountProfile: LocalAccountProfile = {
  name: "",
  email: "",
  phone: "",
  city: "",
  preferredContact: "",
};

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function normalizeLocalAccountProfile(value: unknown): LocalAccountProfile | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<Record<keyof LocalAccountProfile, unknown>>;
  const name = cleanText(record.name, 80);
  const email = cleanText(record.email, 120);
  const phone = cleanText(record.phone, 32);
  const city = cleanText(record.city, 80);
  const preferredContact = record.preferredContact;
  if (name === null || email === null || phone === null || city === null) return null;
  if (preferredContact !== "" && preferredContact !== "email" && preferredContact !== "phone") return null;
  return { name, email, phone, city, preferredContact };
}

export function validateLocalAccountProfile(profile: LocalAccountProfile): LocalAccountProfileErrors {
  const errors: LocalAccountProfileErrors = {};
  if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    errors.email = "Проверьте формат электронной почты.";
  }
  if (profile.phone && !/^[+\d][\d\s()+-]{5,30}$/.test(profile.phone)) {
    errors.phone = "Используйте цифры и обычные знаки номера телефона.";
  }
  if (profile.preferredContact === "email" && !profile.email) {
    errors.preferredContact = "Укажите электронную почту для этого способа связи.";
  }
  if (profile.preferredContact === "phone" && !profile.phone) {
    errors.preferredContact = "Укажите телефон для этого способа связи.";
  }
  return errors;
}

export function parseLocalAccountProfile(raw: string | null): LocalAccountProfile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LocalAccountProfileEnvelope>;
    if (parsed.version !== localAccountProfileVersion) return null;
    return normalizeLocalAccountProfile(parsed.profile);
  } catch {
    return null;
  }
}

export function serializeLocalAccountProfile(profile: LocalAccountProfile): string {
  const normalized = normalizeLocalAccountProfile(profile) ?? emptyLocalAccountProfile;
  const envelope: LocalAccountProfileEnvelope = { version: localAccountProfileVersion, profile: normalized };
  return JSON.stringify(envelope);
}

export function hasLocalAccountProfile(profile: LocalAccountProfile | null): boolean {
  return Boolean(profile && Object.values(profile).some((value) => value !== ""));
}
