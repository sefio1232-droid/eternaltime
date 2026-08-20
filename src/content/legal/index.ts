import legalDocumentsJson from "@/content/legal/legal-documents.generated.json";

export type LegalContentBlock =
  | {
      type: "paragraph";
      text: string;
    }
  | {
      type: "table";
      rows: string[][];
    };

export type LegalDocument = {
  slug: string;
  title: string;
  purpose: string;
  route: `/legal/${string}`;
  sourceFileName: string;
  sourceArchive: string;
  documentTitle: string;
  blockCount: number;
  contentText: string;
  blocks: LegalContentBlock[];
};

export const legalDocuments = legalDocumentsJson as LegalDocument[];

export const legalRoutes = legalDocuments.map((document) => document.route);

export function getLegalDocument(slug: string): LegalDocument | null {
  return legalDocuments.find((document) => document.slug === slug) ?? null;
}

export function requiredLegalDocument(slug: string): LegalDocument {
  const document = getLegalDocument(slug);
  if (!document) {
    throw new Error(`Missing legal document: ${slug}`);
  }
  return document;
}

export const checkoutLegalDocuments = {
  publicOffer: requiredLegalDocument("public-offer"),
  privacy: requiredLegalDocument("privacy"),
  personalDataConsent: requiredLegalDocument("personal-data-consent"),
  marketingConsent: requiredLegalDocument("marketing-consent"),
} as const;
