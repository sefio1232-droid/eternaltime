import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/components/selection/selection-page.module.css", "utf8");
const page = readFileSync("src/components/selection/selection-page.tsx", "utf8");
const image = readFileSync("src/components/selection/selection-watch-image.tsx", "utf8");

// Structural guards complement browser QA with portrait and square catalog images.
// No viewport pixels, generated CSS class hashes or particular references are pinned.
function declarations(name: string) {
  const rules = [...css.matchAll(new RegExp(`\\.${name}\\s*\\{([^}]+)\\}`, "g"))];
  expect(rules, `${name} must have one shared rule, not variant/breakpoint overrides`).toHaveLength(1);
  return Object.fromEntries(rules[0][1].split(";").filter((value) => value.includes(":")).map((value) => {
    const [property, ...rest] = value.split(":");
    return [property.trim(), rest.join(":").trim()];
  }));
}

describe("Selection image presentation", () => {
  it("reserves a stable stage independent of intrinsic photo dimensions", () => {
    expect(declarations("resultMedia")).toMatchObject({ position: "relative", width: "100%", "aspect-ratio": "4 / 3" });
    expect(declarations("resultMedia").height).toBeUndefined();
  });

  it("gives the image a definite inset box rather than cyclic max-height percentages", () => {
    expect(declarations("imageStage")).toMatchObject({ position: "absolute", inset: "10%", "min-height": "0" });
    expect(declarations("watchImage")).toMatchObject({ width: "100%", height: "100%", "min-height": "0" });
    expect(declarations("watchImage")["max-height"]).toBeUndefined();
  });

  it("contains and centers the entire product canvas, without cover or scale transforms", () => {
    const style = declarations("watchImage");
    expect(style["object-fit"]).toBe("contain");
    expect(style["object-position"]).toBe("center");
    expect(style.transform).toBeUndefined();
    expect(style["clip-path"]).toBeUndefined();
    expect(image).not.toMatch(/object-cover|object-fit:\s*cover|scale\(/);
  });

  it("uses the same normalized wrapper for primary, alternatives and additional cards", () => {
    expect(page).toMatch(/className=\{styles\.imageStage\}>\s*<SelectionWatchImage/);
    expect(page.match(/<SelectionWatchImage\b/g)).toHaveLength(1);
    for (const variant of ["featured", "alternative", "additional"]) {
      expect(page).toContain(`variant="${variant}"`);
    }
    expect(css).not.toMatch(/\[data-variant=[^\]]+\]\s+\.(resultMedia|imageStage|watchImage)/);
  });

  it("uses a plain white stage compatible with official white canvases", () => {
    expect(declarations("resultMedia").background).toBe("#fff");
    expect(declarations("resultMedia")["box-shadow"]).toBeUndefined();
  });

  it("preserves the catalog candidate sequence and a contained missing-image state", () => {
    expect(image).toContain("const image = images[imageIndex]");
    expect(image).toContain("src={image.src}");
    expect(image).toContain("onError={() => setImageIndex((current) => current + 1)}");
    expect(declarations("imageFallback")).toMatchObject({ width: "100%", height: "100%", "min-height": "0" });
  });
});
