# Home Hero Image Assets

This document records the repeatable image preparation pass for Eternal Time homepage hero product assets.

The script is:

```text
npm run home-hero:prepare-assets
```

It reads `imports/generated/catalog-image-upload-plan.json`, extracts local ZIP entries where available, uses explicit remote image URLs where the import manifest has no local file, and writes derived assets into `public/generated/home-hero/`. Original catalog/import images are not modified.

The premium curation shortlist is recorded in `docs/HOME_HERO_WATCH_SHORTLIST.md`.

## Processing Rules

- Background removal uses edge-connected near-white flood fill, not global white deletion.
- Internal white/silver watch areas are protected unless connected to the image edge as background.
- Each model has homepage-specific config: source image index, threshold, crop padding, output canvas size, target scale, and placement.
- Outputs are PNG with alpha on normalized transparent canvases.
- The preview contact sheet is `public/generated/home-hero/home-hero-assets-preview.jpg`.
- The machine-readable report is `public/generated/home-hero/home-hero-assets-report.json`.
- The premium preview contact sheet is `public/generated/home-hero/premium/home-hero-premium-preview.jpg`.
- The premium machine-readable report is `public/generated/home-hero/premium/home-hero-premium-assets-report.json`.
- The main watch angle comparison sheet is `public/generated/home-hero/premium/main-watch-angle-comparison.jpg`.

## Generated Assets

| Scenario | Model | Reference | Selected source | Source size | Output | Output size | Background | Threshold | Crop |
|---|---|---|---|---:|---|---:|---|---:|---|
| 01 На каждый день | Casio A158WA-1DF | `a158wa1df` | `images/Casio/A158WA-1DF/A158WA-1DF_1.webp` from `casio_for_it_latest_with_photos_repacked (1).zip` | 800x1000 | `public/generated/home-hero/casio-a158wa-1df.png` | 1600x1600 | edge-connected removal | 242 | `0,0 800x1000`, padding 60 |
| 02 Под рубашку | Tissot PR 100 34mm | `t1502101104100` | `images/Tissot/T150.210.11.041.00/T150.210.11.041.00_1.webp` from `tissot_for_it_package_v8_more_photos.zip` | 1680x1680 | `public/generated/home-hero/tissot-pr100-34mm.png` | 1600x1600 | source already has alpha; crop normalized | 244 | `392,7 954x1663`, padding 82 |
| 03 Для путешествий | Casio AE-1200WH-1AV | `ae1200wh1av` | `images/Casio/AE-1200WH-1AV/AE-1200WH-1AV_1.jpg` from `casio_for_it_latest_with_photos_repacked (1).zip` | 366x555 | `public/generated/home-hero/casio-ae1200wh-1av.png` | 1600x1600 | edge-connected removal | 242 | `0,0 366x555`, padding 36 |
| 04 Первая механика | Orient Bambino 38 RA-AC0M03S30B | `raac0m03s30b` | official remote URL from import manifest | 328x492 | `public/generated/home-hero/orient-bambino-38.png` | 1600x1600 | edge-connected removal | 246 | `3,0 325x489`, padding 30 |
| 05 Для спорта | Casio GBD-H1000-1A4 | `gbdh10001a4` | `images/Casio/GBD-H1000-1A4/GBD-H1000-1A4_1.jpg` from `casio_for_it_latest_with_photos_repacked (1).zip` | 408x544 | `public/generated/home-hero/casio-gbd-h1000-1a4.png` | 1600x1800 | edge-connected removal | 240 | `2,8 404x536`, padding 38 |
| 06 Следующее дополнение | Tissot PRX Powermatic 80 40mm | `t1374073305100` | official remote URL from import manifest | 800x800 | `public/generated/home-hero/tissot-prx-powermatic-80.png` | 1600x1700 | source alpha plus crop normalized | 244 | `175,35 625x735`, padding 36 |

## Design Lab Asset

The isolated route `/design-lab/home-hero` now uses the selected perspective fallback for scenario `01 Каждый день`.

The requested PR 100 Chronograph `T150.417.11.041.00` was reviewed first. Its available sources are front, side, and back views; no high-quality three-quarter source exists in the current import manifest. The checked Tissot fallback sources remain too frontal for this pass, so the design lab uses the best real perspective source from the approved priority list rather than faking perspective with CSS skew.

| Model | Reference | Selected source | Source size | Output | Output size | Crop |
|---|---|---|---:|---|---:|---|
| Casio MTG-B3000DN-1A | `mtgb3000dn1a` | local Casio package source 1 from import manifest | 2000x2000 | `public/generated/home-hero/premium/casio-mtg-b3000dn-1a-perspective.png` | 1900x1900 | recorded in `home-hero-premium-assets-report.json` |

