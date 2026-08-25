"use client";

import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { useCommerceCart, useResolvedCommerceCart } from "@/components/commerce/use-commerce-cart";
import { normalizeCdekWidgetPickupPoint } from "@/modules/commerce/domain/cdek-widget";
import { formatCommerceMoney } from "@/modules/commerce/domain/labels";
import type { CheckoutContactInput, CheckoutSource, CommerceCartItemInput } from "@/modules/commerce/domain/types";
import styles from "@/components/commerce/commerce.module.css";

type CheckoutExperienceProps = {
  source: CheckoutSource;
  userEmail: string;
};

type CdekCityOption = {
  code: number;
  city: string;
  region: string;
  country: string;
  postalCodes: string[];
};

type CdekPickupPointOption = {
  code: string;
  name: string;
  address: string;
  city: string;
  cityCode: number | null;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  workTime: string;
};

type CdekWidgetConfig =
  | {
      ready: true;
      apiKey: string;
      servicePath: string;
      from: { country_code: "RU"; code: number };
      tariffs: { office: number[]; door: number[] };
      goods: Array<{ width: number; height: number; length: number; weight: number }>;
    }
  | {
      ready: false;
      reason: string;
      message: string;
    };

type CdekWidgetConstructor = new (options: {
  from: CdekWidgetConfig extends infer T ? T extends { ready: true; from: infer From } ? From : never : never;
  root: string;
  apiKey: string;
  canChoose: boolean;
  servicePath: string;
  hideDeliveryOptions: { office: boolean; door: boolean };
  hideFilters: { have_cashless: boolean; have_cash: boolean; is_dressing_room: boolean; type: boolean };
  tariffs: { office: number[]; door: number[] };
  goods: Array<{ width: number; height: number; length: number; weight: number }>;
  defaultLocation?: string;
  lang: "rus";
  currency: "RUB";
  onReady?: () => void;
  onChoose?: (mode: unknown, tariff: unknown, address: unknown) => void;
}) => unknown;

declare global {
  interface Window {
    CDEKWidget?: CdekWidgetConstructor;
  }
}

const emptyContact: CheckoutContactInput = {
  recipientName: "",
  phone: "",
  email: "",
  deliveryMethod: "cdek_courier",
  cdekPickupPointCode: "",
  cdekPickupPointName: "",
  cdekPickupPointAddress: "",
  cdekPickupPointCity: "",
  cdekPickupPointPostalCode: "",
  cdekPickupPointLatitude: undefined,
  cdekPickupPointLongitude: undefined,
  cdekPickupPointWorkTime: "",
  cdekPickupPointNote: "",
  cdekPickupPointProviderSnapshot: undefined,
  city: "",
  postalCode: "",
  street: "",
  house: "",
  unit: "",
  deliveryComment: "",
  customerComment: "",
  legalOfferAccepted: false,
  personalDataConsentAccepted: false,
  marketingConsentAccepted: false,
};

function sourceItems(source: CheckoutSource, cartItems: CommerceCartItemInput[]) {
  return source.type === "buy_now" ? [source.item] : cartItems;
}

