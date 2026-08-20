"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCommerceMoney } from "@/modules/commerce/domain/labels";
import styles from "@/components/commerce/commerce.module.css";

export function RetryPaymentButton({ orderNumber }: Readonly<{ orderNumber: string }>) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function retry() {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}/pay`, { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    setPending(false);

    if (!response.ok || !payload.confirmationUrl) {
      setMessage(payload.message || "Не удалось повторить оплату.");
      return;
    }

    window.location.assign(payload.confirmationUrl);
  }

  return (
    <div>
      <button type="button" className={styles.buyNow} onClick={retry} disabled={pending}>
        Повторить оплату
      </button>
      {message ? <p className={styles.issues}>{message}</p> : null}
    </div>
  );
}

export function AdminOrderStatusButton({
  orderNumber,
  nextStatus,
  label,
}: Readonly<{
  orderNumber: string;
  nextStatus: string;
  label: string;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextStatus }),
    });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(payload.message || "Переход недоступен.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button type="button" className={styles.quietButton} onClick={submit} disabled={pending}>
        {label}
      </button>
      {message ? <p className={styles.issues}>{message}</p> : null}
    </div>
  );
}

export function AdminRefundButton({
  orderNumber,
  refundableAmountMinor,
}: Readonly<{
  orderNumber: string;
  refundableAmountMinor: number;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [amountRub, setAmountRub] = useState("");
  const [reason, setReason] = useState("Возврат по решению администратора Eternal Time");

  async function refund() {
    const normalizedAmountMinor =
      mode === "partial" ? Math.round(Number(amountRub.replace(",", ".")) * 100) : refundableAmountMinor;
    if (!Number.isInteger(normalizedAmountMinor) || normalizedAmountMinor <= 0 || normalizedAmountMinor > refundableAmountMinor) {
      setMessage("Введите корректную сумму возврата.");
      return;
    }

    const confirmed = window.confirm(`Вернуть ${formatCommerceMoney(normalizedAmountMinor)} покупателю через YooKassa?`);
    if (!confirmed) {
      return;
    }

    setPending(true);
    setMessage("");
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountMinor: normalizedAmountMinor,
        reason,
        refundRequestKey: crypto.randomUUID(),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(payload.message || "Возврат не выполнен.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className={styles.adminShippingMeta}>
        <p className={styles.lineMeta}>Доступно к возврату: {formatCommerceMoney(refundableAmountMinor)}</p>
        <label className={styles.checkLine}>
          <input type="radio" checked={mode === "full"} onChange={() => setMode("full")} />
          Полный возврат
        </label>
        <label className={styles.checkLine}>
          <input type="radio" checked={mode === "partial"} onChange={() => setMode("partial")} />
          Частичный возврат
        </label>
        {mode === "partial" ? (
          <label>
            Сумма возврата, ₽
            <input
              inputMode="decimal"
              value={amountRub}
              onChange={(event) => setAmountRub(event.target.value)}
              placeholder="Например, 1500"
            />
          </label>
        ) : null}
        <label>
          Причина
          <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} />
        </label>
      </div>
      <button type="button" className={styles.quietButton} onClick={refund} disabled={pending}>
        Оформить возврат
      </button>
      {message ? <p className={styles.issues}>{message}</p> : null}
    </div>
  );
}

function AdminShipmentButton({
  orderNumber,
  endpoint,
  label,
}: Readonly<{
  orderNumber: string;
  endpoint: "create" | "refresh";
  label: string;
}>) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/shipment/${endpoint}`, {
      method: "POST",
    });
    const payload = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setMessage(payload.message || "Операция доставки недоступна.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <button type="button" className={styles.quietButton} onClick={submit} disabled={pending}>
        {label}
      </button>
      {message ? <p className={styles.issues}>{message}</p> : null}
    </div>
  );
}

export function AdminCreateShipmentButton({ orderNumber }: Readonly<{ orderNumber: string }>) {
  return <AdminShipmentButton orderNumber={orderNumber} endpoint="create" label="Создать отправление повторно" />;
}

export function AdminRefreshShipmentButton({ orderNumber }: Readonly<{ orderNumber: string }>) {
  return <AdminShipmentButton orderNumber={orderNumber} endpoint="refresh" label="Обновить статус доставки" />;
}
