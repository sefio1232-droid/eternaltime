import type { OrderPaymentStatus, OrderStatus, PaymentAttemptStatus, RefundStatus } from "@/modules/commerce/domain/types";

export const orderStatusLabels: Record<OrderStatus, string> = {
  awaiting_payment: "Ожидает оплаты",
  paid: "Оплачен",
  processing: "Готовим заказ",
  supplier_ordered: "Заказан у поставщика",
  in_transit: "В пути",
  local_delivery: "Передан в доставку",
  completed: "Получен",
  cancelled: "Отменен",
};

export const paymentStatusLabels: Record<OrderPaymentStatus, string> = {
  not_started: "Оплата не начата",
  pending: "Платеж обрабатывается",
  succeeded: "Оплачено",
  partially_refunded: "Частичный возврат",
  refunded: "Возвращено",
};

export const paymentAttemptStatusLabels: Record<PaymentAttemptStatus, string> = {
  created: "Создан",
  pending: "Ожидает подтверждения",
  waiting_for_capture: "Ожидает списания",
  succeeded: "Оплачен",
  canceled: "Не завершен",
  failed: "Не создан",
};

export const refundStatusLabels: Record<RefundStatus, string> = {
  pending: "Возврат обрабатывается",
  succeeded: "Возврат оформлен",
  canceled: "Возврат отменен",
  failed: "Возврат не выполнен",
};

export function formatCommerceMoney(amountMinor: number | null | undefined, currencyCode = "RUB"): string {
  if (amountMinor === null || amountMinor === undefined) {
    return "—";
  }

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}