function createCheckoutSubmissionKey() {
  const browserCrypto = typeof crypto === "undefined" ? null : crypto;

  if (browserCrypto && typeof browserCrypto.randomUUID === "function") {
    return browserCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (browserCrypto && typeof browserCrypto.getRandomValues === "function") {
    browserCrypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex
    .slice(8, 10)
    .join("")}-${hex.slice(10, 16).join("")}`;
}

async function loadCdekWidgetConstructor(): Promise<CdekWidgetConstructor> {
  if (window.CDEKWidget) {
    return window.CDEKWidget;
  }

  const widgetModule = await import("@cdek-it/widget");
  const constructor = widgetModule.default as unknown as CdekWidgetConstructor | undefined;
  if (!constructor) {
    throw new Error("cdek_widget_constructor_missing");
  }

  window.CDEKWidget = constructor;
  return constructor;
}

function clearPickupState(contact: CheckoutContactInput): CheckoutContactInput {
  return {
    ...contact,
    cdekPickupPointCode: "",
    cdekPickupPointName: "",
    cdekPickupPointAddress: "",
    cdekPickupPointCity: "",
    cdekPickupPointPostalCode: "",
    cdekPickupPointLatitude: undefined,
    cdekPickupPointLongitude: undefined,
    cdekPickupPointWorkTime: "",
    cdekPickupPointNote: "",
    cdekPickupPointProviderSnapshot: undefined,
  };
}

export function CheckoutExperience({ source, userEmail }: CheckoutExperienceProps) {
  const rootId = `cdek-map-${useId().replace(/:/g, "")}`;
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const widgetTriggerRef = useRef<HTMLButtonElement | null>(null);
  const wasWidgetOpenRef = useRef(false);
  const cart = useCommerceCart();
  const activeItems = useMemo(() => sourceItems(source, cart.items), [cart.items, source]);
  const { summary, loading } = useResolvedCommerceCart(activeItems);
  const [contact, setContact] = useState<CheckoutContactInput>({ ...emptyContact, email: userEmail });
  const [submissionKey] = useState(createCheckoutSubmissionKey);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [cityOptions, setCityOptions] = useState<CdekCityOption[]>([]);
  const [pickupPoints, setPickupPoints] = useState<CdekPickupPointOption[]>([]);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<CdekWidgetConfig | null>(null);
  const [widgetStatus, setWidgetStatus] = useState<"idle" | "loading" | "ready" | "failed">("idle");
  const [widgetError, setWidgetError] = useState("");
  const [widgetAttempt, setWidgetAttempt] = useState(0);

  useEffect(() => {
    if (source.type !== "cart" || !cart.ready || cart.items.length === 0) {
      return;
    }

    fetch("/api/cart/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart.items }),
    })
      .then((response) => response.ok)
      .catch(() => {
        // Checkout can still proceed from the local intent; merge is retried naturally on another visit.
      });
  }, [cart, source.type]);

  useEffect(() => {
    if (!widgetOpen) return;

    let cancelled = false;

    async function initWidget() {
      setWidgetStatus("loading");
      setWidgetError("");

      try {
        const configResponse = await fetch("/api/delivery/cdek/widget-config", { cache: "no-store" });
        const config = (await configResponse.json()) as CdekWidgetConfig;
        if (cancelled) return;
        setWidgetConfig(config);

        if (!config.ready) {
          setWidgetStatus("failed");
          setWidgetError(config.message);
          return;
        }

        const CdekWidget = await loadCdekWidgetConstructor();
        if (cancelled) return;

        const root = rootRef.current;
        if (!root) {
          throw new Error("cdek_widget_root_missing");
        }
        root.innerHTML = "";

        new CdekWidget({
          from: config.from,
          root: rootId,
          apiKey: config.apiKey,
          canChoose: true,
          servicePath: config.servicePath,
          hideDeliveryOptions: { office: false, door: true },
          hideFilters: { have_cashless: false, have_cash: false, is_dressing_room: true, type: false },
          tariffs: config.tariffs,
          goods: config.goods,
          defaultLocation: contact.city || undefined,
          lang: "rus",
          currency: "RUB",
          onReady: () => {
            setWidgetStatus("ready");
          },
          onChoose: (mode, tariff, address) => {
            const point = normalizeCdekWidgetPickupPoint(mode, tariff, address);
            if (!point) {
              setWidgetError("Не удалось прочитать выбранный пункт СДЭК. Попробуйте выбрать другой пункт.");
              return;
            }

            setContact((current) => ({
              ...current,
              deliveryMethod: "cdek_pickup",
              cdekCityCode: point.cityCode ?? current.cdekCityCode,
              cdekPickupPointCode: point.code,
              cdekPickupPointName: point.name,
              cdekPickupPointAddress: point.address,
              cdekPickupPointCity: point.city || current.city,
              cdekPickupPointPostalCode: point.postalCode,
              cdekPickupPointLatitude: point.latitude ?? undefined,
              cdekPickupPointLongitude: point.longitude ?? undefined,
              cdekPickupPointWorkTime: point.workTime,
              cdekPickupPointNote: point.note,
              cdekPickupPointProviderSnapshot: point.providerSnapshot,
              city: point.city || current.city,
              postalCode: current.postalCode || point.postalCode,
            }));
            setWidgetOpen(false);
          },
        });
      } catch {
        if (cancelled) return;
        setWidgetStatus("failed");
        setWidgetError("Не удалось загрузить карту СДЭК. Попробуйте снова или откройте технический список ПВЗ ниже.");
      }
    }

    initWidget();

    return () => {
      cancelled = true;
    };
  }, [contact.city, rootId, widgetAttempt, widgetOpen]);

  useEffect(() => {
    if (widgetOpen) {
      wasWidgetOpenRef.current = true;
      return;
    }

    rootRef.current?.replaceChildren();
    if (wasWidgetOpenRef.current) {
      widgetTriggerRef.current?.focus();
      wasWidgetOpenRef.current = false;
    }
  }, [widgetOpen]);

  function setField<K extends keyof CheckoutContactInput>(key: K, value: CheckoutContactInput[K]) {
    setContact((current) => ({ ...current, [key]: value }));
  }

  function chooseCourierMode() {
    setContact((current) => ({
      ...clearPickupState(current),
      deliveryMethod: "cdek_courier",
    }));
    setPickupPoints([]);
    setDeliveryMessage("");
  }

  function choosePickupMode() {
    setContact((current) => ({
      ...current,
      deliveryMethod: "cdek_pickup",
      street: "",
      house: "",
      unit: "",
    }));
    setDeliveryMessage("");
  }

  async function searchCities() {
    if (contact.city.trim().length < 2) {
      setDeliveryMessage("Введите город.");
      return;
    }

    setDeliveryLoading(true);
    setDeliveryMessage("");
    const response = await fetch(`/api/delivery/cdek/cities?city=${encodeURIComponent(contact.city)}`);
    const payload = await response.json().catch(() => ({}));
    setDeliveryLoading(false);

    if (!response.ok) {
      setCityOptions([]);
      setDeliveryMessage(payload.message || "Не удалось найти город.");
      return;
    }

    setCityOptions(payload.cities ?? []);
    if (!payload.cities?.length) {
      setDeliveryMessage("Город не найден. Проверьте написание.");
    }
  }

  async function selectCity(city: CdekCityOption) {
    setContact((current) => ({
      ...clearPickupState(current),
      city: city.city,
      cdekCityCode: city.code,
      postalCode: current.postalCode || city.postalCodes[0] || "",
    }));
    setPickupPoints([]);
    setCityOptions([]);
    setDeliveryMessage("");
  }

  async function loadPickupPoints() {
    if (!contact.cdekCityCode && contact.city.trim().length < 2) {
      setDeliveryMessage("Сначала выберите город.");
      return;
    }

    setDeliveryLoading(true);
    setDeliveryMessage("");
    const params = new URLSearchParams();
    if (contact.cdekCityCode) {
      params.set("cityCode", String(contact.cdekCityCode));
    } else {
      params.set("city", contact.city);
    }
    const response = await fetch(`/api/delivery/cdek/pickup-points?${params.toString()}`);
    const payload = await response.json().catch(() => ({}));
    setDeliveryLoading(false);

    if (!response.ok) {
      setPickupPoints([]);
      setDeliveryMessage(payload.message || "Не удалось получить пункты выдачи.");
      return;
    }

    setPickupPoints(payload.points ?? []);
    if (!payload.points?.length) {
      setDeliveryMessage("В выбранном городе пункты выдачи не найдены.");
    }
  }

  function selectPickupPoint(point: CdekPickupPointOption) {
    setContact((current) => ({
      ...current,
      deliveryMethod: "cdek_pickup",
      cdekCityCode: point.cityCode ?? current.cdekCityCode,
      cdekPickupPointCode: point.code,
      cdekPickupPointName: point.name,
      cdekPickupPointAddress: point.address,
      cdekPickupPointCity: point.city || current.city,
      cdekPickupPointPostalCode: point.postalCode,
      cdekPickupPointLatitude: point.latitude ?? undefined,
      cdekPickupPointLongitude: point.longitude ?? undefined,
      cdekPickupPointWorkTime: point.workTime,
      cdekPickupPointProviderSnapshot: { source: "api_fallback", code: point.code },
      city: point.city || current.city,
      postalCode: current.postalCode || point.postalCode,
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!summary?.purchasable) {
      setMessage("Проверьте состав заказа и настройку доставки.");
      return;
    }

    if (contact.deliveryMethod === "cdek_pickup" && !contact.cdekPickupPointCode?.trim()) {
      setMessage("Выберите пункт выдачи СДЭК на карте перед переходом к оплате.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const payloadSource: CheckoutSource =
      source.type === "buy_now"
        ? source
        : {
            type: "cart",
            items: activeItems,
          };

    const response = await fetch("/api/checkout/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkoutSubmissionKey: submissionKey,
        source: payloadSource,
        contact,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setMessage(payload.message || "Не удалось начать оплату. Проверьте данные заказа или попробуйте позже.");
      return;
    }

    if (payload.confirmationUrl) {
      if (source.type === "cart") {
        cart.clear();
      }
      window.location.assign(payload.confirmationUrl);
      return;
    }

    if (payload.orderNumber) {
      if (source.type === "cart") {
        cart.clear();
      }
      router.push(`/account/orders/${encodeURIComponent(payload.orderNumber)}`);
      return;
    }

    setMessage("Заказ создан, но онлайн-оплата пока не подключена.");
  }

  const isPickup = contact.deliveryMethod === "cdek_pickup";
  const selectedPickup = contact.cdekPickupPointCode
    ? `${contact.cdekPickupPointCity || contact.city}, ${contact.cdekPickupPointAddress} · ПВЗ: ${contact.cdekPickupPointCode}`
    : "";

  return (
    <div className={styles.checkoutLayout} aria-busy={loading || submitting}>
      <form className={`${styles.panel} ${styles.checkoutForm}`} onSubmit={submit} noValidate>
        <section className={styles.checkoutSection}>
          <p className={styles.eyebrow}>1. Контактные данные</p>
          <div className={styles.fieldGrid}>
            <label>
              Получатель
              <input required autoComplete="name" value={contact.recipientName} onChange={(event) => setField("recipientName", event.target.value)} />
            </label>
            <label>
              Телефон
              <input required type="tel" autoComplete="tel" value={contact.phone} onChange={(event) => setField("phone", event.target.value)} />
            </label>
            <label>
              Email
              <input required type="email" autoComplete="email" value={contact.email} onChange={(event) => setField("email", event.target.value)} />
            </label>
          </div>
        </section>

        <section className={styles.checkoutSection}>
          <p className={styles.eyebrow}>2. Получение</p>
          <div className={styles.deliveryMapSlot}>
            <strong>Доставка СДЭК</strong>
            <p className={styles.lineMeta}>Бесплатно от 10 000 ₽. Для заказов ниже этой суммы — 500 ₽.</p>
            <div className={styles.deliveryChoice} aria-label="Способ доставки СДЭК">
              <button type="button" aria-pressed={isPickup} onClick={choosePickupMode}>
                Пункт выдачи СДЭК
              </button>
              <button type="button" aria-pressed={!isPickup} onClick={chooseCourierMode}>
                Курьером СДЭК
              </button>
            </div>

            {isPickup ? (
              <>
                <div className={styles.cdekMapPrompt}>
                  <div>
                    <p className={styles.eyebrow}>Официальная карта CDEK Widget</p>
                    <h2>Выберите пункт на карте</h2>
                    <p>Можно найти город, посмотреть ПВЗ и выбрать конкретный пункт выдачи. Технический JSON покупателю не показывается.</p>
                  </div>
                  <button type="button" className={styles.buyNow} ref={widgetTriggerRef} onClick={() => setWidgetOpen(true)}>
                    {selectedPickup ? "Изменить на карте" : "Выбрать пункт на карте"}
                  </button>
                </div>

                {selectedPickup ? (
                  <div className={styles.selectedDelivery}>
                    <strong>{contact.cdekPickupPointName || "Пункт выдачи СДЭК"}</strong>
                    <span>{selectedPickup}</span>
                    {contact.cdekPickupPointWorkTime ? <small>{contact.cdekPickupPointWorkTime}</small> : null}
                  </div>
                ) : (
                  <p className={styles.selectedDelivery}>Пункт выдачи пока не выбран. Перед оплатой нужно выбрать ПВЗ на карте.</p>
                )}

                <details className={styles.cdekFallback}>
                  <summary>Карта не загрузилась? Открыть технический список ПВЗ</summary>
                  <div className={styles.fieldGrid}>
                    <label>
                      Город
                      <input autoComplete="address-level2" value={contact.city} onChange={(event) => setField("city", event.target.value)} />
                    </label>
                    <div className={styles.fieldAction}>
                      <button type="button" className={styles.quietButton} onClick={searchCities} disabled={deliveryLoading}>
                        Найти город
                      </button>
                    </div>
                  </div>

                  {cityOptions.length ? (
                    <div className={styles.pickupGrid} aria-label="Найденные города">
                      {cityOptions.map((city) => (
                        <button key={city.code} type="button" className={styles.pickupCard} onClick={() => selectCity(city)}>
                          <strong>{city.city}</strong>
                          <span>{[city.region, city.country].filter(Boolean).join(", ")}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <button type="button" className={styles.quietButton} onClick={loadPickupPoints} disabled={deliveryLoading}>
                    Показать пункты выдачи
                  </button>
                  {pickupPoints.length ? (
                    <div className={styles.pickupGrid} aria-label="Пункты выдачи СДЭК">
                      {pickupPoints.map((point) => (
                        <button
                          key={point.code}
                          type="button"
                          className={styles.pickupCard}
                          aria-pressed={contact.cdekPickupPointCode === point.code}
                          onClick={() => selectPickupPoint(point)}
                        >
                          <strong>{point.name}</strong>
                          <span>{point.address}</span>
                          {point.workTime ? <small>{point.workTime}</small> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </details>
              </>
            ) : (
              <div className={styles.fieldGrid}>
                <label>
                  Город
                  <input required autoComplete="address-level2" value={contact.city} onChange={(event) => setField("city", event.target.value)} />
                </label>
                <label>
                  Индекс
                  <input required autoComplete="postal-code" value={contact.postalCode ?? ""} onChange={(event) => setField("postalCode", event.target.value)} />
                </label>
                <label>
                  Улица
                  <input required autoComplete="address-line1" value={contact.street ?? ""} onChange={(event) => setField("street", event.target.value)} />
                </label>
                <label>
                  Дом
                  <input required value={contact.house ?? ""} onChange={(event) => setField("house", event.target.value)} />
                </label>
                <label>
                  Квартира / офис
                  <input value={contact.unit ?? ""} onChange={(event) => setField("unit", event.target.value)} />
                </label>
              </div>
            )}

            {deliveryMessage ? <p className={styles.issues} role="status">{deliveryMessage}</p> : null}
          </div>
        </section>

        <section className={styles.checkoutSection}>
          <p className={styles.eyebrow}>3. Комментарии</p>
          <div className={styles.fieldGrid}>
            <label className={styles.fullField}>
              Комментарий к доставке
              <textarea value={contact.deliveryComment ?? ""} onChange={(event) => setField("deliveryComment", event.target.value)} />
            </label>
            <label className={styles.fullField}>
              Комментарий к заказу
              <textarea value={contact.customerComment ?? ""} onChange={(event) => setField("customerComment", event.target.value)} />
            </label>
          </div>
        </section>

        <section className={styles.checkoutSection} aria-labelledby="checkout-legal-title">
          <p className={styles.eyebrow}>4. Юридические документы</p>
          <div className={styles.legalConsentBox}>
            <h2 id="checkout-legal-title">Согласия перед оформлением</h2>
            <label className={styles.checkLine}>
              <input
                required
                type="checkbox"
                checked={contact.legalOfferAccepted}
                onChange={(event) => setField("legalOfferAccepted", event.target.checked)}
              />
              <span>
                Я принимаю <Link href="/legal/public-offer">Публичную оферту</Link>, включая условия оплаты, доставки,
                возврата и обмена.
              </span>
            </label>
            <label className={styles.checkLine}>
              <input
                required
                type="checkbox"
                checked={contact.personalDataConsentAccepted}
                onChange={(event) => setField("personalDataConsentAccepted", event.target.checked)}
              />
              <span>
                Я даю <Link href="/legal/personal-data-consent">согласие на обработку персональных данных</Link> и
                ознакомлен(а) с <Link href="/legal/privacy">Политикой обработки персональных данных</Link>.
              </span>
            </label>
            <label className={styles.checkLine}>
              <input
                type="checkbox"
                checked={Boolean(contact.marketingConsentAccepted)}
                onChange={(event) => setField("marketingConsentAccepted", event.target.checked)}
              />
              <span>
                Я согласен(на) получать рекламные сообщения на условиях документа{" "}
                <Link href="/legal/marketing-consent">«Согласие на получение рекламных сообщений»</Link>.
              </span>
            </label>
            <p className={styles.lineMeta}>Отметка согласия на рекламные сообщения не обязательна для оформления заказа.</p>
          </div>
        </section>

        <button className={styles.buyNow} type="submit" disabled={submitting || !summary?.purchasable}>
          Оформить заказ
        </button>
        {message ? <p className={styles.issues} role="status">{message}</p> : null}
      </form>

      <aside className={styles.summaryPanel}>
        <p className={styles.eyebrow}>Состав и стоимость</p>
        <div className={styles.cartLines}>
          {(summary?.lines ?? []).map((line) =>
            line.product ? (
              <article key={`${line.product.brandSlug}:${line.product.referenceNormalized}`} className={styles.line}>
                <div className={styles.lineMedia}>
                  <CatalogImage image={line.product.image} presentation="card" />
                </div>
                <div>
                  <p className={styles.lineTitle}>{line.product.displayName}</p>
                  <p className={styles.lineMeta}>{line.product.referenceDisplay} · {line.quantity} шт.</p>
                  <p>{formatCommerceMoney(line.lineTotalMinor)}</p>
                </div>
              </article>
            ) : null,
          )}
        </div>
        <div className={styles.totals}>
          <div>
            <span>Товары</span>
            <strong>{formatCommerceMoney(summary?.productSubtotalMinor)}</strong>
          </div>
          <div>
            <span>Доставка СДЭК</span>
            <strong>{formatCommerceMoney(summary?.delivery.amountMinor)}</strong>
          </div>
          <div className={styles.totalStrong}>
            <span>К оплате</span>
            <strong>{formatCommerceMoney(summary?.totalAmountMinor)}</strong>
          </div>
        </div>
        {summary?.issues.length ? (
          <ul className={styles.issues}>
            {summary.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}
        <Link className={styles.quietButton} href={source.type === "buy_now" ? "/watches" : "/cart"}>
          Вернуться
        </Link>
      </aside>

      {widgetOpen ? (
        <div
          className={styles.cdekWidgetOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cdek-widget-title"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setWidgetOpen(false);
            }
          }}
        >
          <div className={styles.cdekWidgetShell}>
            <header className={styles.cdekWidgetHeader}>
              <div>
                <p className={styles.eyebrow}>СДЭК</p>
                <h2 id="cdek-widget-title">Выберите пункт выдачи</h2>
              </div>
              <button type="button" className={styles.quietButton} onClick={() => setWidgetOpen(false)}>
                Закрыть
              </button>
            </header>
            <div className={styles.cdekWidgetMap}>
              <div className={styles.cdekWidgetRoot} id={rootId} ref={rootRef} />
              {widgetStatus === "loading" ? <p className={`${styles.lineMeta} ${styles.cdekWidgetStatus}`}>Загружаем карту СДЭК…</p> : null}
              {widgetStatus === "failed" ? (
                <div className={styles.cdekWidgetFallbackState}>
                  <p>
                    {widgetError || (widgetConfig?.ready === false
                      ? widgetConfig.message
                      : "Не удалось загрузить карту СДЭК. Попробуйте снова или откройте технический список ПВЗ ниже.")}
                  </p>
                  <button type="button" className={styles.buyNow} onClick={() => setWidgetAttempt((attempt) => attempt + 1)}>
                    Попробовать ещё раз
                  </button>
                  <button type="button" className={styles.quietButton} onClick={() => setWidgetOpen(false)}>
                    Вернуться к checkout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
