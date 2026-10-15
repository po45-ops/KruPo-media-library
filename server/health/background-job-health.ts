export type BackgroundJobName = "link_health" | "refund_reconciliation";

export interface BackgroundJobRunSnapshot {
  job_name: string;
  status: "running" | "succeeded" | "failed" | "partial";
  started_at: string;
  finished_at: string | null;
}

export interface BackgroundJobsHealth {
  status: "healthy" | "warning" | "critical" | "unknown";
  reason?: "missing_configuration" | "not_run" | "incomplete_run" | "stale_run";
  lastRunAt?: string;
}

const REQUIRED_JOBS: readonly BackgroundJobName[] = ["link_health", "refund_reconciliation"];
const MAX_JOB_AGE_MS = 36 * 60 * 60 * 1000;

export function assessBackgroundJobsHealth(
  runs: readonly BackgroundJobRunSnapshot[],
  now = Date.now(),
): BackgroundJobsHealth {
  const latestByName = new Map<BackgroundJobName, BackgroundJobRunSnapshot>();

  for (const run of runs) {
    if (!REQUIRED_JOBS.includes(run.job_name as BackgroundJobName)) continue;
    const jobName = run.job_name as BackgroundJobName;
    const current = latestByName.get(jobName);
    if (!current || Date.parse(run.started_at) > Date.parse(current.started_at)) {
      latestByName.set(jobName, run);
    }
  }

  const latestRuns = REQUIRED_JOBS.map((jobName) => latestByName.get(jobName));
  const timestamps = latestRuns
    .filter((run): run is BackgroundJobRunSnapshot => Boolean(run))
    .map((run) => run.finished_at ?? run.started_at);
  const lastRunAt = timestamps.length
    ? timestamps.sort((a, b) => Date.parse(b) - Date.parse(a))[0]
    : undefined;

  if (latestRuns.some((run) => !run)) return { status: "warning", reason: "not_run", lastRunAt };
  if (latestRuns.some((run) => run?.status !== "succeeded")) {
    return { status: "warning", reason: "incomplete_run", lastRunAt };
  }
  if (!lastRunAt || now - Date.parse(lastRunAt) > MAX_JOB_AGE_MS) {
    return { status: "warning", reason: "stale_run", lastRunAt };
  }

  return { status: "healthy", lastRunAt };
}
