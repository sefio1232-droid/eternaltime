# Eternal Time integration report

Date: 2026-08-03

Integration worktree: `C:\Users\Sergey\Documents\New project\eternal-time-integration`

Integration branch: `ai/codex-integration`

## Source branches and commits

| Surface | Worktree | Branch | Source commit |
| --- | --- | --- | --- |
| Homepage / integration base | `eternal-time` | `ai/codex-homepage` | `093239c7cc9f53a4f61143a5bb0959883ec64e92` |
| Catalog | `eternal-time-catalog` | `ai/claude-catalog` | `7d09f57c06072574c589ebc1b230dc82e0f9fd07` |
| Collection | `eternal-time-collection` | `ai/codex-collection` | `da22a23f2b367f830f8950f0222a0220d64ffde9` |
| Selection | `eternal-time-selection` | `ai/codex-selection` | `94886240e625f6fb1bbc60a7f7dcdae02c10f646` |

The integration branch was created from the finalized homepage commit `093239c`. Cherry-pick order and resulting
integration commits were:

1. Catalog -> `e65f075`
2. Collection -> `300282c`
3. Selection -> `d733106`

The final integration commit uses the subject `chore: integrate homepage catalog collection and selection`. Its hash is
reported by `git log -1` after the commit; a commit cannot embed its own hash in its contents.

No remote operation, push, rebase, reset, clean, stash, migration, Supabase mutation, or backend connection was used.

## Integration decisions and conflicts

- Catalog cherry-picked without a Git conflict. Its catalog list/detail implementation, CSS Modules, image policies,
  overlays, read repository, tests, and documentation were retained as the catalog-owned implementation.
- Collection produced one content conflict in `src/components/shell/public-shell.tsx`. Catalog's route-aware
  `PublicNavLink` and Collection's `ProfileMenu` were both retained. The resulting header exposes canonical Watches,
  Selection, Journal, and Brands navigation, with Collection in the profile/utility surfaces.
- `src/app/globals.css` auto-merged. Homepage/shared primitives remained global, while catalog and collection page
  styling stays in their owned CSS Modules. The full lint, test, and build passes verify that the auto-merge is valid.
- Selection produced no Git conflict. Two stale `/catalog` fallback links were changed to canonical `/watches` links.
- Collection already loads candidates through `getCatalogReadDataset()`. Its older 559-record test expectation was
  reconciled to the catalog's sanitized and deduplicated 547-record snapshot. Selection also imports the shared Catalog
  Read Repository and does not maintain a duplicate dataset.
- `incoming/` was added to `.gitignore` so the local ZIP/XLSX source materials required by development archive
  resolvers cannot be accidentally committed. Local copies are present only in this integration worktree for QA.
- `docs/ROUTES.md` was reconciled to the actual single-route Selection query-state architecture and the supported
  `demo=four` collection fixture.

## Final catalog source and data QA

Runtime source: `getCatalogReadDataset()` using the generated preview adapter in the local environment, with the image
upload plan, exact-reference Casio/Orient archive manifests, and exact-reference catalog-site overlay. The public read
model is sanitized and deduplicated before Catalog, Collection, or Selection consume it.

| Check | Actual integrated value |
| --- | ---: |
| Public catalog records | 547 |
| Casio | 222 |
| Tissot | 218 |
| Orient | 82 |
| Citizen | 25 |
| Canonical `/watches/...` hrefs | 547 |
| Records with a public price | 546 |
| Records with an admissible clean primary image | 330 |
| Public duplicate brand/reference identities | 0 |
| Collection picker records | 547 |
| Selection scorable records | 547 |
| Selection records missing specifications (diagnostic, not excluded) | 25 |
| Catalog-site overlay matches: Casio | 222 |
| Catalog-site overlay matches: Orient | 78 |
| Overlay unmatched identity | 1 (`RE-AU0306L00B`, reported once in each of two workbook sheets) |
| Import-stage blocked records | 10 |
| Import-stage intentionally skipped missing-reference records | 12 |
| Import-stage manual-review records | 5 |

Local/archive coverage:

- Casio manifest: 634 accepted image entries across 216 of 222 catalog references, no unmatched archive folders, six
  catalog references without a source folder, and four rejected unsuitable-context files.
- Orient manifest: 388 accepted image entries across 78 of 82 catalog references, one unmatched archive folder
  (`049_RE-AU0306L00B`), four catalog references without a source folder, and no rejected files.
- Real integration HTTP requests returned `200 image/jpeg` for one Casio archive asset (912,393 bytes) and one Orient
  archive asset (213,691 bytes).