The same static lab scene uses `public/generated/home-hero/premium/tissot-classic-dream-40mm-main.png` as the upper-right secondary watch. The previous PR 100 Chronograph front asset remains generated and appears in the angle comparison as the rejected flat/front option.

## Premium Generated Assets

| Scenario | Role | Model | Reference | Price | Output |
|---|---|---|---|---:|---|
| 01 Каждый день | main | Tissot Classic Dream 40mm | `t1584071105100` | 58 000 RUB | `public/generated/home-hero/premium/tissot-classic-dream-40mm-main.png` |
| 01 Каждый день | secondary | Tissot PR 100 40mm Chronograph | `t1504171104100` | 45 678 RUB | `public/generated/home-hero/premium/tissot-pr100-chronograph-secondary.png` |
| 02 Под рубашку | main | Tissot PR 100 40mm | `t1504101605100` | 38 000 RUB | `public/generated/home-hero/premium/tissot-pr100-40mm-leather-main.png` |
| 02 Под рубашку | secondary | Tissot PR 100 34mm | `t1502101104100` | 38 000 RUB | `public/generated/home-hero/premium/tissot-pr100-34mm-secondary.png` |
| 03 Путешествия | main | Tissot Seastar 1000 Chronograph 45.5mm | `t1204171104101` | 65 000 RUB | `public/generated/home-hero/premium/tissot-seastar-1000-chrono-main.png` |
| 03 Путешествия | secondary | Casio GBD-H1000-1A4 | `gbdh10001a4` | 60 000 RUB | `public/generated/home-hero/premium/casio-gbd-h1000-1a4-secondary.png` |
| 05 Спорт | main | Casio MTG-B3000DN-1A | `mtgb3000dn1a` | 100 000 RUB | `public/generated/home-hero/premium/casio-mtg-b3000dn-1a-main.png` |
| 05 Спорт | secondary | Tissot Seastar 1000 38mm | `t1202173306100` | 61 000 RUB | `public/generated/home-hero/premium/tissot-seastar-1000-38mm-secondary.png` |
| 06 В коллекцию | main | Tissot PRX Powermatic 80 40mm | `t1374073305100` | 101 010 RUB | `public/generated/home-hero/premium/tissot-prx-powermatic-80-main.png` |
| 06 В коллекцию | secondary | Tissot Seastar 1000 Chronograph 45.5mm | `t1204171705103` | 68 000 RUB | `public/generated/home-hero/premium/tissot-seastar-black-chrono-secondary.png` |
| Angle selected | selected-perspective | Casio MTG-B3000DN-1A | `mtgb3000dn1a` | 100 000 RUB | `public/generated/home-hero/premium/casio-mtg-b3000dn-1a-perspective.png` |

## Source Selection Notes

- Casio A158WA-1DF: selected image 1 because the dial is the clearest front/product angle. The source image is angled and already cuts the far bracelet; this is accepted only as a source limitation because the dial and case remain readable.
- Tissot PR 100 34mm: selected image 1 because it is the primary front product image and already contains transparency.
- Casio AE-1200WH-1AV: selected image 1 because it keeps the rectangular case readable; the low source resolution remains a limitation.
- Orient Bambino 38: selected the official remote image because local Orient ZIP image paths are broken in the source package. The round case and crown remain visible.
- Casio GBD-H1000-1A4: selected image 1 because it is the most usable front product source; the output uses a taller canvas and lower scale for the bulky case.
- Tissot PRX Powermatic 80: selected the primary official front image; profile image 2 is treated as technical and not suitable for main hero use.
- Premium pass: Orient remains a valid shortlist candidate for dress/mechanical scenarios, but current Orient image sources are low resolution and one remote source failed repeatable fetch during generation. Premium generated assets therefore use stronger Tissot/Casio sources until a better Orient asset is available.
- Perspective correction pass: PR 100 Chronograph `T150.417.11.041.00` source 1 is front view, source 2 is side view, and source 3 is back view. None is a homepage-grade three-quarter image. The selected design-lab main asset is therefore `casio-mtg-b3000dn-1a-perspective.png`.

## Known Limitations

- Some Casio sources are lower resolution than the Tissot sources.
- The A158 source has an angled composition with part of the bracelet already outside the source frame.
- Orient and PRX use official remote URLs from the import manifest because no local ZIP entries exist for those selected images.
- Premium assets intentionally exclude 3 000-10 000 RUB Casio digital watches from homepage hero use; those records remain catalog products, just not premium hero candidates.
- The pipeline removes only edge-connected near-white background; it intentionally does not damage white dials or silver highlights.
