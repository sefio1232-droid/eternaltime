# Home Hero Final Four-Watch Curation

This is a preparation-only pass for the future Eternal Time homepage hero. It does not change the production homepage, Supabase data, Catalog UI, V1/V2/V3 routes, or generated images.

The machine-readable source of truth is:

```text
src/app/design-lab/home-hero/final-four-watch-curation.ts
```

User-supplied ZIP photo frames for circular/orbital motion are ingested by:

```text
npm run home-hero:prepare-final-assets
```

Generated local outputs:

```text
public/generated/home-hero/final/final-home-hero-assets-manifest.json
public/generated/home-hero/final/final-home-hero-assets-contact-sheet.jpg
```

The visual target for the next composition pass is:

```text
C:/Users/Sergey/Downloads/ChatGPT Image 16 июл. 2026 г., 01_17_25.png
```

## Current Rule

The user-confirmed scenario list is treated as the target curation. The article codes in that list are not silently replaced by older fallback references.

Readiness is tracked separately:

| Status | Meaning |
|---|---|
| `ready` | exact target reference has a prepared strict-front hero asset |
| `needs_high_resolution_front_source` | exact reference exists, but current source is below 1200 px |
| `needs_strict_front_source` | exact reference exists, but current image is perspective or not strict-front |
| `needs_hero_asset` | exact reference exists in catalog preview, but not in current image plan / hero manifest |
| `needs_catalog_confirmation` | exact target reference is not confirmed as a usable single watch record in current preview |
| `blocked_by_scenario_rule` | target slot is recorded but conflicts with the current scenario rule |

## Image Requirements

- strict front view;
- full watch visible;
- no hands, boxes, watermarks, or unrelated props;
- white, light, or transparent background;
- source image at least 1200 px on the long side;
- preferred source image 1600-2400 px;
- transparent final PNG;
- tight crop without large empty canvas;
- no artificial upscaling;
- no perspective, skew, or dial deformation;
- no similar-reference substitution.

## Motion Frame Intent

Multiple photos per reference are treated as `orbit_frame_set` candidates: the future hero may use them for a restrained circular transition where side watches move around the central model and gently trade positions.

Rules for that future motion:

- use real frames from the ZIPs;
- do not create fake rotation by skewing or perspective-transforming one image;
- keep motion subtle and readable;
- do not upscale small sources to central hero size;
- use low-resolution frames only as small side/background motion candidates;
- central hero frames need high-resolution sources.

Current ZIP audit result:

- `T120.417.11.041.03` has one high-resolution usable frame: 1275x1700.
- `T137.407.33.051.00` has two high-resolution usable frames: 900x1200 and 917x1500.
- Most other provided frames are 320-480px on the long side and are marked low-resolution motion candidates.
- No `MTG-B3000DN-1A.zip` was present in the provided ZIP set, so the MT-G target still needs user-supplied frames for this new motion system.

## Final Scenario Curation

### 01. На каждый день

| Slot | Watch | Reference | Current status |
|---|---|---|---|
| `centralMain` | Tissot PR 100 Chronograph 40mm, blue dial, steel bracelet | `T150.417.11.041.00` | `needs_high_resolution_front_source` |
| `alternativeLeft` | Tissot Classic Dream 40mm, black dial, steel bracelet | `T129.410.11.053.00` | `needs_catalog_confirmation` |
| `alternativeRight` | Casio Edifice Automatic, blue dial, steel bracelet | `EFK-100D-2A` | `needs_strict_front_source` |
| `alternativeBack` | Tissot PR 100 34mm, blue dial, steel bracelet | `T150.210.11.041.00` | `ready` |

### 02. Под рубашку

| Slot | Watch | Reference | Current status |
|---|---|---|---|
| `centralMain` | Tissot PR 100 40mm, black dial, black leather strap | `T150.410.16.051.00` | `ready` |
| `alternativeLeft` | Orient Bambino 38, light dial, leather strap | `RA-AC0M03S10B` | `needs_catalog_confirmation` |
| `alternativeRight` | Tissot Classic Dream 40mm, black dial, steel bracelet | `T129.410.11.053.00` | `needs_catalog_confirmation` |
| `alternativeBack` | Tissot PR 100 34mm, blue dial, steel bracelet | `T150.210.11.041.00` | `ready` |

### 03. Для путешествий

| Slot | Watch | Reference | Current status |
|---|---|---|---|
| `centralMain` | Tissot Seastar 1000 Chronograph 45.5mm, blue dial, steel bracelet | `T120.417.11.041.03` | `needs_catalog_confirmation` |
| `alternativeLeft` | Casio G-Shock, black-orange case | `GBD-H1000-1A4` | `needs_high_resolution_front_source` |
| `alternativeRight` | Orient Mako 40, light dial, steel bracelet | `RA-AC0Q03S10B` | `needs_catalog_confirmation` |
| `alternativeBack` | Tissot Seastar 1000 Chronograph 45.5mm, black dial, black strap | `T120.417.17.051.02` | `needs_catalog_confirmation` |

### 04. Первая механика

| Slot | Watch | Reference | Current status |
|---|---|---|---|
| `centralMain` | Casio Edifice Automatic, blue dial, steel bracelet | `EFK-100D-2A` | `needs_strict_front_source` |
| `alternativeLeft` | Orient Bambino 38, light dial, leather strap | `RA-AC0M03S10B` | `needs_catalog_confirmation` |
| `alternativeRight` | Orient Mako 40, light dial, steel bracelet | `RA-AC0Q03S10B` | `needs_catalog_confirmation` |
| `alternativeBack` | Tissot PRX Powermatic 80 40mm, blue dial, steel bracelet | `T137.407.11.041.00` | `needs_hero_asset` |

### 05. Для спорта

| Slot | Watch | Reference | Current status |
|---|---|---|---|
| `centralMain` | Tissot Seastar 1000 40mm, green dial, black PVD bracelet and case | `T120.807.33.051.00` | `needs_hero_asset` |
| `alternativeLeft` | Casio G-Shock | `GBD-H1000-1A4` | `needs_high_resolution_front_source` |
| `alternativeRight` | Casio G-Shock MT-G | `MTG-B3000DN-1A` | `needs_strict_front_source` |
| `alternativeBack` | Tissot Seastar 1000 Chronograph 45.5mm, blue dial, steel bracelet | `T120.417.11.041.03` | `needs_catalog_confirmation` |

### 06. В коллекцию

| Slot | Watch | Reference | Current status |
|---|---|---|---|
| `centralMain` | Tissot PRX Powermatic 80 40mm Gold, gold case and bracelet, black dial | `T137.407.33.051.00` | `needs_high_resolution_front_source` |
| `alternativeLeft` | Tissot PRX Powermatic 80 40mm Blue, blue dial, steel bracelet | `T137.407.11.041.00` | `needs_hero_asset` |
| `alternativeRight` | Casio G-Shock MT-G | `MTG-B3000DN-1A` | `blocked_by_scenario_rule` |
| `alternativeBack` | Tissot Seastar 1000 Chronograph 45.5mm, black dial, black strap | `T120.417.17.051.02` | `needs_catalog_confirmation` |

The MT-G slot is recorded in scenario 06 because it is part of the target list, but it remains blocked by the earlier sport-only rule until that rule is explicitly changed.

## Current Readiness

- Total target slots: 24.
- Ready with current strict-front hero asset: 3.
- Need high-resolution front source: 4.
- Need strict front source: 3.
- Need hero asset from an existing catalog preview record: 3.
- Need catalog/reference confirmation: 10.
- Blocked by scenario rule: 1.

This document intentionally does not copy the full catalog and does not create a new homepage implementation.
