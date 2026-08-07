import styles from "./journal-typographic-cover.module.css";

export type JournalTypographicCoverProps = Readonly<{
  category: string;
  number: string;
  keyword: string;
  variant: "ink" | "paper" | "stone" | "muted-accent";
  size: "lead" | "horizontal" | "compact";
  motif?: "dial" | "index" | "none";
  label?: string;
  title?: string;
}>;

export function JournalTypographicCover({
  category,
  number,
  keyword,
  variant,
  size,
  motif = "dial",
  label = "ET / Journal",
  title,
}: JournalTypographicCoverProps) {
  return (
    <span
      className={styles.cover}
      data-cover-variant={variant}
      data-cover-size={size}
      data-cover-motif={motif}
      role="img"
      aria-label={title ? `Типографическая обложка статьи «${title}»` : `Типографическая обложка: ${keyword}`}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.number} aria-hidden="true">{number}</span>
      <strong>{keyword}</strong>
      <span className={styles.category}>{category}</span>
      {motif !== "none" ? <i className={styles.motif} aria-hidden="true" /> : null}
    </span>
  );
}
