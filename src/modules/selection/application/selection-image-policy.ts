import { imageOrderFromAlt } from "@/modules/catalog/application/catalog-image-presentation-policy";
import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";

const blockedSelectionImagePattern =
  /(?:caseback|case[-_ ]?back|back|rear|[_-]b\d+(?:\.|[_-])|clasp|buckle|strap[-_ ]?only|bracelet[-_ ]?detail|packag|box|manual|diagram|schematic|screenshot|technical|drawing|dial[-_ ]?(?:macro|detail)|macro|crown|movement|caliber|profile|profil|soldat|side|lifestyle|wristshot|on[-_ ]?hand|broken|404|unavailable|задн|крышк|застеж|ремешок|упаков|короб|инструкц|схем|чертеж|механизм|калибр|профил|вид сбоку)/i;

function imageText(image: Exclude<CatalogImagePresentation, { kind: "none" }>): string {
  return [image.alt, image.src, image.kind === "remote" ? image.url : ""]
    .join(" ")
    .normalize("NFKC")
    .toLocaleLowerCase("ru");
}

export function isSelectionFrontImage(
  image: CatalogImagePresentation,
  galleryIndex: number,
): image is Exclude<CatalogImagePresentation, { kind: "none" }> {
  if (image.kind === "none" || blockedSelectionImagePattern.test(imageText(image))) {
    return false;
  }

  const order = imageOrderFromAlt(image) ?? galleryIndex + 1;

  // The preview read model intentionally hides ZIP filenames. Only its first,
  // importer-approved image can therefore be proven to be a product front.
  if (image.kind === "development_zip") {
    return order === 1;
  }

  return order <= 3;
}
