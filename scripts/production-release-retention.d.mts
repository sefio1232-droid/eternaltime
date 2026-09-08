export type ReleaseEntry = {
  path: string;
  canonicalPath: string;
  isDirectory: boolean;
  isSymbolicLink: boolean;
  bytes: number;
  identity: string;
};
export type RetentionPlan = {
  current: string | null;
  keep: string[];
  delete: ReleaseEntry[];
  skip: { path: string; reason: string }[];
  estimatedBytes: number;
};
export type RetentionOps = {
  checkHealth: (expectedCurrent?: string | null) => Promise<void>;
  inspect: () => Promise<{ current: string; entries: ReleaseEntry[] }>;
  validate: (entry: ReleaseEntry, current: string | null, whitelist: Set<string>) => Promise<void>;
  remove: (candidate: string) => Promise<void>;
};
export const RELEASE_ROOT: string;
export function isReleaseName(name: string): boolean;
export function candidateProblem(entry: ReleaseEntry, current: string | null, whitelist: Set<string>, root?: string): string | null;
export function planRetention(entries: ReleaseEntry[], current: string | null): RetentionPlan;
export function runRetention(options?: { apply?: boolean; expectedCurrent?: string; onPlan?: (plan: RetentionPlan) => void }, ops?: RetentionOps): Promise<{ plan: RetentionPlan; deleted: string[]; rejected: { path: string; reason: string }[]; apply: boolean }>;