The import preview contains 586 staged records. Its older dry-run report predates public sanitation/deduplication and
therefore reports 559 eligible records; 547 is the authoritative current public-read count and is the number exposed by
all three product surfaces.

## Route matrix

Every route below was requested from `http://127.0.0.1:3004`, returned HTTP 200, contained the listed real page heading,
and did not contain the application-error, catalog-source fallback, or not-found markers.

| Route(s) | Verified marker |
| --- | --- |
| `/` | `Часы, которые подходят именно вам` |
| `/watches` | `Каталог часов` |
| `/watches?brand=casio`, `orient`, `tissot`, `citizen` | `Каталог часов` with the requested query state |
| `/watches/casio/ecb950ymp1a` | `Casio ECB-950-YMP-1A` |
| `/watches/orient/faa02002d9` | `Orient Ray II` |
| `/watches/tissot/t1202173306100` | `Tissot Seastar 1000 38mm` |
| `/watches/citizen/aw181859l` | `Citizen Eco-Drive` |
| `/selection` | `Найдите часы под свой ритм` |
| `/selection?step=character&scenario=everyday` | `Семь шагов до вашей подборки` |
| `/selection?step=budget&scenario=everyday&character=universal` | `Семь шагов до вашей подборки` |
| full everyday results URL | `Ваши варианты`; three unique canonical detail links |
| full travel/ana-digi results URL | `Ваши варианты`; three unique canonical detail links |
| `/collection` | `Ваши часы. Ваш следующий шаг.` |
| `/collection?demo=empty` | zero SSR detail records |
| `/collection?demo=one` | one SSR detail record |
| `/collection?demo=four` | four SSR detail records |
| `/collection?demo=mixed` | four SSR records including manual and archived fixtures |
| `/collection?demo=archived` | two SSR records including the archived fixture |
| `/collection/new` | `Добавить часы` |
| `/brands` | `Бренды и их характер` |
| `/journal` | `Журнал`; eight published article links discovered |
| `/journal/why-g-shock-became-cult` | `Почему G-Shock стали культовыми` |

The two full results queries were:

- `step=results&scenario=everyday&character=universal&budget=under_15000&movement=quartz&fit=unknown&attachment=any&practical=none`
- `step=results&scenario=travel&character=instrumental&budget=range_15000_30000&movement=ana_digi&fit=unknown&attachment=rubber&practical=none`

## Automated QA

| Check | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed after Catalog, Collection, and Selection; final pass completed |
| Collection-focused tests | 4 files, 94 tests passed |
| Selection-focused tests | 2 files, 50 tests passed |
| `npm test` | 38 files, 470 tests passed |
| `npm run build` | Passed; Next.js 16.2.10 compiled, typechecked, and generated 33 static pages plus dynamic routes |
| `git diff --check` | Passed |
| `npm run secrets:scan` | Passed |
| Conflict-marker and stale-link scans | No unresolved markers; no stale Selection `/catalog` links |

The final diff and secrets checks are rerun immediately before the final integration commit. The source branches were
also individually linted, typechecked, tested, built, diff-checked, and secrets-scanned before their source commits.

## Browser QA limitation

The in-app browser skill was invoked, but its execution bridge rejected initialization with
`codex/sandbox-state-meta: missing field sandboxPolicy`. Consequently, the requested interactive viewport sweep,
screenshots, console inspection, focus checks, and pixel-level overflow review could not be performed. HTTP/render,
SSR-state, canonical-link, focused test, full test, CSS-module, and production-build checks are evidence for structural
correctness only and are not represented as full visual QA.

## Known limitations and next stages

- Turbopack emits one non-fatal NFT warning for `next.config.ts` through the development-only Casio archive resolver.
  The build succeeds and the archive route is disabled in production.
- Casio/Orient ZIPs, generated previews, manifests, and overlay files are intentionally gitignored local inputs. A fresh
  checkout must regenerate or supply them for the preview catalog and development ZIP routes. They are not production
  media storage.
- `npm install` reported five high-severity audit findings. Dependencies were not changed during this integration;
  remediation should be handled as a separate dependency/security change with regression testing.
- Run the full browser viewport/screenshot matrix when the browser bridge is available.
- Future scoped phases should move approved catalog media to production storage, connect authenticated collection
  persistence without changing the local architecture, and address dependency findings. FAQ, commerce, admin,
  notifications, and broader account work remain outside this integration.

Local integration URL: `http://localhost:3004`
