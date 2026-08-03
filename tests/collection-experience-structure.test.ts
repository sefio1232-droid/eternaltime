import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { russianPluralForm } from "@/modules/user-watch-collection/application/local-collection-presentation";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("collection experience route and navigation boundaries", () => {
  it("keeps real profile menu routes and exposes collection as the active product entry", () => {
    const menu = source("src/components/shell/profile-menu.tsx");
    expect(menu).toContain('{ href: "/collection", label: "Моя коллекция"');
    expect(menu).toContain('{ href: "/collection/new", label: "Добавить часы"');
    expect(menu).toContain('{ href: "/account", label: "Профиль"');
    expect(menu).toContain('{ href: "/login", label: "Войти или зарегистрироваться"');
    expect(menu).toContain('aria-expanded={open}');
    expect(menu).toContain('event.key === "Escape"');
  });

  it("implements a real intent route backed by the Catalog Read Repository adapter", () => {
    const route = source("src/app/(public)/collection/recommendations/[intent]/page.tsx");
    expect(route).toContain("isCollectionRecommendationIntent");
    expect(route).toContain("loadLocalCollectionCatalogCandidates");
    expect(route).toContain("LocalCollectionRecommendations");
  });

  it("keeps manual and catalog add modes as keyboard-operable tabs", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    expect(experience).toContain('role="tablist"');
    expect(experience).toContain('role="tab"');
    expect(experience).toContain("ArrowLeft");
    expect(experience).toContain("ArrowRight");
    expect(experience).toContain("Добавить вручную");
    expect(experience).toContain("Выбрать из каталога");
    expect(experience).toContain("formDisclosure");
    expect(experience).toContain('collapsible = false');
  });

  it("exposes collection deletion through an accessible shelf menu and a visible detail action", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    expect(experience).toContain('aria-haspopup="menu"');
    expect(experience).toContain("aria-expanded={open}");
    expect(experience).toContain('role="menuitem"');
    expect(experience).toContain("Удалить из коллекции");
    expect(experience).toContain("<DeleteWatchDialog");
    expect(experience).toContain("Локальная запись будет удалена");
    expect(experience).toContain('event.key !== "Escape"');
  });

  it("keeps local and demo deletion isolated by their existing storage boundaries", () => {
    const store = source("src/components/collection/use-local-collection-store.ts");
    expect(store).toContain("demoMode ? window.sessionStorage : window.localStorage");
    expect(store).toContain("localCollectionDemoStorageKeyFor(demoScenario)");
    expect(store).toContain("demoScenario ? createDemoLocalCollection");
  });

  it("embeds four recommendation positions without the blocking insufficient-data panel", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    expect(experience).toContain("Что добавить дальше");
    expect(experience).toContain("Точное дополнение");
    expect(experience).toContain("Новое направление");
    expect(experience).not.toContain("Нужно немного больше данных");
  });

  it("preserves the curated recommendation order on the full intent page", () => {
    const recommendations = source("src/components/collection/local-collection-recommendations.tsx");
    expect(recommendations).toContain("recommendationOrder");
    expect(recommendations).not.toContain("return right.total - left.total");
  });

  it("keeps the existing homepage collection CTA pointed at the real collection route", () => {
    const home = source("src/components/home/home-ecosystem-sections.tsx");
    expect(home).toContain('href="/collection"');
    expect(home).toContain("Открыть коллекцию");
  });

  it("uses named demo scenarios at every collection route boundary", () => {
    for (const path of [
      "src/app/(public)/collection/page.tsx",
      "src/app/(public)/collection/new/page.tsx",
      "src/app/(public)/collection/[userWatchId]/page.tsx",
      "src/app/(public)/collection/recommendations/[intent]/page.tsx",
    ]) {
      expect(source(path)).toContain("parseLocalCollectionDemoScenario");
    }
  });

  it("renders adaptive shelf compositions without synthetic empty card columns", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    const styles = source("src/components/collection/collection-experience.module.css");

    expect(experience).toContain("collectionShelfLayoutForCount");
    expect(experience).toContain("data-layout={shelfLayout}");
    expect(experience).toContain('shelfLayout === "single"');
    expect(styles).toContain('.shelfGrid[data-layout="single"]');
    expect(styles).toContain('.shelfGrid[data-layout="split"]');
    expect(styles).toContain('.shelfGrid[data-layout="triad"]');
    expect(styles).toContain('.shelfGrid[data-layout="many"]');
    expect(experience).not.toContain("emptyShelfCard");
  });

  it("uses one twelve-column alignment system for collection overview, profile, and detail", () => {
    const styles = source("src/components/collection/collection-experience.module.css");

    expect(styles).toContain(".masthead {\n  display: grid;\n  grid-template-columns: repeat(12, minmax(0, 1fr));");
    expect(styles).toMatch(
      /\.profileSection \{[\s\S]*?display: grid;[\s\S]*?grid-template-columns: repeat\(12, minmax\(0, 1fr\)\);[\s\S]*?\}/,
    );
    expect(styles).toContain(".detailHero {\n  display: grid;\n  grid-template-columns: repeat(12, minmax(0, 1fr));");
    expect(styles).toContain("grid-template-rows: 1rem 1rem 0.9rem 4.25rem 1.25rem 2.25rem minmax(4.5rem, 1fr) 1.25rem;");
    expect(styles).not.toContain(".emptySlots");
    expect(styles).not.toContain(".emptyWatchPrimary");
  });

  it("keeps all empty-state paths on real routes and avoids fake personal analysis", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    const emptyStage = experience.slice(
      experience.indexOf("function CollectionEmptyStage"),
      experience.indexOf("function CollectionProfileSection"),
    );
    expect(experience).toContain('href="/selection"');
    expect(experience).toContain('href="/watches"');
    expect(experience).toContain('collectionAddHref(demoScenario, "manual")');
    expect(emptyStage).toContain("Не знаете, с чего начать? Пройти подбор");
    expect(emptyStage).toContain("Добавьте первые часы");
    expect(emptyStage).toContain("Сохраните модель из каталога или создайте личную запись");
    expect(experience).not.toContain("selectCollectionEmptyStateExamples");
    expect(emptyStage.match(/className=\{styles\.lightAction\}/g)).toHaveLength(1);
    expect(emptyStage.match(/className=\{styles\.lightSecondaryAction\}/g)).toHaveLength(1);
    expect(emptyStage.match(/href="\/selection"/g)).toHaveLength(1);
    expect(emptyStage).toContain("<ol");
    expect(emptyStage).toContain("emptyProcess");
    expect(emptyStage).toContain("<span>01</span>");
    expect(emptyStage).toContain("<span>02</span>");
    expect(emptyStage).toContain("<span>03</span>");
    expect(emptyStage).not.toContain("CollectionWatchStage");
    expect(emptyStage).not.toContain("data-parallax-depth");
    expect(emptyStage).not.toContain("useCollectionMotion");
    expect(emptyStage).not.toContain("emptyWatchMain");
    expect(emptyStage).not.toContain("emptyTrajectory");
    expect(emptyStage).not.toContain("Личная коллекция · Eternal Time");
    expect(emptyStage).not.toContain("candidate.href");
    expect(emptyStage).not.toContain("emptyExample");
    expect(experience).not.toContain("emptyScenarios");
    expect(experience).not.toContain("fakeAnalysis");
    expect(experience).not.toContain("emptySlots");
    expect(experience).not.toContain("emptyWatchPrimary");
  });

  it("keeps the empty product explanation compact and the populated masthead measurable", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    const styles = source("src/components/collection/collection-experience.module.css");

    expect(styles).toMatch(/\.emptyStage \{[\s\S]*?min-height: 22\.5rem;/);
    expect(styles).toContain(".emptyProcess {\n  min-width: 0;\n  display: grid;");
    expect(experience).toContain('className={styles.mastheadMetrics}');
    expect(experience).toContain("данных заполнено");
    expect(experience).toContain('one: "час", few: "часа", many: "часов"');
    expect(experience).toContain('one: "бренд", few: "бренда", many: "брендов"');
    expect(experience).toContain('one: "сценарий", few: "сценария", many: "сценариев"');
  });

  it("uses deterministic native motion with a reduced-motion fallback", () => {
    const motion = source("src/components/collection/use-collection-motion.ts");
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    const styles = source("src/components/collection/collection-experience.module.css");

    expect(motion).toContain("IntersectionObserver");
    expect(motion).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(motion).not.toContain("requestAnimationFrame");
    expect(motion).not.toContain("data-parallax-depth");
    expect(motion).not.toContain('window.addEventListener("scroll"');
    expect(motion).not.toContain("Math.random");
    expect(motion).not.toContain("Date.now");
    expect(experience).toContain('data-motion-state="idle"');
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(styles).not.toContain("--collection-parallax-y");
  });

  it("renders a compact known-data profile matrix without decorative axes", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    const presentation = source("src/modules/user-watch-collection/application/local-collection-presentation.ts");
    const styles = source("src/components/collection/collection-experience.module.css");

    expect(experience).toContain("buildCollectionProfileMatrix");
    expect(experience).toContain("profileMatrixGroup");
    expect(presentation).toContain("knownDistributionValues");
    expect(presentation).toContain("groups.filter((group) => group.values.length > 0)");
    expect(styles).toContain(".profileMatrixGroup");
    expect(styles).not.toContain(".characterAxisRule");
    expect(styles).not.toContain(".characterAxisMarker");
    expect(experience).toContain("Некоторые характеристики пока не заполнены");
    expect(experience).toContain("profileCompleteness");
    expect(experience).not.toContain("characterFacts");
    expect(experience).not.toContain("characterAxisTrack");
  });

  it("uses one editorial watch stage across collection photography surfaces", () => {
    const stage = source("src/components/collection/collection-watch-stage.tsx");
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    const authenticatedOverview = source("src/components/collection/collection-overview.tsx");
    const authenticatedDetail = source("src/components/collection/user-watch-detail-view.tsx");
    const styles = source("src/components/collection/collection-experience.module.css");

    expect(stage).toContain("CollectionWatchMedia");
    expect(stage).toContain("watchStageSurface");
    expect(stage).toContain("data-watch-stage={variant}");
    expect(experience.match(/<CollectionWatchStage/g)).toHaveLength(5);
    expect(experience).not.toContain('from "@/components/collection/collection-watch-media"');
    expect(authenticatedOverview).toContain("CollectionWatchStage");
    expect(authenticatedDetail).toContain("CollectionWatchStage");
    expect(authenticatedOverview).not.toContain("CollectionWatchMedia");
    expect(authenticatedDetail).not.toContain("CollectionWatchMedia");
    for (const variant of ["shelf", "recommendation", "picker", "preview", "detail"]) {
      expect(stage).toContain(`"${variant}"`);
    }
    expect(stage).not.toContain('"atmospheric"');
    expect(styles).toContain(".watchStageSurface::before");
    expect(styles).toContain(".watchStageSurface::after");
    expect(styles).toContain("place-items: center;");
  });

  it("uses an accessible native photo input inside the premium upload area", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    expect(experience).toContain('id="collection-watch-photo"');
    expect(experience).toContain('htmlFor="collection-watch-photo"');
    expect(experience).toContain('aria-describedby="collection-watch-photo-hint"');
    expect(experience).toContain("Удалить изображение");
  });

  it("defaults the add flow to the catalog and resets picker pagination for every filter", () => {
    const page = source("src/app/(public)/collection/new/page.tsx");
    const experience = source("src/components/collection/local-collection-core-experience.tsx");

    expect(page).toContain('params.mode === "manual" ? "manual" : "catalog"');
    expect(experience).toContain('(["catalog", "manual"] as const).map');
    expect(experience.match(/setPickerPage\(1\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(experience).toContain("listLocalCollectionPickerPage");
    expect(experience).not.toContain(".slice(0, 24)");
  });

  it("keeps catalog ordering deterministic across server and client runtimes", () => {
    const collection = source("src/modules/user-watch-collection/application/local-collection.ts");
    const picker = source("src/modules/user-watch-collection/application/local-collection-picker.ts");
    const builder = collection.slice(
      collection.indexOf("export function buildLocalCollectionCatalogCandidates"),
      collection.indexOf("function catalogWatchFromCandidate"),
    );
    const orderingSource = `${builder}\n${picker}`;

    expect(orderingSource).not.toContain("Math.random");
    expect(orderingSource).not.toContain("Date.now");
    expect(orderingSource).not.toContain("localeCompare");
    expect(collection).not.toContain("limit = 160");
  });

  it("uses equal two- and three-watch columns without a featured shelf item", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    const styles = source("src/components/collection/collection-experience.module.css");

    expect(styles).toContain('.shelfGrid[data-layout="split"] {\n  grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(styles).toContain('.shelfGrid[data-layout="triad"] {\n  grid-template-columns: repeat(3, minmax(0, 1fr));');
    expect(experience).not.toContain("data-featured");
    expect(experience).not.toContain("splitInsight");
  });

  it("keeps adjacent collection actions in explicit gap containers", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    const styles = source("src/components/collection/collection-experience.module.css");

    expect(experience).toContain('className={styles.nextSlotActions}');
    expect(styles).toContain(".nextSlotActions {\n  display: grid;");
    expect(styles).toContain("gap: 0.85rem;");
    expect(experience).toContain('className={styles.actions}');
  });

  it("starts detail in view mode and opens editing only from an explicit action", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");

    expect(experience).toContain("const [editing, setEditing] = useState(false)");
    expect(experience).toContain("onClick={() => openEditor()}");
    expect(experience).toContain('openEditor("watch-status")');
    expect(experience).toContain("{editing ? (");
    expect(experience).toContain("Удалить из коллекции");
    expect(experience).not.toContain("emptyPlaceholder");
  });

  it("renders four equal embedded recommendations instead of a lead-card layout", () => {
    const styles = source("src/components/collection/collection-experience.module.css");

    expect(styles).toContain(".embeddedRecommendationGrid {\n  grid-template-columns: repeat(4, minmax(0, 1fr));");
    expect(styles).not.toContain(".embeddedRecommendationGrid .recommendationCard:first-child");
  });

  it("uses one collection image policy and all required presentation categories", () => {
    const collection = source("src/modules/user-watch-collection/application/local-collection.ts");
    const images = source("src/modules/user-watch-collection/application/local-collection-images.ts");
    const presentation = source("src/modules/user-watch-collection/application/local-collection-presentation.ts");
    const media = source("src/components/collection/collection-watch-media.tsx");

    expect(collection).toContain("collectionPrimaryImageUrl(watch)");
    expect(collection).not.toContain("imageGallery[0]");
    expect(images).toContain("isCleanCollectionPrimaryImage");
    expect(images).toContain("confirmedNonPrimaryImageIdentities");
    for (const category of [
      "compact-digital",
      "standard-digital",
      "analog-bracelet",
      "analog-strap",
      "diver",
      "oversized-sport",
      "rectangular",
      "manual-watch",
      "missing-image",
    ]) {
      expect(presentation).toContain(`"${category}"`);
    }
    expect(media).toContain("onError={() => setFailedImageUrl(imageUrl)}");
    expect(media).toContain("failedImageUrl !== imageUrl");
    expect(media).toContain("Изображение часов не добавлено");
  });

  it("routes shelf, detail, recommendations, and picker through canonical collection images", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    const recommendations = source("src/components/collection/local-collection-recommendations.tsx");
    const store = source("src/components/collection/use-local-collection-store.ts");

    expect(store).toContain("resolveLocalCollectionWatchImages(watches, catalogCandidates)");
    expect(experience.match(/imageUrl=\{effectiveImage\(watch\)\}/g)).toHaveLength(2);
    expect(experience).toContain("return watch.sourceKind === \"manual\" ? watch.photoDataUrl : watch.imageUrl");
    expect(experience).toContain("imageUrl={entry.candidate.imageUrl}");
    expect(experience).toContain("imageUrl={candidate.imageUrl}");
    expect(recommendations).toContain("RecommendationCard");
    expect(recommendations).toContain("<RecommendationCard key={entry.candidate.catalogReferenceId} entry={entry}");
  });

  it("keeps the add page hydration-stable with one unconditional experience wrapper", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    const styles = source("src/components/collection/collection-experience.module.css");

    expect(experience).not.toContain("styles.addExperience");
    expect(styles).toContain(".experience:has(> .addHeader)");
    expect(experience.match(/<header className=\{styles\.addHeader\}>/g)).toHaveLength(1);
    expect(experience.match(/role="tablist"/g)).toHaveLength(1);
    expect(experience).not.toContain("emptyPanel");
  });

  it("uses grammatically correct Russian count forms", () => {
    const watchForms = { one: "час", few: "часа", many: "часов" };
    const modelForms = { one: "модель", few: "модели", many: "моделей" };

    expect(russianPluralForm(1, watchForms)).toBe("час");
    expect(russianPluralForm(2, watchForms)).toBe("часа");
    expect(russianPluralForm(5, watchForms)).toBe("часов");
    expect(russianPluralForm(21, watchForms)).toBe("час");
    expect(russianPluralForm(12, modelForms)).toBe("моделей");
  });

  it("keeps collection copy human-readable and the mobile picker single-column", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    const recommendations = source("src/components/collection/local-collection-recommendations.tsx");
    const styles = source("src/components/collection/collection-experience.module.css");
    const collectionPage = source("src/app/(public)/collection/page.tsx");
    const addPage = source("src/app/(public)/collection/new/page.tsx");

    expect(experience).toContain('label="Артикул"');
    expect(experience).not.toContain("Артикул / референс");
    expect(experience).toContain('"Вручную"');
    expect(experience).not.toContain("Добавлено вручную");
    expect(experience).not.toContain('label="Reference"');
    expect(recommendations).not.toContain("Catalog Read Repository");
    expect(recommendations).not.toContain("canonical route");
    expect(collectionPage).not.toContain("My Collection");
    expect(addPage).not.toContain("Add a watch manually");
    expect(styles).toContain("  .catalogResults {\n    grid-template-columns: 1fr;");
    expect(styles).toContain("overflow-wrap: anywhere;");
  });

  it("provides compact real collection navigation with mobile scrolling and focus states", () => {
    const experience = source("src/components/collection/local-collection-core-experience.tsx");
    const recommendations = source("src/components/collection/local-collection-recommendations.tsx");
    const styles = source("src/components/collection/collection-experience.module.css");

    for (const label of ["Обзор", "Мои часы", "Рекомендации", "Добавить часы"]) {
      expect(experience).toContain(`label: "${label}"`);
    }
    expect(experience).toContain('"collection-shelf"');
    expect(experience).toContain('"collection-recommendations"');
    expect(experience).toContain('aria-current={current === item.id ? "page" : undefined}');
    expect(recommendations).toContain('active="recommendations"');
    expect(styles).toContain("overflow-x: auto;");
    expect(styles).toContain(".collectionSubnav a:focus-visible");
    expect(styles).toContain("scroll-margin-top: 6.5rem;");
  });
});
