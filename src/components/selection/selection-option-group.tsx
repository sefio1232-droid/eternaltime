"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./selection-page.module.css";

type SelectionOptionLink = {
  code: string;
  label: string;
  description: string;
  href: string;
};

export function SelectionOptionGroup({
  legend,
  options,
  selectedValue,
  continueLabel,
}: Readonly<{
  legend: string;
  options: SelectionOptionLink[];
  selectedValue: string | null;
  continueLabel: string;
}>) {
  const router = useRouter();
  const [selection, setSelection] = useState<string | null>(selectedValue);
  const [isNavigating, setIsNavigating] = useState(false);
  const selectedOption = options.find((option) => option.code === selection) ?? null;

  function continueToNextStep() {
    if (!selectedOption || isNavigating) return;
    setIsNavigating(true);
    router.push(selectedOption.href);
  }

  function moveRadioFocus(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();

    const lastIndex = options.length - 1;
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? lastIndex
        : (index + (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) + options.length) % options.length;
    const nextOption = options[nextIndex];
    const buttons = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    if (!nextOption || !buttons?.[nextIndex]) return;

    setSelection(nextOption.code);
    buttons[nextIndex].focus();
  }

  return (
    <fieldset className={styles.optionFieldset} aria-busy={isNavigating}>
      <legend className="sr-only">{legend}</legend>
      <div className={styles.options} role="radiogroup" aria-label={legend}>
        {options.map((option, index) => {
          const checked = option.code === selection;
          return (
            <button
              key={option.code}
              type="button"
              role="radio"
              aria-checked={checked}
              className={styles.option}
              data-selected={checked ? "true" : undefined}
              tabIndex={checked || (!selection && index === 0) ? 0 : -1}
              onClick={() => setSelection(option.code)}
              onKeyDown={(event) => moveRadioFocus(event, index)}
            >
              <span className={styles.optionNumber} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.optionCopy}>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
              <span className={styles.optionIndicator} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={styles.continueButton}
        disabled={!selectedOption || isNavigating}
        onClick={continueToNextStep}
      >
        {isNavigating ? "Переходим..." : continueLabel}
      </button>
    </fieldset>
  );
}
