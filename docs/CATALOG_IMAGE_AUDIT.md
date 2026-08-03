# Catalog Image Audit

> **Phase 2.1 update:** the "279 watches with no image" figure below is exactly why default sort now applies an image-first tiebreak (`hasUsableImage()` in `catalog-read-service.ts`) so image-less watches no longer cluster at the top of the default feed, and why catalog cards now render a full editorial `CatalogMissingImage` placeholder instead of the minimal shared "ET" mark. See `docs/CATALOG_LIST_VISUAL_RECOVERY.md` for details. The audit numbers themselves are unchanged by this phase (no image data was added or removed).

Generated: 2026-07-17T19:13:12.265Z
Regenerate with `npx tsx src/modules/catalog/cli/catalog-image-audit.ts` (no package.json script was added, per this phase's scope). Reads the exact same `imports/generated/catalog-import-preview.json` / `catalog-image-upload-plan.json` and the exact same `catalogReadDatasetFromPreview` adapter the production catalog pages use, so this audit reflects real, currently-served data — not a sample or mock.

## Summary

- Total public watches audited: 559
- Watches with no image at all: 279
- Watches where every available image is a likely technical angle (back/clasp/side): 0
- Watches where the Phase 2 front-image-preference fix changed the selected primary image: 0
- Gallery size distribution among watches with at least one image: 1 image(s): 110 watches, 2 image(s): 24 watches, 3 image(s): 84 watches, 4 image(s): 62 watches

## Method

Every watch's own image gallery (never another reference's images) is scored with the existing, already-approved heuristic in `catalog-image-presentation-policy.ts` (`isLikelyTechnicalAngle` / `isProminentCatalogImage`), which reads alt-text keywords (`caseback`, `clasp`, `side`, `задн`, `крышк`, `застёж`, `вид сбоку`) and photo order (index ≥ 4 defaults to technical) — the same logic already trusted for the watch detail hero image. No AI classification, no new heuristic, no cross-reference substitution, no upscaling.

## Rules followed (Phase 2 task requirements)

1. If an exact front image is already available in the current data, it is used as primary — implemented in `preview-catalog-adapter.ts` via `selectBestCatalogHeroImage`.
2. A back view is never chosen as primary when a front view is available in the same gallery.
3. A side/angle view is never chosen as primary when a front view is available in the same gallery.
4. No image is ever taken from a different reference's gallery — `imageGalleryForCandidate` filters strictly by `candidateId`, unchanged this phase.
5. No image is artificially upscaled — only CSS containment/composition, never dimension manipulation of the source file.
6. No AI classification or new unverified heuristic was introduced — this audit reuses the existing, already-shipped alt-text/order heuristic verbatim.
7. The Catalog Read Repository contract was not rewritten — `CatalogWatchCard.primaryImage` keeps the exact same type; only its selection logic in the infrastructure adapter changed.
8. Unresolved watches (no image, or only technical-angle images) are listed below, not silently hidden or fabricated.

## Watches with no image (unresolved — flagged, not fixed this phase)

