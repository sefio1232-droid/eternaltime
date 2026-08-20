"use client";

import { useEffect, useRef, useState } from "react";

function SearchSymbol() {
  return (
    <span
      aria-hidden="true"
      className="relative inline-block h-4 w-4 rounded-full border border-current after:absolute after:-bottom-1 after:-right-1 after:h-px after:w-2 after:rotate-45 after:bg-current"
    />
  );
}

export function SearchDialog({ compact = false }: Readonly<{ compact?: boolean }>) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={
          compact
            ? "search-trigger search-trigger-compact inline-flex items-center justify-center text-sm"
            : "search-trigger inline-flex items-center gap-2 px-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
        }
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <SearchSymbol />
        {compact ? <span className="sr-only">Поиск</span> : <span>Поиск</span>}
      </button>

      {isOpen ? (
        <div className="search-overlay fixed inset-0 z-50 bg-[var(--surface-graphite)]/55 px-4 py-6" role="presentation" onClick={() => setIsOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Поиск по каталогу"
            className="search-dialog-panel mx-auto mt-16 max-w-2xl bg-[var(--surface)] p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="type-section text-xl">Поиск часов</h2>
              <button
                type="button"
                className="min-h-11 border border-[var(--border)] px-3 text-sm"
                onClick={() => setIsOpen(false)}
              >
                Закрыть
              </button>
            </div>
            <form action="/watches" className="grid gap-4" role="search">
              <label className="grid gap-2">
                <span className="type-meta">Бренд, модель или код на корпусе</span>
                <input
                  name="q"
                  autoFocus
                  className="h-14 border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-lg outline-none"
                  placeholder="Например, PRX или A158WA"
                />
              </label>
              <button
                type="submit"
                className="min-h-12 justify-self-start bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--text-inverse)] hover:bg-[var(--accent-strong)]"
              >
                Искать в каталоге
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}
