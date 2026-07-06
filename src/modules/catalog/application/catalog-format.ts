import type { Money } from "@/modules/catalog/domain/money";

const rubFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

export function formatCatalogMoney(money: Money | null): string {
  if (!money) {
    return "Цена уточняется";
  }

  if (money.currencyCode === "RUB") {
    return rubFormatter.format(money.amountMinor / 100);
  }

  return `${money.amountMinor / 100} ${money.currencyCode}`;
}

export function formatCatalogCount(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}
