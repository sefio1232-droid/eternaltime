import "server-only";

import { displayWatchModelHeading } from "@/modules/catalog/application/catalog-display";
import { getPublicCatalogWatchByIdentity } from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import { mergeCommerceCartItems } from "@/modules/commerce/domain/cart";
import type {
  CheckoutContactInput,
  CommerceCartItemInput,
  CommerceProductSnapshot,
  CommerceResolvedSummary,
} from "@/modules/commerce/domain/types";
import { getDeliveryQuote } from "@/modules/commerce/application/delivery.server";

function snapshotFromWatch(watch: NonNullable<Awaited<ReturnType<typeof getPublicCatalogWatchByIdentity>>>): CommerceProductSnapshot {
  return {
    brandSlug: watch.brandSlug,
    referenceNormalized: watch.referenceNormalized,
    referenceDisplay: watch.referenceDisplay,
    referenceSlug: watch.referenceSlug,
    brandName: watch.brandName,
    displayName: displayWatchModelHeading({
      brandName: watch.brandName,
      title: watch.title,
      referenceDisplay: watch.referenceDisplay,
    }),
    canonicalHref: watch.href,
    image: watch.primaryImage,
    publicPrice: watch.publicPrice,
    purchasable:
      Boolean(watch.publicPrice) &&
      watch.publicPrice?.currencyCode === "RUB" &&
      Number.isInteger(watch.publicPrice.amountMinor) &&
      watch.publicPrice.amountMinor > 0,
  };
}

export async function resolveCommerceSummary(
  items: CommerceCartItemInput[],
  options: { deliveryMethod?: CheckoutContactInput["deliveryMethod"] } = {},
): Promise<CommerceResolvedSummary> {
  const normalizedItems = mergeCommerceCartItems(items);
  const lines = await Promise.all(
    normalizedItems.map(async (input) => {
      const watch = await getPublicCatalogWatchByIdentity({
        brandSlug: input.brandSlug,
        referenceNormalized: input.referenceNormalized,
      });
      const product = watch ? snapshotFromWatch(watch) : null;
      const unitPrice = product?.publicPrice ?? null;
      const issue: "not_found" | "not_purchasable" | null = !product
        ? "not_found"
        : product.purchasable
          ? null
          : "not_purchasable";

      return {
        input,
        product,
        quantity: input.quantity,
        unitPrice,
        lineTotalMinor: unitPrice && issue === null ? unitPrice.amountMinor * input.quantity : null,
        issue,
      };
    }),
  );

  const issues = lines.flatMap((line) => {
    if (line.issue === "not_found") {
      return [`Модель ${line.input.brandSlug} ${line.input.referenceNormalized} не найдена в публичном каталоге.`];
    }
    if (line.issue === "not_purchasable") {
      return [`Для ${line.product?.brandName ?? line.input.brandSlug} ${line.input.referenceNormalized} нет корректной публичной цены.`];
    }
    return [];
  });

  const productSubtotalMinor = lines.reduce((sum, line) => sum + (line.lineTotalMinor ?? 0), 0);
  const delivery = getDeliveryQuote({ productSubtotalMinor, deliveryMethod: options.deliveryMethod });

  if (delivery.status !== "configured") {
    issues.push("Стоимость доставки не настроена на сервере.");
  }

  const allLinesPurchasable = lines.length > 0 && lines.every((line) => line.issue === null && line.lineTotalMinor !== null);
  const purchasable = allLinesPurchasable && delivery.status === "configured";
  const totalAmountMinor = purchasable ? productSubtotalMinor + delivery.amountMinor : null;

  return {
    lines,
    productSubtotalMinor,
    delivery,
    totalAmountMinor,
    currencyCode: "RUB",
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    purchasable,
    issues,
  };
}