| Brand | Reference | URL |
| --- | --- | --- |
| Casio | DW-5000R-1 | /watches/casio/dw5000r1 |
| Casio | DW-5040PG-1 | /watches/casio/dw5040pg1 |
| Casio | DW-5600-1 | /watches/casio/dw56001 |
| Casio | ECB-900YDB-1A бляTь повTор | /watches/casio/ecb900ydb1a-t-t |
| Casio | ECB-900YDB-1B бляTь повTор | /watches/casio/ecb900ydb1b-t-t |
| Casio | ECB-950YMP-1A бляTь повTор | /watches/casio/ecb950ymp1a-t-t |
| Casio | EFR-S567YDC-1A | /watches/casio/efrs567ydc1a |
| Casio | FT-500WC-1BVCF одни и Tе же | /watches/casio/ft500wc1bvcf-t |
| Casio | FT-500WC-3BVPF одни и Tе е | /watches/casio/ft500wc3bvpf-t |
| Casio | FT-500WC-5BVPF одни и Tеже | /watches/casio/ft500wc5bvpf-t |
| Casio | GA-100BL-1ADR | /watches/casio/ga100bl1adr |
| Casio | GA-110-1BPR | /watches/casio/ga1101bpr |
| Casio | GA-110GW-7ADR | /watches/casio/ga110gw7adr |
| Casio | GA-110MB-1ADR | /watches/casio/ga110mb1adr |
| Casio | GA-110RG-7ADR | /watches/casio/ga110rg7adr |
| Casio | GA-2100AH-6A | /watches/casio/ga2100ah6a |
| Casio | GA-B001AH-6 | /watches/casio/gab001ah6 |
| Casio | GA-B2100-2ADR | /watches/casio/gab21002adr |
| Casio | GA-B2100-3ADR | /watches/casio/gab21003adr |
| Casio | GA-B2100FC-1 | /watches/casio/gab2100fc1 |
| Casio | GBD-200-7 | /watches/casio/gbd2007 |
| Casio | GBD-200U-9 | /watches/casio/gbd200u9 |
| Casio | GBM-2100-1A | /watches/casio/gbm21001a |
| Casio | GBM-2100A-1A2 | /watches/casio/gbm2100a1a2 |
| Casio | GBM-2100A-1A3 | /watches/casio/gbm2100a1a3 |
| Casio | GBM-2100A-2B | /watches/casio/gbm2100a2b |
| Casio | GBM-2100A-8B | /watches/casio/gbm2100a8b |
| Casio | GBX-100NS-1 | /watches/casio/gbx100ns1 |
| Casio | GBX-100S-1 | /watches/casio/gbx100s1 |
| Casio | GBX-100S-2 | /watches/casio/gbx100s2 |
| Casio | GM-110-1A | /watches/casio/gm1101a |
| Casio | GM-110BB-1 | /watches/casio/gm110bb1 |
| Casio | GM-21000MWG-1A | /watches/casio/gm21000mwg1a |
| Casio | GM-2100MF-5ADR Сылки одинаковые!! | /watches/casio/gm2100mf5adr |
| Casio | GMW-B5000-1 | /watches/casio/gmwb50001 |
| Casio | GMW-B5000D-1 | /watches/casio/gmwb5000d1 |
| Casio | GMW-B5000D-1C | /watches/casio/gmwb5000d1c |
| Casio | GMW-B5000D-3 | /watches/casio/gmwb5000d3 |
| Casio | GMW-B5000GD-1 | /watches/casio/gmwb5000gd1 |
| Casio | GMW-B5000GD-9 | /watches/casio/gmwb5000gd9 |
| Casio | GMW-B5000PB-6 | /watches/casio/gmwb5000pb6 |
| Casio | GMW-B5000PC-1 | /watches/casio/gmwb5000pc1 |
| Casio | GMW-B5000TVA-1 | /watches/casio/gmwb5000tva1 |
| Casio | GST-B1000D-3A неT ссылки | /watches/casio/gstb1000d3a-t |
| Casio | GST-B100-1ADR ссылка недосTупна | /watches/casio/gstb1001adr-t |
| Casio | GW-5000HS-1 | /watches/casio/gw5000hs1 |
| Casio | GW-5000U-1 | /watches/casio/gw5000u1 |
| Casio | GW-B56000-BC1B | /watches/casio/gwb56000bc1b |
| Casio | GW-B5600BL-1 | /watches/casio/gwb5600bl1 |
| Casio | GWF-A1000BRT | /watches/casio/gwfa1000brt |
| Casio | GWG-B1000-1A | /watches/casio/gwgb10001a |
| Casio | MRG-B-1000B-1A | /watches/casio/mrgb1000b1a |
| Casio | MRG-B1000D-1A | /watches/casio/mrgb1000d1a |
| Casio | MRG-B2000B-1A | /watches/casio/mrgb2000b1a |
| Casio | MRG-B2000R-1A | /watches/casio/mrgb2000r1a |
| Casio | MRG-B5000B-1 | /watches/casio/mrgb5000b1 |
| Casio | MRG-B5000BA-1 | /watches/casio/mrgb5000ba1 |
| Casio | MRG-B5000D-1 | /watches/casio/mrgb5000d1 |
| Casio | MTG-B3000-1A | /watches/casio/mtgb30001a |
| Casio | MTG-B3000B-1A | /watches/casio/mtgb3000b1a |
| Casio | MTG-B3000BD-1A | /watches/casio/mtgb3000bd1a |
| Casio | MTG-B3000BD-1A2 | /watches/casio/mtgb3000bd1a2 |
| Casio | MTG-B3000D-1A | /watches/casio/mtgb3000d1a |
| Casio | MTG-B3000D-1A9 | /watches/casio/mtgb3000d1a9 |
| Casio | MTP-1384D-7AVD Tакой цвеT не могу найTи | /watches/casio/mtp1384d7avdt-t-t |
| Casio | MTP-VD01L-7ADF | /watches/casio/mtpvd01l7adf |
| Casio | MTP-VD01L-7ADF не смог найTи | /watches/casio/mtpvd01l7adf-t |
| Casio | TиссоTы | /watches/casio/t-t |
| Citizen | AW1818-59L | /watches/citizen/aw181859l |
| Citizen | AW1819-05A | /watches/citizen/aw181905a |
| Citizen | AW1819-13L | /watches/citizen/aw181913l |
| Citizen | AW1819-56A | /watches/citizen/aw181956a |
| Citizen | AW1819-56E | /watches/citizen/aw181956e |
| Citizen | AW1819-56X | /watches/citizen/aw181956x |
| Citizen | BM7620-83M | /watches/citizen/bm762083m |
| Citizen | BM7625-80H | /watches/citizen/bm762580h |
| Citizen | BM7630-80X | /watches/citizen/bm763080x |
| Citizen | BM7630-80Z | /watches/citizen/bm763080z |
| Citizen | BM7631-87M | /watches/citizen/bm763187m |
| Citizen | BM7637-81H | /watches/citizen/bm763781h |
| Citizen | EM0530-81D | /watches/citizen/em053081d |
| Citizen | EM0533-82Y | /watches/citizen/em053382y |
| Citizen | EM1060-87N | /watches/citizen/em106087n |
| Citizen | EM1060-87Y | /watches/citizen/em106087y |
| Citizen | EM1070-83L | /watches/citizen/em107083l |
| Citizen | EM1200-55A | /watches/citizen/em120055a |
| Citizen | EM1200-55X | /watches/citizen/em120055x |
| Citizen | EM1202-50P | /watches/citizen/em120250p |
| Citizen | EM1203-57X | /watches/citizen/em120357x |
| Citizen | NJ0210-05E | /watches/citizen/nj021005e |
| Citizen | NJ0210-13L | /watches/citizen/nj021013l |
| Citizen | NJ0210-56A | /watches/citizen/nj021056a |
| Citizen | NJ0210-56M | /watches/citizen/nj021056m |
| Tissot | T006.207.11.036.01 | /watches/tissot/t0062071103601 |
| Tissot | T006.207.11.038.00 | /watches/tissot/t0062071103800 |
| Tissot | T006.207.11.096.00 | /watches/tissot/t0062071109600 |
| Tissot | T006.207.16.038.00 | /watches/tissot/t0062071603800 |
| Tissot | T006.207.16.046.00 | /watches/tissot/t0062071604600 |
| Tissot | T006.207.22.038.00 | /watches/tissot/t0062072203800 |
| Tissot | T006.207.22.116.00 | /watches/tissot/t0062072211600 |
| Tissot | T006.407.11.033.00 | /watches/tissot/t0064071103300 |
| Tissot | T006.407.11.033.00 + T006.207.11.038.00 | /watches/tissot/t0064071103300t0062071103800 |
| Tissot | T006.407.11.033.02 | /watches/tissot/t0064071103302 |
| Tissot | T006.407.11.033.03 | /watches/tissot/t0064071103303 |
| Tissot | T006.407.11.043.00 | /watches/tissot/t0064071104300 |
| Tissot | T006.407.11.053.00 | /watches/tissot/t0064071105300 |
| Tissot | T006.407.11.093.00 | /watches/tissot/t0064071109300 |
| Tissot | T006.407.16.033.00 | /watches/tissot/t0064071603300 |
| Tissot | T006.407.16.033.00 + T006.207.16.038.00 | /watches/tissot/t0064071603300t0062071603800 |
| Tissot | T006.407.16.033.01 | /watches/tissot/t0064071603301 |
| Tissot | T006.407.16.043.00 | /watches/tissot/t0064071604300 |
| Tissot | T006.407.16.053.00 | /watches/tissot/t0064071605300 |
| Tissot | T006.407.22.033.00 | /watches/tissot/t0064072203300 |
| Tissot | T006.407.22.033.00 + T006.207.22.038.00 | /watches/tissot/t0064072203300t0062072203800 |
| Tissot | T006.407.22.033.00 + T006.207.22.116.00 | /watches/tissot/t0064072203300t0062072211600 |
| Tissot | T006.407.22.033.01 | /watches/tissot/t0064072203301 |
| Tissot | T006.407.22.033.02 | /watches/tissot/t0064072203302 |
| Tissot | T006.407.22.036.01 | /watches/tissot/t0064072203601 |
| Tissot | T006.407.36.033.00 | /watches/tissot/t0064073603300 |
| Tissot | T006.407.36.263.00 | /watches/tissot/t0064073626300 |
| Tissot | T006.408.11.037.00 + T41.1.183.34 | /watches/tissot/t0064081103700t41118334 |
| Tissot | T058.109.11.036.01 | /watches/tissot/t0581091103601 |
| Tissot | T058.109.11.041.00 | /watches/tissot/t0581091104100 |
| Tissot | T058.109.11.041.01 | /watches/tissot/t0581091104101 |
| Tissot | T058.109.36.031.01 | /watches/tissot/t0581093603101 |
| Tissot | T058.109.36.031.02 | /watches/tissot/t0581093603102 |
| Tissot | T063.610.11.037.00 | /watches/tissot/t0636101103700 |
| Tissot | T063.610.11.038.00 | /watches/tissot/t0636101103800 |
| Tissot | T063.610.11.057.00 | /watches/tissot/t0636101105700 |
| Tissot | T063.610.36.037.00 | /watches/tissot/t0636103603700 |
| Tissot | T063.610.36.038.00 | /watches/tissot/t0636103603800 |
| Tissot | T063.617.16.037.00 | /watches/tissot/t0636171603700 |
| Tissot | T063.617.36.037.00 | /watches/tissot/t0636173603700 |
| Tissot | T094.210.11.116.01 | /watches/tissot/t0942101111601 |
| Tissot | T094.210.11.116.02 | /watches/tissot/t0942101111602 |
| Tissot | T094.210.11.336.00 | /watches/tissot/t0942101133600 |
| Tissot | T094.210.33.116.02 | /watches/tissot/t0942103311602 |
| Tissot | T116.617.11.037.00 | /watches/tissot/t1166171103700 |
| Tissot | T116.617.11.047.01 | /watches/tissot/t1166171104701 |
| Tissot | T116.617.11.057.01 | /watches/tissot/t1166171105701 |
| Tissot | T116.617.11.092.00 | /watches/tissot/t1166171109200 |
| Tissot | T116.617.16.037.00 | /watches/tissot/t1166171603700 |
| Tissot | T116.617.16.042.00 | /watches/tissot/t1166171604200 |
| Tissot | T116.617.16.057.00 | /watches/tissot/t1166171605700 |
| Tissot | T116.617.16.062.00 | /watches/tissot/t1166171606200 |
| Tissot | T116.617.16.092.00 | /watches/tissot/t1166171609200 |
| Tissot | T116.617.16.297.00 | /watches/tissot/t1166171629700 |
| Tissot | T116.617.36.042.00 | /watches/tissot/t1166173604200 |
| Tissot | T116.617.36.052.00 | /watches/tissot/t1166173605200 |
| Tissot | T116.617.36.052.02 | /watches/tissot/t1166173605202 |
| Tissot | T116.617.36.052.03 | /watches/tissot/t1166173605203 |
| Tissot | T116.617.36.092.00 | /watches/tissot/t1166173609200 |
| Tissot | T120.210.11.011.00 | /watches/tissot/t1202101101100 |
| Tissot | T120.210.11.041.00 | /watches/tissot/t1202101104100 |
| Tissot | T120.210.11.051.00 | /watches/tissot/t1202101105100 |
| Tissot | T120.210.17.116.00 | /watches/tissot/t1202101711600 |
| Tissot | T120.210.21.051.00 | /watches/tissot/t1202102105100 |
| Tissot | T120.407.11.041.03 | /watches/tissot/t1204071104103 |
| Tissot | T120.407.11.051.00 | /watches/tissot/t1204071105100 |
| Tissot | T120.407.11.081.01 | /watches/tissot/t1204071108101 |
| Tissot | T120.407.11.091.01 | /watches/tissot/t1204071109101 |
| Tissot | T120.407.17.041.00 | /watches/tissot/t1204071704100 |
| Tissot | T120.407.22.051.00 | /watches/tissot/t1204072205100 |
| Tissot | T120.407.37.041.00 | /watches/tissot/t1204073704100 |
| Tissot | T120.407.37.051.00 | /watches/tissot/t1204073705100 |
| Tissot | T120.417.11.091.00 | /watches/tissot/t1204171109100 |
| Tissot | T120.417.17.081.00 | /watches/tissot/t1204171708100 |
| Tissot | T120.607.17.441.01 | /watches/tissot/t1206071744101 |
| Tissot | T120.607.37.041.00 | /watches/tissot/t1206073704100 |
| Tissot | T120.807.11.051.00 | /watches/tissot/t1208071105100 |
| Tissot | T120.807.11.091.00 | /watches/tissot/t1208071109100 |
| Tissot | T120.807.22.051.00 | /watches/tissot/t1208072205100 |
| Tissot | T120.807.33.051.00 | /watches/tissot/t1208073305100 |
| Tissot | T120.807.37.041.00 | /watches/tissot/t1208073704100 |
| Tissot | T122.210.11.159.00 | /watches/tissot/t1222101115900 |
| Tissot | T122.407.11.031.00 + T122.207.11.031.00 | /watches/tissot/t1224071103100t1222071103100 |
| Tissot | T122.407.11.041.00 + T122.207.11.041.00 | /watches/tissot/t1224071104100t1222071104100 |
| Tissot | T122.407.16.031.00 | /watches/tissot/t1224071603100 |
| Tissot | T122.407.22.031.00 + T122.207.22.031.00 | /watches/tissot/t1224072203100t1222072203100 |
| Tissot | T122.407.36.031.00 | /watches/tissot/t1224073603100 |
| Tissot | T122.410.11.033.00 + T122.210.11.033.00 | /watches/tissot/t1224101103300t1222101103300 |
| Tissot | T122.410.16.033.00 + T122.210.16.033.00 | /watches/tissot/t1224101603300t1222101603300 |
| Tissot | T122.410.22.033.00 + T122.210.22.033.00 | /watches/tissot/t1224102203300t1222102203300 |
| Tissot | T122.423.11.033.00 + T122.223.11.033.00 | /watches/tissot/t1224231103300t1222231103300 |
| Tissot | T125.617.37.051.01 | /watches/tissot/t1256173705101 |
| Tissot | T126.010.11.133.00 | /watches/tissot/t1260101113300 |
| Tissot | T126.010.16.113.02 | /watches/tissot/t1260101611302 |
| Tissot | T126.207.11.013.00 | /watches/tissot/t1262071101300 |
| Tissot | T126.207.16.013.00 | /watches/tissot/t1262071601300 |
| Tissot | T126.207.22.013.00 | /watches/tissot/t1262072201300 |
| Tissot | T126.207.36.013.00 | /watches/tissot/t1262073601300 |
| Tissot | T126.207.66.113.00 | /watches/tissot/t1262076611300 |
| Tissot | T126.207.66.113.03 | /watches/tissot/t1262076611303 |
| Tissot | T129.210.11.013.00 | /watches/tissot/t1292101101300 |
| Tissot | T129.210.11.031.00 | /watches/tissot/t1292101103100 |
| Tissot | T129.210.11.053.00 | /watches/tissot/t1292101105300 |
| Tissot | T129.210.16.111.00 | /watches/tissot/t1292101611100 |
| Tissot | T129.210.22.013.00 | /watches/tissot/t1292102201300 |
| Tissot | T129.210.22.031.00 | /watches/tissot/t1292102203100 |
| Tissot | T129.410.11.013.00 + T129.210.11.013.00 | /watches/tissot/t1294101101300t1292101101300 |
| Tissot | T129.410.11.031.00 + T129.210.11.031.00 | /watches/tissot/t1294101103100t1292101103100 |
| Tissot | T129.410.11.053.00 + T129.210.11.053.00 | /watches/tissot/t1294101105300t1292101105300 |
| Tissot | T129.410.11.091.00 + T129.210.11.091.00 | /watches/tissot/t1294101109100t1292101109100 |
| Tissot | T129.410.33.021.00 + T129.210.33.021.00 | /watches/tissot/t1294103302100t1292103302100 |
| Tissot | T137.010.11.351.00 | /watches/tissot/t1370101135100 |
| Tissot | T137.010.21.111.00 | /watches/tissot/t1370102111100 |
| Tissot | T137.207.11.041.00 | /watches/tissot/t1372071104100 |
| Tissot | T137.207.11.051.00 | /watches/tissot/t1372071105100 |
| Tissot | T137.207.11.091.00 | /watches/tissot/t1372071109100 |
| Tissot | T137.207.11.111.00 | /watches/tissot/t1372071111100 |
| Tissot | T137.207.11.351.00 | /watches/tissot/t1372071135100 |
| Tissot | T137.207.33.021.00 | /watches/tissot/t1372073302100 |
| Tissot | T137.407.11.041.00 | /watches/tissot/t1374071104100 |
| Tissot | T137.407.11.051.00 | /watches/tissot/t1374071105100 |
| Tissot | T137.407.11.051.01 | /watches/tissot/t1374071105101 |
| Tissot | T137.407.11.091.00 | /watches/tissot/t1374071109100 |
| Tissot | T137.407.11.091.01 | /watches/tissot/t1374071109101 |
| Tissot | T137.407.11.351.00 | /watches/tissot/t1374071135100 |
| Tissot | T137.407.11.351.01 | /watches/tissot/t1374071135101 |
| Tissot | T137.407.16.041.00 | /watches/tissot/t1374071604100 |
| Tissot | T137.407.16.051.00 | /watches/tissot/t1374071605100 |
| Tissot | T137.407.17.041.00 | /watches/tissot/t1374071704100 |
| Tissot | T137.407.17.051.00 | /watches/tissot/t1374071705100 |
| Tissot | T137.407.21.031.00 | /watches/tissot/t1374072103100 |
| Tissot | T137.407.33.021.00 | /watches/tissot/t1374073302100 |
| Tissot | T137.410.11.031.00 + T137.210.11.031.00 | /watches/tissot/t1374101103100t1372101103100 |
| Tissot | T137.410.11.041.00 + T137.210.11.041.00 | /watches/tissot/t1374101104100t1372101104100 |
| Tissot | T137.410.11.091.00 + T137.210.11.091.00 | /watches/tissot/t1374101109100t1372101109100 |
| Tissot | T137.410.33.021.00 + T137.210.33.021.00 | /watches/tissot/t1374103302100t1372103302100 |
| Tissot | T137.427.11.011.00 | /watches/tissot/t1374271101100 |
| Tissot | T137.427.11.011.01 | /watches/tissot/t1374271101101 |
| Tissot | T137.427.11.041.00 | /watches/tissot/t1374271104100 |
| Tissot | T137.907.97.201.00 | /watches/tissot/t1379079720100 |
| Tissot | T139.836.11.048.00 | /watches/tissot/t1398361104800 |
| Tissot | T139.836.16.261.00 | /watches/tissot/t1398361626100 |
| Tissot | T139.836.36.441.00 | /watches/tissot/t1398363644100 |
| Tissot | T140.009.16.111.00 | /watches/tissot/t1400091611100 |
| Tissot | T140.009.36.041.00 | /watches/tissot/t1400093604100 |
| Tissot | T140.009.36.091.00 | /watches/tissot/t1400093609100 |
| Tissot | T140.009.36.371.00 | /watches/tissot/t1400093637100 |
| Tissot | T141.417.11.041.00 | /watches/tissot/t1414171104100 |
| Tissot | T141.417.11.051.00 | /watches/tissot/t1414171105100 |
| Tissot | T141.417.17.011.00 | /watches/tissot/t1414171701100 |
| Tissot | T141.417.37.051.00 | /watches/tissot/t1414173705100 |
| Tissot | T141.417.37.051.01 | /watches/tissot/t1414173705101 |
| Tissot | T141.417.37.051.02 | /watches/tissot/t1414173705102 |
| Tissot | T141.417.37.061.00 | /watches/tissot/t1414173706100 |
| Tissot | T141.417.37.061.02 | /watches/tissot/t1414173706102 |
| Tissot | T141.807.11.041.00 | /watches/tissot/t1418071104100 |
| Tissot | T141.807.17.051.00 | /watches/tissot/t1418071705100 |
| Tissot | T141.807.37.051.00 | /watches/tissot/t1418073705100 |
| Tissot | T141.807.37.057.00 | /watches/tissot/t1418073705700 |
| Tissot | T142.464.16.032.00 | /watches/tissot/t1424641603200 |
| Tissot | T142.464.16.062.00 | /watches/tissot/t1424641606200 |
| Tissot | T142.464.16.332.00 | /watches/tissot/t1424641633200 |
| Tissot | T143.210.11.011.00 | /watches/tissot/t1432101101100 |
| Tissot | T143.210.11.091.00 | /watches/tissot/t1432101109100 |
| Tissot | T143.210.17.091.00 | /watches/tissot/t1432101709100 |
| Tissot | T143.210.33.021.00 | /watches/tissot/t1432103302100 |
| Tissot | T145.407.97.057.00 | /watches/tissot/t1454079705700 |
| Tissot | T145.407.97.057.01 | /watches/tissot/t1454079705701 |
| Tissot | T145.407.97.057.02 | /watches/tissot/t1454079705702 |
| Tissot | T149.407.16.041.00 | /watches/tissot/t1494071604100 |
| Tissot | T150.210.11.031.00 | /watches/tissot/t1502101103100 |
| Tissot | T150.210.11.116.00 | /watches/tissot/t1502101111600 |
| Tissot | T150.210.11.331.00 | /watches/tissot/t1502101133100 |
| Tissot | T150.210.21.111.00 | /watches/tissot/t1502102111100 |
| Tissot | T151.822.11.031.00 | /watches/tissot/t1518221103100 |
| Tissot | T160.110.11.033.00 | /watches/tissot/t1601101103300 |
| Tissot | T160.110.11.043.00 | /watches/tissot/t1601101104300 |
| Tissot | T160.110.16.093.00 | /watches/tissot/t1601101609300 |
| Tissot | T160.110.16.423.00 | /watches/tissot/t1601101642300 |
| Tissot | T160.110.33.023.00 | /watches/tissot/t1601103302300 |
| Tissot | T160.110.33.033.00 | /watches/tissot/t1601103303300 |
| Tissot | T160.110.33.046.00 | /watches/tissot/t1601103304600 |
| Tissot | T160.110.33.113.00 | /watches/tissot/t1601103311300 |
| Tissot | T160.110.36.033.00 | /watches/tissot/t1601103603300 |
| Tissot | T160.110.36.113.00 | /watches/tissot/t1601103611300 |
| Tissot | T160.110.36.126.00 | /watches/tissot/t1601103612600 |

