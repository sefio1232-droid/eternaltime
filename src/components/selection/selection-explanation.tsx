"use client";

import { useId, useState, type ReactNode } from "react";
import styles from "./selection-page.module.css";

export function SelectionExplanation({ children }: Readonly<{ children: ReactNode }>) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  return (
    <div className={styles.explanation}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((current) => !current)}
      >
        <span>{expanded ? "Скрыть подробности" : "Почему этот вариант"}</span>
        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
      </button>
      {expanded ? (
        <div id={panelId} className={styles.explanationPanel}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
