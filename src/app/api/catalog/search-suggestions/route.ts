import { NextResponse } from "next/server";
import {
  CatalogReadSourceError,
  getCatalogReadDataset,
} from "@/modules/catalog/infrastructure/catalog-read-repository.server";

export const runtime = "nodejs";

const maxSuggestions = 120;
const maxReferences = 70;
const maxLines = 30;
const maxModels = 15;

function addSuggestion(input: {
  values: string[];
  seen: Set<string>;
  value: string | null | undefined;
  limit: number;
}) {
  const normalized = input.value?.normalize("NFKC").trim();
  if (!normalized) return;

  const key = normalized.toLocaleLowerCase("ru");
  if (input.seen.has(key)) return;
  if (input.values.length >= input.limit) return;

  input.seen.add(key);
  input.values.push(normalized);
}

export async function GET() {
  try {
    const dataset = await getCatalogReadDataset();
    const suggestions: string[] = [];
    const seen = new Set<string>();
    const add = (value: string | null | undefined, limit = maxSuggestions) =>
      addSuggestion({ values: suggestions, seen, value, limit });

    for (const brand of dataset.brands) {
      add(brand.name);
    }

    const watches = [...dataset.watches].sort((left, right) =>
      left.brandName.localeCompare(right.brandName, "ru") ||
      left.referenceNormalized.localeCompare(right.referenceNormalized, "ru"),
    );

    let lines = 0;
    for (const watch of watches) {
      if (lines >= maxLines) break;
      const before = suggestions.length;
      add(watch.brandCollectionName, maxSuggestions);
      if (suggestions.length > before) lines += 1;
    }

    let models = 0;
    for (const watch of watches) {
      if (models >= maxModels) break;
      const before = suggestions.length;
      add(watch.watchModelName, maxSuggestions);
      if (suggestions.length > before) models += 1;
    }

    let references = 0;
    for (const watch of watches) {
      if (references >= maxReferences) break;
      const before = suggestions.length;
      add(watch.referenceDisplay || watch.referenceNormalized, maxSuggestions);
      if (suggestions.length > before) references += 1;
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, maxSuggestions) }, {
      headers: {
        "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    if (error instanceof CatalogReadSourceError) {
      return NextResponse.json({ suggestions: [] }, { status: 200 });
    }

    throw error;
  }
}