## Other data-quality observation (not an image issue, flagged for the import owner)

While building this audit, a small number of public `referenceDisplay` values were found to contain what look like leftover source-spreadsheet reviewer notes/typos (e.g. Russian words meaning "duplicate" or "same ones") rather than a clean manufacturer reference. These render as-is on the live catalog cards and detail pages today. This is a source-data/import quality issue, not an image-selection issue, and `src/modules/imports/**` is out of scope for this catalog-list worktree — flagged here for whoever owns the import pipeline.

| Brand | Reference (as shown publicly) | URL |
| --- | --- | --- |
| Casio | ECB-900YDB-1A бляTь повTор | /watches/casio/ecb900ydb1a-t-t |
| Casio | ECB-900YDB-1B бляTь повTор | /watches/casio/ecb900ydb1b-t-t |
| Casio | ECB-950YMP-1A бляTь повTор | /watches/casio/ecb950ymp1a-t-t |
| Casio | FT-500WC-1BVCF одни и Tе же | /watches/casio/ft500wc1bvcf-t |
| Casio | FT-500WC-3BVPF одни и Tе е | /watches/casio/ft500wc3bvpf-t |
| Casio | FT-500WC-5BVPF одни и Tеже | /watches/casio/ft500wc5bvpf-t |

## Generated artifacts

- `public/generated/catalog-review/catalog-image-audit.json` — full machine-readable audit (every watch, not just the issues above).
- `public/generated/catalog-review/catalog-first-page-contact-sheet.html` — an HTML contact sheet (not a flattened JPEG) for the first 48 watches in default order. A rasterized JPEG montage would require adding an image-processing dependency (sharp/canvas/jimp); this phase's instructions explicitly disallow adding heavy dependencies, so an HTML review page was used instead. Open it through the running dev server so `development_zip` image sources resolve.
- Neither artifact is linked from, or reachable through, any production page or navigation.
