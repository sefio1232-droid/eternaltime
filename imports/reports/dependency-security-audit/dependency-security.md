# Dependency security and release-retention hardening

Date: 2026-09-09. Baseline: `045c13b4f1ca83238ef51cecaada8ba58f004c62`, production release `20260909122732` (Linux).

## Production findings and minimal remediation

The before JSON is the raw `npm audit --omit=dev --json` output from the deployed baseline. Local baseline had the same findings. Counts are vulnerable packages, not advisory count: three packages, four advisories; critical 1, high 1, moderate 1, low 0.

| Package / path | Installed → selected | Severity / advisory | Vulnerable / first patched | Exposure in EternalTime | Fix |
| --- | --- | --- | --- | --- | --- |
| EternalTime → next (direct) | 16.3.1 → 16.3.3 | Critical: GHSA-p293-qw3h-jr36, CVE-2026-75604 | 16.x <16.3.3 / 16.3.3 | RUNTIME-REACHABLE framework; advisory requires a Windows filesystem. Production is Linux, so that platform precondition is absent there; local Windows runtime is affected. No exploitation attempted or claimed. | Pin minimum patched framework release, not a major upgrade. |
| EternalTime → next (direct) | 16.3.1 → 16.3.3 | Critical: GHSA-2xp9-vwfh-vxw4 | 16.x <16.3.3 / 16.3.3 | RUNTIME-REACHABLE image-optimization handler. `next.config.ts` leaves optimization enabled, home components use next/image, and the framework invokes sharp. Arbitrary remote image origins are not enabled. Attacker-controlled AVIF reachability has NOT been demonstrated; absence of a demonstrated exploit is not a reason to retain the vulnerable decoder. | Framework security patch; upstream disables AVIF optimization pending safe decoding. |
| EternalTime → next → sharp (optional transitive, installed) | 0.35.3 → 0.35.4 | High: GHSA-rgj7-g3m4-5g8c; underlying libheif CVE-2026-84383 / GHSA-g89c-p67h-r497 and GHSA-2jg2-4ch7-h545 | <0.35.4 / 0.35.4 | TRANSITIVE-RUNTIME image decoder via Next. Also directly used by offline asset-preparation scripts, which are not request handlers. Linux runtime is relevant to the advisory. No malicious image was submitted. | Targeted lockfile refresh inside Next's existing ^0.35.3 constraint; native bundles carry fixed libheif. |
| EternalTime → next → baseline-browser-mapping | 2.10.42 → 2.11.21 | Moderate: GHSA-w5vr-8v7q-w6rv, CVE-2026-45819 | >=2.0.0 <2.11.0 / 2.11.0 | BUILD-ONLY usage found through browserslist; package remains in production dependency tree. No application route/server action accepts request input for this API. Also used by dev eslint-config-next → eslint-plugin-react-hooks → @babel/core → @babel/helper-compilation-targets → browserslist. No externally reachable call demonstrated. | Targeted lockfile refresh within ^2.9.19; npm selected current 2.11.21 in the patched minor branch. No override needed. |

Primary advisories:

- https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36
- https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4
- https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c
- https://github.com/advisories/GHSA-w5vr-8v7q-w6rv (registry advisory record)

Patch risk: Next and sharp patch versions; browser mapping minor/data update. No deliberate application API migration. SSR, route handlers and real image decoding require regression checks. React, React DOM, TypeScript, Supabase, CDEK widget, eslint-config-next and other direct packages are unchanged. No audit-fix force, registry switch, override, or package downgrade.

## Lockfile accounting

Every changed dependency entry belongs to the above fixes:

- next and @next/env: 16.3.1 → 16.3.3.
- All eight @next/swc platform packages: 16.3.1 → 16.3.3, pinned by next.
- sharp and all sixteen @img/sharp platform/wasm wrapper packages: 0.35.3 → 0.35.4, pinned by sharp.
- All ten @img/sharp-libvips platform bundles: 1.3.2 → 1.3.3, required for fixed native decoders.
- baseline-browser-mapping: 2.10.42 → 2.11.21.
- @img/sharp-wasm32 now requires @emnapi/runtime ^1.11.3: a nested 1.11.3 is added; the existing root 1.11.1 version is preserved and its metadata changes to dev-only. This is an optional wasm branch, not the Linux native runtime.

No new lifecycle scripts are introduced in lock metadata. All changed tarballs remain on registry.npmjs.org. The complete entry-by-entry old/new graph is recorded in `dependency-lock-changes.json`.

