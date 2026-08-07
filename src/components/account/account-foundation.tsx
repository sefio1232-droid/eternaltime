"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocalCollectionStore } from "@/components/collection/use-local-collection-store";
import { CollectionWatchMedia } from "@/components/collection/collection-watch-media";
import { useLocalCart } from "@/components/cart/use-local-cart";
import type { CollectionRecommendationCandidate } from "@/modules/collection-intelligence/domain/types";
import { analyzeCollection } from "@/modules/collection-intelligence/domain/analyze";
import { summarizeLocalCart } from "@/modules/cart/application/local-cart";
import {
  emptyLocalAccountProfile,
  hasLocalAccountProfile,
  localAccountProfileStorageKey,
  normalizeLocalAccountProfile,
  parseLocalAccountProfile,
  serializeLocalAccountProfile,
  validateLocalAccountProfile,
  type LocalAccountProfile,
  type LocalAccountProfileErrors,
} from "@/modules/account/profile/local-account-profile";
import styles from "./account-foundation.module.css";

function AccountHeading({ eyebrow, title, description }: Readonly<{ eyebrow: string; title: string; description: string }>) {
  return (
    <header className={styles.heading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

export function AccountOverview({ catalogCandidates }: Readonly<{ catalogCandidates: CollectionRecommendationCandidate[] }>) {
  const { watches, ready } = useLocalCollectionStore({ demoScenario: null, catalogCandidates });
  const { cart, ready: cartReady } = useLocalCart();
  const cartSummary = summarizeLocalCart(cart);
  const analysis = useMemo(() => analyzeCollection(watches, catalogCandidates), [catalogCandidates, watches]);
  const [profileState, setProfileState] = useState<"loading" | "empty" | "ready">("loading");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const profile = parseLocalAccountProfile(window.localStorage.getItem(localAccountProfileStorageKey));
      setProfileState(hasLocalAccountProfile(profile) ? "ready" : "empty");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const activeCount = ready ? analysis.profile.activeCount : null;
  const brandCount = ready ? Object.keys(analysis.profile.brandDistribution).length : null;
  const completeness = ready ? Math.round(analysis.profile.profileCompleteness * 100) : null;

  return (
    <div className={styles.page}>
      <AccountHeading
        eyebrow="ЛИЧНЫЙ КАБИНЕТ"
        title="Ваше пространство"
        description="Коллекция, заказы и данные для связи — в одном месте."
      />

      <div className={styles.workspace}>
        <section className={styles.collectionCard} aria-labelledby="account-collection-title">
          <div className={styles.sectionTitle}><p className={styles.eyebrow}>КОЛЛЕКЦИЯ</p><h2 id="account-collection-title">Профиль вашей коллекции</h2><Link href="/collection">Открыть коллекцию →</Link></div>
          <dl className={styles.stats} aria-busy={!ready}><div><dt>Часов</dt><dd>{activeCount ?? "—"}</dd></div><div><dt>Брендов</dt><dd>{brandCount ?? "—"}</dd></div><div><dt>Полнота данных коллекции</dt><dd>{completeness === null ? "—" : `${completeness}%`}</dd></div></dl>
          <div className={styles.thumbnails} aria-label="Часы из коллекции">{watches.slice(0, 3).map((watch) => <CollectionWatchMedia key={watch.id} imageUrl={watch.photoDataUrl ?? watch.imageUrl} alt={watch.userTitle} className={styles.thumbnail} presentation="compact" />)}</div>
          <p className={styles.collectionNote}>{ready ? analysis.statusMessage : "Загружаем локальную коллекцию…"}</p>
        </section>
        <div className={styles.commerceStack}>
          <section className={styles.smallCard} aria-labelledby="account-cart-title"><p className={styles.eyebrow}>КОРЗИНА</p><h2 id="account-cart-title">{cartReady && cartSummary.itemCount ? `${cartSummary.itemCount} поз.` : "Корзина пуста"}</h2><p>{cartSummary.itemCount ? `Сумма известных цен: ${(cartSummary.knownTotalMinor / 100).toLocaleString("ru-RU")} ₽${cartSummary.unknownPriceCount ? `; без цены: ${cartSummary.unknownPriceCount}` : ""}.` : "Выберите модели в каталоге, когда добавление в корзину станет доступно."}</p><Link href="/cart">Открыть корзину →</Link></section>
          <section className={styles.smallCard} aria-labelledby="account-orders-title"><p className={styles.eyebrow}>ЗАКАЗЫ</p><h2 id="account-orders-title">Заказов пока нет</h2><p>История и статусы появятся после оформления первого заказа.</p><Link href="/account/orders">Открыть раздел →</Link></section>
        </div>
      </div>
      <section className={styles.profileSummary} aria-labelledby="account-profile-title"><p className={styles.eyebrow}>ПРОФИЛЬ</p><h2 id="account-profile-title">{profileState === "ready" ? "Контактные данные сохранены" : "Добавьте контактные данные"}</h2><p>{profileState === "ready" ? "Данные доступны только в этом браузере." : "Имя и предпочтительный способ связи можно сохранить в этом браузере."}</p><Link href="/account/profile">Перейти в профиль →</Link></section>
    </div>
  );
}

function updateField<K extends keyof LocalAccountProfile>(
  profile: LocalAccountProfile,
  field: K,
  value: LocalAccountProfile[K],
): LocalAccountProfile {
  return { ...profile, [field]: value };
}

export function AccountProfileEditor() {
  const [profile, setProfile] = useState<LocalAccountProfile>(emptyLocalAccountProfile);
  const [errors, setErrors] = useState<LocalAccountProfileErrors>({});
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = parseLocalAccountProfile(window.localStorage.getItem(localAccountProfileStorageKey));
      if (stored) setProfile(stored);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeLocalAccountProfile(profile) ?? emptyLocalAccountProfile;
    const nextErrors = validateLocalAccountProfile(normalized);
    setProfile(normalized);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setMessage("Проверьте отмеченные поля.");
      return;
    }
    try {
      window.localStorage.setItem(localAccountProfileStorageKey, serializeLocalAccountProfile(normalized));
      setMessage("Профиль сохранен в этом браузере.");
    } catch {
      setMessage("Браузер не разрешил сохранить профиль локально.");
    }
  }

  function clearProfile() {
    if (!window.confirm("Очистить локальный профиль в этом браузере?")) return;
    window.localStorage.removeItem(localAccountProfileStorageKey);
    setProfile(emptyLocalAccountProfile);
    setErrors({});
    setMessage("Локальный профиль очищен.");
  }

  return (
    <div className={styles.page}>
      <AccountHeading eyebrow="ПРОФИЛЬ" title="Ваш профиль" description="Сохраните только тот контактный контекст, который нужен для будущего общения с Eternal Time." />
      <p className={styles.localNotice}>Данные сохраняются только в этом браузере</p>
      <form className={styles.form} onSubmit={submit} aria-busy={!ready} noValidate>
        <div className={styles.formGrid}>
          <label><span>Имя</span><input name="name" autoComplete="name" maxLength={80} value={profile.name} onChange={(event) => setProfile(updateField(profile, "name", event.target.value))} /></label>
          <label><span>Город</span><input name="city" autoComplete="address-level2" maxLength={80} value={profile.city} onChange={(event) => setProfile(updateField(profile, "city", event.target.value))} /></label>
          <label><span>Электронная почта</span><input name="email" type="email" autoComplete="email" maxLength={120} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "profile-email-error" : undefined} value={profile.email} onChange={(event) => setProfile(updateField(profile, "email", event.target.value))} />{errors.email ? <small id="profile-email-error">{errors.email}</small> : null}</label>
          <label><span>Телефон</span><input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={32} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "profile-phone-error" : undefined} value={profile.phone} onChange={(event) => setProfile(updateField(profile, "phone", event.target.value))} />{errors.phone ? <small id="profile-phone-error">{errors.phone}</small> : null}</label>
          <label className={styles.fullField}><span>Предпочтительный способ связи</span><select name="preferredContact" aria-invalid={Boolean(errors.preferredContact)} aria-describedby={errors.preferredContact ? "profile-contact-error" : undefined} value={profile.preferredContact} onChange={(event) => setProfile(updateField(profile, "preferredContact", event.target.value as LocalAccountProfile["preferredContact"]))}><option value="">Не выбран</option><option value="email">Электронная почта</option><option value="phone">Телефон</option></select>{errors.preferredContact ? <small id="profile-contact-error">{errors.preferredContact}</small> : null}</label>
        </div>
        <div className={styles.formActions}><button type="submit">Сохранить профиль</button><button type="button" onClick={clearProfile}>Очистить</button></div>
        <p className={styles.formMessage} aria-live="polite">{message}</p>
      </form>
    </div>
  );
}

export function AccountOrders() {
  return (
    <div className={styles.page}>
      <AccountHeading eyebrow="ЗАКАЗЫ" title="Мои заказы" description="После оформления здесь появятся выбранные модели, подтвержденная стоимость и этап доставки." />
      <section className={styles.emptyState}>
        <span aria-hidden="true">01</span>
        <div><p className={styles.eyebrow}>СЕЙЧАС</p><h2>Заказов пока нет</h2><p>История и статусы появятся после оформления первого заказа.</p></div>
        <div className={styles.emptyActions}><Link href="/watches">Смотреть каталог</Link><Link href="/selection">Пройти подбор</Link></div>
      </section>
    </div>
  );
}
