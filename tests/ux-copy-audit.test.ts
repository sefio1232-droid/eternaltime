import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const checkedFiles = [
  "src/components/home/home-product-hero.tsx",
  "src/components/home/home-ecosystem-sections.tsx",
  "src/components/catalog/catalog-hero.tsx",
  "src/components/selection/selection-intro.tsx",
  "src/components/selection/selection-page.tsx",
  "src/app/(public)/faq/page.tsx",
  "src/modules/faq/content/questions.ts",
  "src/app/(public)/journal/page.tsx",
  "src/modules/journal/content/upcoming-stories.ts",
  "src/components/journal/journal-typographic-cover.tsx",
] as const;

function source(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("UX copy audit", () => {
  it("keeps internal implementation language out of public copy", () => {
    const publicCopy = checkedFiles.map((file) => source(file)).join("\n");

    expect(publicCopy).not.toContain("Часы,которые");
    expect(publicCopy).not.toContain("Путь модели");
    expect(publicCopy).not.toContain("Сохранен");
    expect(publicCopy).not.toContain("Сильная база");
    expect(publicCopy).not.toContain("Пробел");
    expect(publicCopy).not.toContain("Следующий шаг");
    expect(publicCopy).not.toContain("действующую архитектуру");
    expect(publicCopy).not.toContain("проверяемой бизнес-конфигурации");
    expect(publicCopy).not.toContain("проверенной бизнес-конфигурации");
    expect(publicCopy).not.toContain("активным коммерческим предложением");
    expect(publicCopy).not.toContain("сайт не подставляет");
    expect(publicCopy).not.toContain("публичный канал связи пока не указан");
    expect(publicCopy).not.toContain("точной паре бренда и артикула");
    expect(publicCopy).not.toContain("Оставить запрос на подбор");
    expect(publicCopy).not.toContain("Ответы сохраняются в ссылке");
    expect(publicCopy).not.toContain("ET / Journal / Issue 01");
    expect(publicCopy).not.toContain("ET / Journal");
    expect(publicCopy).not.toContain("Главная роль изображений");
    expect(publicCopy).not.toContain("Модели из каталога");
    expect(publicCopy).not.toContain("Кварц, механика или solar");
  });

  it("keeps the requested customer-facing replacements visible", () => {
    expect(source("src/components/home/home-ecosystem-sections.tsx")).toContain("Как это работает");
    expect(source("src/components/catalog/catalog-hero.tsx")).toContain("Пройти подбор");
    expect(source("src/components/selection/selection-intro.tsx")).toContain("Сохраните ссылку, чтобы вернуться к подбору позже");
    expect(source("src/modules/faq/content/questions.ts")).toContain("timeeternal@mail.ru");
    expect(source("src/app/(public)/faq/page.tsx")).toContain("Написать нам");
    expect(source("src/app/(public)/journal/page.tsx")).toContain("Журнал EternalTime · Выпуск 01");
    expect(source("src/modules/journal/content/upcoming-stories.ts")).toContain("Кварц, механика или солнечное питание");
  });
});
