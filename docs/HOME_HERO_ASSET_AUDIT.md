# Home Hero Asset Audit

Updated: 2026-07-17

This document tracks the production homepage hero asset set. The homepage uses a flat 24-watch orbit: six scenarios, four references per scenario. Normal production render must use exact-reference, front-view, clean-background assets only. Side, three-quarter, foreign-model, fake, rectangle-background, halo-heavy, or white-box assets are excluded from the normal orbit.

Contact sheets and manifests:

- `public/generated/home-hero/final/final-home-hero-assets-contact-sheet.jpg`
- `public/generated/home-hero/final/final-home-hero-assets-manifest.json`
- `public/generated/home-hero/orbit-normalized/orbit-normalized-assets-manifest.json`

## Current Production Table

| Scenario | Position | Reference | Current asset | View | Background | Resolution | Optical scale | Status | Action |
|---|---:|---|---|---|---|---|---:|---|---|
| На каждый день | MAIN | T150.210.11.041.00 | `/generated/home-hero/orbit-normalized/candidates/01-everyday/alt-01.png` | front | transparent, alpha-bound | 1600x1700 source, bounds 574x1088 | 1.053 | approved exact reference | Keep as central until larger final ZIP frame is supplied. |
| На каждый день | ALT 1 | T150.417.11.041.00 | `/generated/home-hero/orbit-normalized/candidates/01-everyday/secondary-01.png` | front | transparent, alpha-bound | 1600x1700 source, bounds 962x1088 | 1.053 | approved exact reference | Keep as alternative; final ZIP frames are low-res. |
| На каждый день | ALT 2 | EFK-100D-2A | `/generated/home-hero/orbit-normalized/candidates/04-first-mechanical/main-01.png` | front | transparent, alpha-bound | 1700x1800 source, bounds 920x1500 | 1.020 | approved exact reference | Keep small/medium; final ZIP frames low-res. |
| На каждый день | ALT 3 | T129.410.11.053.00 | `/generated/home-hero/orbit-normalized/final/t1294101105300/frame-02.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 206x319 | 1.080 | approved but frame-only | Keep as rear/small only. |
| Под рубашку | MAIN | T150.410.16.051.00 | `/generated/home-hero/orbit-normalized/candidates/02-under-shirt/main-01.png` | front | transparent, alpha-bound | 1700x1800 source, bounds 714x1168 | 1.051 | approved exact reference | Keep as central. |
| Под рубашку | ALT 1 | RA-AC0M03S10B | `/generated/home-hero/orbit-normalized/final/raac0m03s10b/frame-01.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 207x320 | 1.080 | approved but frame-only | Keep as small alternative. |
| Под рубашку | ALT 2 | T129.410.11.053.00 | `/generated/home-hero/orbit-normalized/final/t1294101105300/frame-02.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 206x319 | 1.080 | approved but frame-only | Keep as small alternative. |
| Под рубашку | ALT 3 | T150.210.11.041.00 | `/generated/home-hero/orbit-normalized/candidates/01-everyday/alt-01.png` | front | transparent, alpha-bound | 1600x1700 source, bounds 574x1088 | 1.053 | approved exact reference | Keep as rear/small. |
| Для путешествий | MAIN | T120.417.11.041.03 | `/generated/home-hero/orbit-normalized/final/t1204171104103/frame-03.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 954x1372 | 1.031 | approved hero-grade | Keep as central. |
| Для путешествий | ALT 1 | GBD-H1000-1A4 | `/generated/home-hero/orbit-normalized/final/gbdh10001a4/frame-01.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 320x316 | 1.080 | approved but frame-only | Keep as small alternative. |
| Для путешествий | ALT 2 | RA-AC0Q03S10B | `/generated/home-hero/orbit-normalized/final/raac0q03s10b/frame-01.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 173x309 | 1.080 | approved but frame-only | Keep as small alternative. |
| Для путешествий | ALT 3 | T120.417.17.051.02 | `/generated/home-hero/orbit-normalized/final/t1204171705102/frame-02.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 219x311 | 1.080 | approved but frame-only | Keep as rear/small. |
| Первая механика | MAIN | EFK-100D-2A | `/generated/home-hero/orbit-normalized/candidates/04-first-mechanical/main-01.png` | front | transparent, alpha-bound | 1700x1800 source, bounds 920x1500 | 1.020 | approved exact reference | Keep as central. |
| Первая механика | ALT 1 | RA-AC0M03S10B | `/generated/home-hero/orbit-normalized/final/raac0m03s10b/frame-01.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 207x320 | 1.080 | approved but frame-only | Keep small. |
| Первая механика | ALT 2 | RA-AC0Q03S10B | `/generated/home-hero/orbit-normalized/final/raac0q03s10b/frame-01.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 173x309 | 1.080 | approved but frame-only | Keep small. |
| Первая механика | ALT 3 | T137.407.11.041.00 | `/generated/home-hero/orbit-normalized/final/t1374071104100/frame-03.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 248x320 | 1.080 | approved but frame-only | Keep rear/small. |
| Для спорта | MAIN | T120.417.11.041.03 | `/generated/home-hero/orbit-normalized/final/t1204171104103/frame-03.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 954x1372 | 1.031 | approved hero-grade | Used as deterministic replacement for weak green Seastar central asset. |
| Для спорта | ALT 1 | T120.807.33.051.00 | `/generated/home-hero/orbit-normalized/final/t1208073305100/frame-01.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 180x320 | 1.080 | approved but frame-only | Keep small; needs higher-res exact frame before central use. |
| Для спорта | ALT 2 | MTG-B3000DN-1A | `/generated/home-hero/orbit-normalized/candidates/05-sport/alt-01.png` | front | transparent, alpha-bound | 1800x1900 source, bounds 973x1314 | 1.044 | approved candidate, no final ZIP | Keep as candidate; request final ZIP frames. |
| Для спорта | ALT 3 | GBD-H1000-1A4 | `/generated/home-hero/orbit-normalized/final/gbdh10001a4/frame-01.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 320x316 | 1.080 | approved but frame-only | Keep rear/small. |
| В коллекцию | MAIN | T137.407.33.051.00 | `/generated/home-hero/orbit-normalized/final/t1374073305100/frame-02.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 902x1475 | 1.020 | approved hero-grade | Keep as central. |
| В коллекцию | ALT 1 | T137.407.11.041.00 | `/generated/home-hero/orbit-normalized/final/t1374071104100/frame-03.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 248x320 | 1.080 | approved but frame-only | Keep small; angled frames remain rejected. |
| В коллекцию | ALT 2 | MTG-B3000DN-1A | `/generated/home-hero/orbit-normalized/candidates/06-collection/alt-01.png` | front | transparent, alpha-bound | 1900x1900 source, bounds 1027x1388 | 1.036 | approved candidate, no final ZIP | Keep as candidate; request final ZIP frames. |
| В коллекцию | ALT 3 | T120.417.17.051.02 | `/generated/home-hero/orbit-normalized/final/t1204171705102/frame-02.png` | front | transparent, alpha-bound | 1700x1800 canvas, bounds 219x311 | 1.080 | approved but frame-only | Keep rear/small. |

## Rejected Normal-Hero Assets

- `T129.410.11.053.00` frame-01: side view, excluded.
- `T120.417.17.051.02` frame-01: side view, excluded.
- `RA-AC0Q03S10B` frame-02: side view, excluded.
- `T137.407.11.041.00` frame-01 and frame-02: three-quarter/angled, excluded.

## Notes

- The production orbit currently renders only `asset.view === "front"`, `asset.isExactReference === true`, and `asset.isHeroApproved === true` records.
- Low-resolution `FRAME_ONLY` assets are allowed only in small/rear orbit positions. They are not approved for central hero enlargement.
- `MTG-B3000DN-1A` does not have a dedicated final ZIP frame set in the current manifest. Existing exact candidate assets remain in small orbit positions.
- No fake or foreign-model image was introduced in this pass.
