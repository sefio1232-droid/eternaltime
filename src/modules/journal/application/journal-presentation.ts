import type { JournalArticleSource } from "@/modules/journal/content/articles";
import type {
  JournalArticleLayoutVariant,
  JournalPresentationBlock,
} from "@/modules/journal/domain/read-models";

function publicSections(article: JournalArticleSource) {
  return article.body.filter((section) => section.visibility !== "internal-review");
}

function sectionId(index: number): string {
  return `section-${index + 1}`;
}

function guideBlocks(article: JournalArticleSource): JournalPresentationBlock[] {
  return publicSections(article).flatMap((section, index): JournalPresentationBlock[] => {
    if (!section.heading) return section.paragraphs.map((text) => ({ type: "paragraph", text }) as const);
    if (index === publicSections(article).length - 1) {
      return [{ type: "conclusion", title: section.heading, paragraphs: section.paragraphs }];
    }
    return [{
      type: "ordered-section",
      id: sectionId(index),
      number: String(index).padStart(2, "0"),
      title: section.heading,
      paragraphs: section.paragraphs,
    }];
  });
}

function essayBlocks(article: JournalArticleSource): JournalPresentationBlock[] {
  const sections = publicSections(article);
  return sections.flatMap((section, index): JournalPresentationBlock[] => {
    if (!section.heading) return section.paragraphs.map((text) => ({ type: "paragraph", text }) as const);
    if (index === sections.length - 1) {
      return [{ type: "conclusion", title: section.heading, paragraphs: section.paragraphs }];
    }
    if (section.heading === "Почему большинство часов лучше считать не инвестицией, а разумной покупкой") {
      const [statement, ...paragraphs] = section.paragraphs;
      return [
        { type: "heading", id: sectionId(index), text: section.heading },
        ...(statement ? [{ type: "statement", text: statement } as const] : []),
        ...paragraphs.map((text) => ({ type: "paragraph", text }) as const),
      ];
    }
    return [
      { type: "heading", id: sectionId(index), text: section.heading },
      ...section.paragraphs.map((text) => ({ type: "paragraph", text }) as const),
    ];
  });
}

function featureBlocks(article: JournalArticleSource): JournalPresentationBlock[] {
  const sections = publicSections(article);
  return sections.flatMap((section, index): JournalPresentationBlock[] => {
    if (!section.heading) return section.paragraphs.map((text) => ({ type: "section-intro", text }) as const);
    if (index === sections.length - 1) {
      return [{ type: "conclusion", title: section.heading, paragraphs: section.paragraphs }];
    }
    if (section.heading === "Механика дает эмоцию, которую не дает смартфон") {
      const [statement, ...paragraphs] = section.paragraphs;
      return [
        { type: "heading", id: sectionId(index), text: section.heading },
        ...(statement ? [{ type: "statement", text: statement } as const] : []),
        ...paragraphs.map((text) => ({ type: "paragraph", text }) as const),
      ];
    }
    if (section.heading === "Они не пытаются быть умнее владельца") {
      const [keyPoint, ...paragraphs] = section.paragraphs;
      return [
        { type: "heading", id: sectionId(index), text: section.heading },
        ...(keyPoint ? [{ type: "key-point", text: keyPoint } as const] : []),
        ...paragraphs.map((text) => ({ type: "paragraph", text }) as const),
      ];
    }
    return [
      { type: "heading", id: sectionId(index), text: section.heading },
      ...section.paragraphs.map((text) => ({ type: "paragraph", text }) as const),
    ];
  });
}

function analysisBlocks(article: JournalArticleSource): JournalPresentationBlock[] {
  return publicSections(article).flatMap((section, index): JournalPresentationBlock[] => [
    ...(section.heading ? [{ type: "heading", id: sectionId(index), text: section.heading } as const] : []),
    ...section.paragraphs.map((text) => ({ type: "paragraph", text }) as const),
  ]);
}

export function buildJournalPresentationBlocks(article: JournalArticleSource): JournalPresentationBlock[] {
  const builders: Record<JournalArticleLayoutVariant, (source: JournalArticleSource) => JournalPresentationBlock[]> = {
    feature: featureBlocks,
    guide: guideBlocks,
    essay: essayBlocks,
    analysis: analysisBlocks,
  };
  return builders[article.layoutVariant](article);
}