## Retention root cause and fix

Node canonicalizes an ESM module URL through directory symlinks, but `process.argv[1]` retains the caller's `/current` spelling. The old entry guard compared `path.resolve(argv[1])` against `fileURLToPath(import.meta.url)`. They differ, so main() was silently skipped with exit zero.

Both paths now pass through filesystem `realpath` before comparison. Resolution errors print `RETENTION STOPPED` and return nonzero. The printed plan explicitly includes `DRY_RUN`.

The production root is still the fixed `/opt/eternal-time/releases`; it is not inferred from the script path or cwd. Current is still resolved from the actual `/opt/eternal-time/current` symlink. Existing canonical-parent checks, name validation, current protection, whitelist, inode checks, mount/process checks and health gates are unchanged. No new root override is accepted.

New CLI tests launch the actual script in child Node processes through a real temporary release path and current directory symlink/junction. Only production FS/services are virtualized in a test-only preload; real temporary script-path resolution is exercised. Both invocations must produce identical populated KEEP/DELETE plans and zero dry-run removals. Tests cover relative entry paths, broken current, outside-root current, noncanonical release root, rejected root override, unresolvable argv, and import-only behavior. Existing retention unit tests remain unchanged.

## Verification artifacts

`dependency-security-after.json` records the updated local production-tree audit. Deployed audit, health, route/browser and current-versus-real-path retention evidence will be captured separately after deploy. Zero audit findings are not a claim that all possible application vulnerabilities have been excluded.

Full-tree audit is separate: 0 critical, 3 high, 2 moderate vulnerable dev packages remain. They are not included in `npm audit --omit=dev` and are removed by the existing production `npm prune --omit=dev` workflow. They were not upgraded in this narrowly scoped production-dependency patch:

| Dev package | Path / use | Finding | Follow-up |
| --- | --- | --- | --- |
| browserslist 4.28.4 | eslint-config-next → eslint-plugin-react-hooks → @babel/core → @babel/helper-compilation-targets → browserslist; build/lint targets | High GHSA-c83g-rgw3-j3cx and GHSA-73wf-gq98-2v4g | Update to patched >4.28.6 in a dev-tool security pass; no request-controlled browser stats/query input found. |
| js-yaml 4.3.1 | eslint → @eslint/eslintrc → js-yaml; local lint configuration | High GHSA-2883-xcg3-v3hh | Patch >=4.3.2; no public YAML parser route found. |
| vitest and @vitest/mocker 4.1.9 | test runner / mock tooling only | Moderate GHSA-82fw-gwwq-j7x9 (two package findings) | Patch >=4.1.11; no production test server. |
| xlsx 0.18.5 | direct dev dependency for operator-run local catalog import, not a public handler | High GHSA-4r6h-8v6p-xvw6 and GHSA-5pgg-2g8v-p4x9 | Registry audit offers no fix; >=0.20.2 requires separately reviewed official distribution/import-tool change. Only trusted files should be processed meanwhile. |

No claim is made that the full development toolchain is vulnerability-free.

## Pre-deploy verification and existing Selection policy caveat

Lint, typecheck (including after build), 773 tests / 64 files, Next 16.3.3 production build, secrets scan and diff whitespace check passed. The 8 new executable-path tests are included; all 29 existing retention tests remain passing. Local real-image smoke: 19 distinct models / 38 card instances at 1440 and 390 px, zero broken images, image overflow or application browser errors. Normal flow 7 / first-mechanical 6, back/forward and URL restoration verified in both widths.

Targeted result criteria and multi-select checks were compared against the still-active baseline production: 8 profile/viewport combinations have identical reference/criterion results before and after the dependency patch. Size and first-mechanical constraints hold; stale quartz query is ignored for first-mechanical. Main recommendations in these profiles are in the selected price band.

Important: the existing algorithm is NOT a strict price exclusion across every secondary card. For large/daily/under_15000 it returns Casio AE-1200WH-1AV (4,200 RUB), Casio AE-1200WH-1BV (4,000 RUB), and a secondary Orient RA-AA0009L19B (43,000 RUB) explicitly labelled a price compromise. This also occurs on the unchanged baseline production. It is not introduced by the security patch. No algorithm change was made, as explicitly required. Therefore regression equivalence passes, but universal strict-budget containment must not be reported as PASS. Changing that product policy requires a separate authorized task.
