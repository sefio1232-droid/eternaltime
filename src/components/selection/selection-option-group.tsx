"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./selection-page.module.css";

type SelectionOptionLink = {
  code: string;
  label: string;
  description: string;
  href?: string;
};

function normalizeMultiSelection(values: readonly string[]): string[] {
  const unique = [...new Set(values)];
  if (unique.includes("none")) {
    const realValues = unique.filter((value) => value !== "none");
    return realValues.length > 0 ? realValues : ["none"];
  }
  return unique.length > 0 ? unique : [];
}

export function SelectionOptionGroup({
  legend,
  options,
  selectedValue,
  selectedValues,
  continueLabel,
  multiple = false,
  multiHrefBase,
}: Readonly<{
  legend: string;
  options: SelectionOptionLink[];
  selectedValue?: string | null;
  selectedValues?: readonly string[] | null;
  continueLabel: string;
  multiple?: boolean;
  multiHrefBase?: string;
}>) {
  const router = useRouter();
  const initialMulti = useMemo(() => normalizeMultiSelection(selectedValues ?? []), [selectedValues]);
  const [selection, setSelection] = useState<string | null>(selectedValue ?? null);
  const [multiSelection, setMultiSelection] = useState<string[]>(initialMulti);
  const [isNavigating, setIsNavigating] = useState(false);
  const selectedOption = options.find((option) => option.code === selection) ?? null;
  const canContinue = multiple ? multiSelection.length > 0 : Boolean(selectedOption);

  function toggleMulti(code: string) {
    setMultiSelection((current) => {
      if (code === "none") return ["none"];
      const withoutNone = current.filter((value) => value !== "none");
      const next = withoutNone.includes(code) ? withoutNone.filter((value) => value !== code) : [...withoutNone, code];
      return next.length > 0 ? next : [];
    });
  }

  function continueToNextStep() {
    if (!canContinue || isNavigating) return;
    let href = selectedOption?.href;
    if (multiple && multiHrefBase) {
      const [pathname, query = ""] = multiHrefBase.split("?");
      const params = new URLSearchParams(query);
      params.set("features", normalizeMultiSelection(multiSelection).join(","));
      href = `${pathname}?${params.toString()}`;
    }
    if (!href) return;
    setIsNavigating(true);
    router.push(href);
  }

  function moveRadioFocus(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (multiple || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
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
    <fieldset className={styles.optionFieldset} data-multiple={multiple ? "true" : undefined} aria-busy={isNavigating}>
      <legend className="sr-only">{legend}</legend>
      <div className={styles.options} role={multiple ? "group" : "radiogroup"} aria-label={legend}>
        {options.map((option, index) => {
          const checked = multiple ? multiSelection.includes(option.code) : option.code === selection;
          return (
            <button
              key={option.code}
              type="button"
              role={multiple ? undefined : "radio"}
              aria-checked={multiple ? undefined : checked}
              aria-pressed={multiple ? checked : undefined}
              className={styles.option}
              data-selected={checked ? "true" : undefined}
              tabIndex={multiple ? 0 : checked || (!selection && index === 0) ? 0 : -1}
              onClick={() => multiple ? toggleMulti(option.code) : setSelection(option.code)}
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
        disabled={!canContinue || isNavigating}
        onClick={continueToNextStep}
      >
        {isNavigating ? "Переходим..." : continueLabel}
      </button>
    </fieldset>
  );
}
