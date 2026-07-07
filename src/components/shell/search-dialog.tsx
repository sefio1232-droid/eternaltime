"use client";

import { useState } from "react";

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

  return (
    <>
      <button
        type="button"
        className={
          compact
            ? "inline-flex h-10 w-10 items-center justify-center border border-[var(--border)] text-sm"
            : "inline-flex h-10 items-center gap-2 border border-[var(--border)] px-3 text-sm"
        }
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(true)}
      >
        <SearchSymbol />
        {compact ? <span className="sr-only">Поиск</span> : <span>Поиск</span>}
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-[var(--surface-graphite)]/55 px-4 py-6" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Поиск по каталогу"
            className="mx-auto mt-16 max-w-2xl bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)]"
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="type-section text-xl">Поиск часов</h2>
              <button
                type="button"
                className="h-9 border border-[var(--border)] px-3 text-sm"
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
                className="h-12 justify-self-start bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--text-inverse)] hover:bg-[var(--accent-strong)]"
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
