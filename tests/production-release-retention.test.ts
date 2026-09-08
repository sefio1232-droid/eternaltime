import { describe, expect, it, vi } from "vitest";
import { candidateProblem, isReleaseName, planRetention, RELEASE_ROOT, runRetention, type ReleaseEntry, type RetentionOps } from "../scripts/production-release-retention.mjs";

const entry = (day: number): ReleaseEntry => {
  const location = `${RELEASE_ROOT}/202608${String(day).padStart(2, "0")}120000`;
  return { path: location, canonicalPath: location, isDirectory: true, isSymbolicLink: false, bytes: day * 1024, identity: `1:${day}` };
};
const entries = (count: number) => Array.from({ length: count }, (_, index) => entry(index + 1));
function operations(count = 7) {
  const ops = {
    checkHealth: vi.fn<RetentionOps["checkHealth"]>().mockResolvedValue(undefined),
    inspect: vi.fn<RetentionOps["inspect"]>().mockResolvedValue({ entries: entries(count), current: entry(count).path }),
    validate: vi.fn<RetentionOps["validate"]>().mockResolvedValue(undefined),
    remove: vi.fn<RetentionOps["remove"]>().mockResolvedValue(undefined),
  };
  return ops;
}

describe("production release retention", () => {
  it("handles zero releases without inventing an active release", () => {
    expect(planRetention([], null)).toMatchObject({ keep: [], delete: [], estimatedBytes: 0 });
  });
  it.each([1, 6])("keeps all %i releases including current", (count) => {
    const plan = planRetention(entries(count), entry(count).path);
    expect(plan.keep).toHaveLength(count);
    expect(plan.delete).toEqual([]);
  });
  it("deletes exactly the oldest of seven, regardless of input order/mtime", () => {
    const plan = planRetention(entries(7).reverse(), entry(7).path);
    expect(plan.keep).toEqual([7, 6, 5, 4, 3, 2].map((day) => entry(day).path));
    expect(plan.delete).toEqual([entry(1)]);
    expect(plan.estimatedBytes).toBe(1024);
  });
  it("retains newest active plus five previous out of twenty", () => {
    const plan = planRetention(entries(20), entry(20).path);
    expect(plan.keep).toEqual([20, 19, 18, 17, 16, 15].map((day) => entry(day).path));
    expect(plan.delete).toHaveLength(14);
  });
  it("protects older current, keeps five genuine rollback releases and skips newer orphans", () => {
    const plan = planRetention(entries(20), entry(10).path);
    expect(plan.keep).toEqual([10, 9, 8, 7, 6, 5].map((day) => entry(day).path));
    expect(plan.delete.map((item) => item.path)).toEqual([1, 2, 3, 4].map((day) => entry(day).path));
    expect(plan.skip).toHaveLength(10);
  });
  it("protects the oldest current even when there are no earlier rollbacks", () => {
    const plan = planRetention(entries(7), entry(1).path);
    expect(plan.keep).toEqual([entry(1).path]);
    expect(plan.delete).toEqual([]);
    expect(plan.skip).toHaveLength(6);
  });
  it.each(["20260825185808-git", "20260230120000", "uploads", "20260801129900"])("never deletes unrecognized directory %s", (name) => {
    const invalid = { ...entry(1), path: `${RELEASE_ROOT}/${name}`, canonicalPath: `${RELEASE_ROOT}/${name}` };
    const plan = planRetention([...entries(7), invalid], entry(7).path);
    expect(plan.skip).toContainEqual({ path: invalid.path, reason: "UNRECOGNIZED RELEASE DIRECTORY" });
    expect(plan.delete).not.toContainEqual(invalid);
  });
  it("accepts valid leap dates only", () => {
    expect(isReleaseName("20240229120000")).toBe(true);
    expect(isReleaseName("20230229120000")).toBe(false);
  });
  it("does not follow a symlink candidate", () => {
    const link = { ...entry(1), isSymbolicLink: true, canonicalPath: "/opt/eternal-time/shared" };
    const plan = planRetention([link, ...entries(7).slice(1)], entry(7).path);
    expect(plan.delete).toEqual([]);
    expect(plan.skip[0].reason).toBe("SYMLINK CANDIDATE");
  });
  it.each(["/opt/eternal-time/shared/20260801120000", `${RELEASE_ROOT}/nested/20260801120000`, `${RELEASE_ROOT}/../20260801120000`])("rejects paths outside exact parent: %s", (location) => {
    const candidate = { ...entry(1), path: location, canonicalPath: location };
    expect(candidateProblem(candidate, entry(7).path, new Set([location]))).toBe("PATH OUTSIDE CANONICAL RELEASE ROOT");
  });
  it("rejects current even if mistakenly whitelisted", () => {
    expect(candidateProblem(entry(1), entry(1).path, new Set([entry(1).path]))).toBe("ACTIVE RELEASE");
  });
  it("requires membership in the calculated deletion whitelist", () => {
    expect(candidateProblem(entry(1), entry(7).path, new Set())).toBe("NOT IN DELETION WHITELIST");
  });
  it("fails closed when current is absent", () => {
    expect(() => planRetention(entries(7), entry(20).path)).toThrow("Current");
  });
  it.each(["nginx inactive", "eternal-time inactive", "local health 500", "public health 301", "public home 503"])("does not execute cleanup after %s", async (reason) => {
    const ops = operations();
    ops.checkHealth.mockRejectedValue(new Error(reason));
    await expect(runRetention({ apply: true }, ops)).rejects.toThrow(reason);
    expect(ops.inspect).not.toHaveBeenCalled();
    expect(ops.remove).not.toHaveBeenCalled();
  });
  it("dry-run performs zero deletions and reports the exact plan", async () => {
    const ops = operations();
    const result = await runRetention({}, ops);
    expect(result.plan.delete).toEqual([entry(1)]);
    expect(result.deleted).toEqual([]);
    expect(ops.remove).not.toHaveBeenCalled();
  });
  it("checks health again after planning and preserves all releases if it now fails", async () => {
    const ops = operations();
    ops.checkHealth.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("health changed"));
    await expect(runRetention({ apply: true }, ops)).rejects.toThrow("health changed");
    expect(ops.remove).not.toHaveBeenCalled();
  });
  it("removes only the validated oldest path, then verifies health", async () => {
    const ops = operations();
    const result = await runRetention({ apply: true, expectedCurrent: entry(7).path }, ops);
    expect(result.deleted).toEqual([entry(1).path]);
    expect(ops.validate).toHaveBeenCalledTimes(2);
    expect(ops.remove).toHaveBeenCalledExactlyOnceWith(entry(1).path);
    expect(ops.checkHealth).toHaveBeenCalledTimes(3);
  });
  it("skips a candidate replaced after planning without deleting it", async () => {
    const ops = operations();
    ops.validate.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("Candidate inode changed"));
    const result = await runRetention({ apply: true }, ops);
    expect(result.rejected[0].reason).toBe("Candidate inode changed");
    expect(ops.remove).not.toHaveBeenCalled();
  });
  it("rejects a mismatched deployed target before deletion", async () => {
    const ops = operations();
    await expect(runRetention({ apply: true, expectedCurrent: entry(5).path }, ops)).rejects.toThrow("Unexpected active release");
    expect(ops.remove).not.toHaveBeenCalled();
  });
});
