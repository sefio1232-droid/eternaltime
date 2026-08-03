// @vitest-environment jsdom

import React, { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LocalCollectionCoreExperience } from "@/components/collection/local-collection-core-experience";
import { CollectionWatchMedia } from "@/components/collection/collection-watch-media";
import {
  createDemoLocalCollection,
  localCollectionStorageKey,
  serializeLocalCollection,
} from "@/modules/user-watch-collection/application/local-collection";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

async function hydrateExperience(
  width: number,
  height: number,
  panel: "overview" | "add" = "add",
  seedStoredCollection = false,
): Promise<{
  errors: string[];
  root: Root;
  container: HTMLDivElement;
}> {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
  window.localStorage.clear();
  window.sessionStorage.clear();

  const element = React.createElement(LocalCollectionCoreExperience, {
    initialMode: "empty",
    initialPanel: panel,
    initialAddMode: "catalog",
    catalogCandidates: [],
  },
  );
  const container = document.createElement("div");
  container.innerHTML = renderToString(element);
  document.body.append(container);
  if (seedStoredCollection) {
    window.localStorage.setItem(
      localCollectionStorageKey,
      serializeLocalCollection(createDemoLocalCollection([], "2026-07-24T00:00:00.000Z", "one")),
    );
  }
  const errors: string[] = [];
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(" "));
  });

  let root!: Root;
  await act(async () => {
    root = hydrateRoot(container, element, {
      onRecoverableError: (error) => errors.push(String(error)),
    });
    await new Promise((resolve) => window.setTimeout(resolve, 1));
  });

  return { errors, root, container };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe("collection add hydration", () => {
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1280, 800],
    [1440, 900],
    [1536, 864],
    [1920, 1080],
  ] as const) {
    it(`keeps SSR and first client render identical at ${width}x${height}`, async () => {
      const { errors, root, container } = await hydrateExperience(width, height);
      const hydrationErrors = errors.filter((message) =>
        /hydration|server rendered|didn't match|recoverable/i.test(message),
      );

      expect(hydrationErrors).toEqual([]);
      expect(container.firstElementChild?.className.split(/\s+/)).toHaveLength(1);
      expect(container.textContent).toContain("Выбрать из каталога");
      expect(container.textContent).toContain("Не нашли модель?");

      await act(async () => root.unmount());
    });
  }

  for (const [width, height] of [[390, 844], [1440, 900]] as const) {
    it(`keeps the motion-enhanced empty overview deterministic at ${width}x${height}`, async () => {
      const { errors, root, container } = await hydrateExperience(width, height, "overview");
      const hydrationErrors = errors.filter((message) =>
        /hydration|server rendered|didn't match|recoverable/i.test(message),
      );

      expect(hydrationErrors).toEqual([]);
      expect(container.querySelectorAll("h1")).toHaveLength(1);
      expect(container.textContent).toContain("Добавьте часы");

      await act(async () => root.unmount());
    });
  }

  it("hydrates the empty SSR shell before restoring a stored collection after mount", async () => {
    const { errors, root, container } = await hydrateExperience(1440, 900, "overview", true);
    const hydrationErrors = errors.filter((message) =>
      /hydration|server rendered|didn't match|recoverable/i.test(message),
    );

    expect(hydrationErrors).toEqual([]);
    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 10));
    });
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(container.textContent).toContain("Часы в вашей коллекции");

    await act(async () => root.unmount());
  });

  it("replaces a failed external image with the neutral collection placeholder", async () => {
    const element = React.createElement(CollectionWatchMedia, {
      imageUrl: "https://example.invalid/watch.webp",
      alt: "Тестовые часы",
    });
    const container = document.createElement("div");
    container.innerHTML = renderToString(element);
    document.body.append(container);
    const errors: string[] = [];
    let root!: Root;

    await act(async () => {
      root = hydrateRoot(container, element, {
        onRecoverableError: (error) => errors.push(String(error)),
      });
    });

    const image = container.querySelector("img");
    expect(image).not.toBeNull();
    await act(async () => {
      image?.dispatchEvent(new Event("error"));
    });

    expect(errors).toEqual([]);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe("");
    expect(container.querySelector('[aria-label="Изображение часов не добавлено"]')).not.toBeNull();

    await act(async () => root.unmount());
  });
});
