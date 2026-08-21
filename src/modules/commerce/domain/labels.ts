import type {
  OrderPaymentStatus,
  OrderShipmentStatus,
  OrderStatus,
  PaymentAttemptStatus,
  RefundStatus,
} from "@/modules/commerce/domain/types";

export const orderStatusLabels: Record<OrderStatus, string> = {
  awaiting_payment: "Ожидает оплаты",
  paid: "Оплачен",
  processing: "Готовим заказ",
  supplier_ordered: "Заказан у поставщика",
  in_transit: "В пути",
  local_delivery: "Передан в доставку",
  completed: "Получен",
  cancelled: "Отменён",
};

export const paymentStatusLabels: Record<OrderPaymentStatus, string> = {
  not_started: "Оплата не начата",
  pending: "Платёж обрабатывается",
  succeeded: "Оплачено",
  partially_refunded: "Частичный возврат",
  refunded: "Возвращено",
};

export const paymentAttemptStatusLabels: Record<PaymentAttemptStatus, string> = {
  created: "Создан",
  pending: "Ожидает подтверждения",
  waiting_for_capture: "Ожидает списания",
  succeeded: "Оплачен",
  canceled: "Не завершён",
  failed: "Не создан",
};

export const refundStatusLabels: Record<RefundStatus, string> = {
  pending: "Возврат обрабатывается",
  succeeded: "Возврат оформлен",
  canceled: "Возврат отменён",
  failed: "Возврат не выполнен",
};

export const shipmentStatusLabels: Record<OrderShipmentStatus, string> = {
  pending_creation: "Оформляется",
  creation_in_progress: "Оформляется",
  creation_pending_retry: "Готовим заказ к отправке",
  creation_failed: "Проблема с оформлением",
  created: "Создана",
  handed_over: "Передан в СДЭК",
  in_transit: "В пути",
  arrived_at_pickup_point: "Прибыл в пункт выдачи",
  ready_for_pickup: "Готов к выдаче",
  delivered: "Получен",
  returning: "Возвращается",
  returned: "Возвращён",
  problem: "Проблема",
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
