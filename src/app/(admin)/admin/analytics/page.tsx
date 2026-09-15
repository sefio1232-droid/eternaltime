import type { Metadata } from "next";
import { buildAnalyticsReport, type AnalyticsRangeDays } from "@/modules/analytics/application/analytics-report.server";
import styles from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Аналитика" };

function parseRange(value: string | string[] | undefined): AnalyticsRangeDays {
  if (value === "90") return 90;
  if (value === "7") return 7;
  return 30;
}

function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${rate.toLocaleString("ru-RU")}%`;
}

function formatEventName(name: string): string {
  return name.replaceAll("_", " ");
}

export default async function AdminAnalyticsPage({
  searchParams,
}: Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }>) {
  const query = (await searchParams) ?? {};
  const report = await buildAnalyticsReport(parseRange(query.range));

  return (
    <section className={styles.shell}>
      <header className={styles.headerRow}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>P4 funnel analytics</p>
          <h1>Аналитика воронки</h1>
          <p>
            First-party события Eternal Time: без внешних пикселей, без email/телефона/адреса в payload и без
            клиентского доступа к сырым данным.
          </p>
        </div>
        <nav className={styles.actions} aria-label="Период аналитики">
          <a className={report.rangeDays === 7 ? styles.button : styles.linkButton} href="/admin/analytics?range=7">7 дней</a>
          <a className={report.rangeDays === 30 ? styles.button : styles.linkButton} href="/admin/analytics?range=30">30 дней</a>
          <a className={report.rangeDays === 90 ? styles.button : styles.linkButton} href="/admin/analytics?range=90">90 дней</a>
        </nav>
      </header>

      {report.insufficientData ? (
        <div className={styles.empty}>
          <h2>Недостаточно данных</h2>
          <p>
            События уже принимаются, но для выводов по воронке нужно больше реальных пользовательских сессий.
            Дашборд не подставляет вымышленные графики.
          </p>
        </div>
      ) : null}

      <div className={styles.metrics}>
        <article className={styles.metric}>
          <span className={styles.label}>Событий</span>
          <strong>{report.totalEvents.toLocaleString("ru-RU")}</strong>
        </article>
        <article className={styles.metric}>
          <span className={styles.label}>Сессий</span>
          <strong>{report.uniqueSessions.toLocaleString("ru-RU")}</strong>
        </article>
        {report.metrics.slice(0, 10).map((metric) => (
          <article className={styles.metric} key={metric.eventName}>
            <span className={styles.label}>{metric.label}</span>
            <strong>{metric.count.toLocaleString("ru-RU")}</strong>
          </article>
        ))}
      </div>

      <section className={styles.twoColumn}>
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Conversion</p>
              <h2>Ключевые переходы</h2>
            </div>
          </div>
          <div className={styles.cards}>
            {report.conversions.map((item) => (
              <article className={styles.srPreview} key={item.label}>
                <strong>{item.label}</strong>
                <p>
                  {item.to.toLocaleString("ru-RU")} из {item.from.toLocaleString("ru-RU")} · {formatRate(item.rate)}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.eyebrow}>Latest</p>
              <h2>Последние события</h2>
            </div>
          </div>
          <div className={styles.cards}>
            {report.latestEvents.length ? report.latestEvents.map((event, index) => (
              <article className={styles.srPreview} key={`${event.created_at}-${index}`}>
                <strong>{formatEventName(event.event_name)}</strong>
                <p>{new Date(event.created_at).toLocaleString("ru-RU")} · {event.pathname ?? "без пути"}</p>
              </article>
            )) : <p className={styles.note}>Пока нет событий за выбранный период.</p>}
          </div>
        </div>
      </section>
    </section>
  );
}
