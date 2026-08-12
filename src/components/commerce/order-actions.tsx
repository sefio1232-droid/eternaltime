"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

export function AdminRefundButton({ orderNumber }: Readonly<{ orderNumber: string }>) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function refund() {
    const confirmed = window.confirm("Вернуть доступный остаток оплаты через YooKassa?");
    if (!confirmed) {
      return;
    }

    setPending(true);
    setMessage("");
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Возврат по решению администратора Eternal Time" }),
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
      <button type="button" className={styles.quietButton} onClick={refund} disabled={pending}>
        Вернуть оплату
      </button>
      {message ? <p className={styles.issues}>{message}</p> : null}
    </div>
  );
}
