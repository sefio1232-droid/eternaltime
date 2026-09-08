# Production release retention

The existing `scripts/deploy-production.ps1` runs retention after the new release
has built, become the factual `current` target and passed its health checks.
Code-only remains the default; catalog assets and production env are not uploaded.

## Policy and gates

- Keep the actual active release and the five newest releases older than it.
- Sort valid calendar timestamps (`YYYYMMDDHHMMSS`) by name, not filesystem mtime.
- Keep names such as `20260825185808-git`, symlinks and non-directory entries for
  manual review. Report `UNRECOGNIZED RELEASE DIRECTORY` for invalid names.
- Keep releases newer than current for manual review; they may be failed/orphan
  deployments and do not replace the five genuine previous rollback versions.
- Before planning or deleting, independently require nginx and eternal-time to
  be active and exact HTTP 200 from local health, public health and public home.
- Pin the expected current target to the release just deployed. Recheck health
  after planning and after deletion. A failed initial/post-plan health gate
  causes zero deletions. A failure during cleanup stops the remaining deletions.

The deploy first prints a dry-run plan and then applies retention automatically.
Ordinary future deployments require no manual pruning.

## Path safety

The CLI has no configurable deletion root: only direct canonical children of
`/opt/eternal-time/releases` can be candidates. The root itself must not be a
symlink. Every deletion must belong to the calculated whitelist, refer to a real
directory, have the same inode as the inspected candidate and not be current.
All validations run again immediately before removal. Mounted subtrees and
directories used as process working directories are rejected. Recursive removal
does not traverse directory symlinks. Rejections are logged and return nonzero.

The helper never enumerates or deletes shared assets, env, uploads, nginx,
systemd, SSL or database storage. It performs no commerce operations.

Retention is an administrative operation; run deployments serially. Root access
is required for production inspection/removal. Do not run a simultaneous manual
rollback or another deploy while retention is executing.

## Dry-run and controlled first rollout

On the VPS, after the helper has been deployed:

```sh
node /opt/eternal-time/current/scripts/production-release-retention.mjs --dry-run
```

No flag also means dry-run. The output contains CURRENT, KEEP, DELETE, SKIP and
SPACE_POTENTIALLY_FREED in bytes (allocated directory size from `du`).

For the initial rollout, defer application until production content QA finishes:

```powershell
.\scripts\deploy-production.ps1 -DeferReleaseRetention
```

This still runs the guarded dry-run after deployment but keeps all old releases.
After checking the rendered metadata and both selection flows, run on the VPS:

```sh
node /opt/eternal-time/current/scripts/production-release-retention.mjs --dry-run --expected-current /opt/eternal-time/releases/ACTUAL_RELEASE_TIMESTAMP
node /opt/eternal-time/current/scripts/production-release-retention.mjs --apply --expected-current /opt/eternal-time/releases/ACTUAL_RELEASE_TIMESTAMP
```

Replace the timestamp with the verified active release; the helper fails closed
on mismatch. For a pre-deployment dry-run, the same standalone `.mjs` helper may
be copied to a temporary file and run with `--dry-run`. It needs only Node and
existing server tools, not project dependencies or environment credentials.

## Verification

`tests/production-release-retention.test.ts` exercises planning, older current,
invalid names, symlinks, path boundaries, dry-run, health failures and candidate
replacement. After apply, verify current, service states, health and representative
catalog images. Preserve at least the active and five previous valid releases.
