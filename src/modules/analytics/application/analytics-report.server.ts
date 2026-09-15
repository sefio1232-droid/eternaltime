import "server-only";

import { analyticsEventNames, type AnalyticsEventName } from "@/modules/analytics/domain/events";
import { listAnalyticsEventsSince, type AnalyticsEventRow } from "@/modules/analytics/infrastructure/analytics-repository.server";

export type AnalyticsRangeDays = 7 | 30 | 90;

export type FunnelMetric = {
  eventName: AnalyticsEventName;
  label: string;
  count: number;
};

export type FunnelConversion = {
  label: string;
  from: number;
  to: number;
  rate: number | null;
};

export type AnalyticsReport = {
  rangeDays: AnalyticsRangeDays;
  totalEvents: number;
  uniqueSessions: number;
  metrics: FunnelMetric[];
  conversions: FunnelConversion[];
  latestEvents: AnalyticsEventRow[];
  insufficientData: boolean;
};

const metricLabels: Record<AnalyticsEventName, string> = {
  home_view: "Главная",
  journal_index_view: "Журнал",
  journal_article_view: "Статьи",
  journal_product_click: "Журнал → модель",
  journal_selection_click: "Журнал → подбор",
  catalog_view: "Каталог",
  catalog_filter_changed: "Фильтры каталога",
  watch_view: "Карточки часов",
  candidate_saved: "Сохранения кандидатов",
  candidate_status_changed: "Статусы кандидатов",
  candidate_removed: "Удаления кандидатов",
  compare_added: "Добавлено в сравнение",
  compare_viewed: "Просмотры сравнения",
  selection_started: "Старт подбора",
  selection_completed: "Подбор завершён",
  selection_result_opened: "Подбор → модель",
  selection_candidate_saved: "Подбор → кандидат",
  add_to_cart: "Добавлено в корзину",
  remove_from_cart: "Удалено из корзины",
  checkout_started: "Старт checkout",
  checkout_validation_failed: "Ошибки checkout",
  order_created: "Созданные заказы",
  order_claimed: "Заказы привязаны",
  collection_view: "Коллекция",
  collection_watch_added: "Часы добавлены в коллекцию",
  collection_recommendation_opened: "Коллекция → рекомендация",
};

const primaryMetrics: AnalyticsEventName[] = [
  "catalog_view",
  "watch_view",
  "journal_article_view",
  "candidate_saved",
  "compare_viewed",
  "selection_completed",
  "selection_result_opened",
  "add_to_cart",
  "checkout_started",
  "order_created",
  "order_claimed",
  "collection_watch_added",
];

function rangeStart(rangeDays: AnalyticsRangeDays): string {
  const start = new Date();
  start.setDate(start.getDate() - rangeDays);
  return start.toISOString();
}

function countByEvent(events: AnalyticsEventRow[]): Map<AnalyticsEventName, number> {
  const counts = new Map<AnalyticsEventName, number>();
  for (const name of analyticsEventNames) counts.set(name, 0);
  for (const event of events) {
    if ((analyticsEventNames as readonly string[]).includes(event.event_name)) {
      const name = event.event_name as AnalyticsEventName;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return counts;
}

function conversion(label: string, from: number, to: number): FunnelConversion {
  return {
    label,
    from,
    to,
    rate: from > 0 ? Math.round((to / from) * 1000) / 10 : null,
  };
}

export async function buildAnalyticsReport(rangeDays: AnalyticsRangeDays): Promise<AnalyticsReport> {
  const events = await listAnalyticsEventsSince(rangeStart(rangeDays));
  const counts = countByEvent(events);
  const uniqueSessions = new Set(events.map((event) => event.session_id)).size;

  return {
    rangeDays,
    totalEvents: events.length,
    uniqueSessions,
    metrics: primaryMetrics.map((eventName) => ({
      eventName,
      label: metricLabels[eventName],
      count: counts.get(eventName) ?? 0,
    })),
    conversions: [
      conversion("Карточка → сохранение", counts.get("watch_view") ?? 0, counts.get("candidate_saved") ?? 0),
      conversion("Карточка → корзина", counts.get("watch_view") ?? 0, counts.get("add_to_cart") ?? 0),
      conversion("Checkout → заказ", counts.get("checkout_started") ?? 0, counts.get("order_created") ?? 0),
      conversion("Журнал → модель", counts.get("journal_article_view") ?? 0, counts.get("journal_product_click") ?? 0),
      conversion("Подбор → модель", counts.get("selection_completed") ?? 0, counts.get("selection_result_opened") ?? 0),
    ],
    latestEvents: events.slice(0, 40),
    insufficientData: events.length < 10,
  };
}
