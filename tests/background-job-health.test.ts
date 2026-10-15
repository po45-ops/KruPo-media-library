import { describe, expect, it } from "vitest";
import { assessBackgroundJobsHealth, type BackgroundJobRunSnapshot } from "@/server/health/background-job-health";
import { assessSecureLinksHealth } from "@/server/health/secure-links-health";

const now = Date.parse("2026-09-27T00:00:00.000Z");
const recentRuns: BackgroundJobRunSnapshot[] = [
  { job_name: "link_health", status: "succeeded", started_at: "2026-09-26T17:00:00.000Z", finished_at: "2026-09-26T17:01:00.000Z" },
  { job_name: "refund_reconciliation", status: "succeeded", started_at: "2026-09-26T17:00:00.000Z", finished_at: "2026-09-26T17:01:00.000Z" },
];

describe("background job health", () => {
  it("reports healthy only when both scheduled jobs recently succeeded", () => {
    expect(assessBackgroundJobsHealth(recentRuns, now)).toEqual({
      status: "healthy",
      lastRunAt: "2026-09-26T17:01:00.000Z",
    });
  });

  it("warns when a required job has never run", () => {
    expect(assessBackgroundJobsHealth([recentRuns[0]], now)).toMatchObject({
      status: "warning",
      reason: "not_run",
    });
  });

  it("warns when a job failed or is still running", () => {
    expect(assessBackgroundJobsHealth([
      recentRuns[0],
      { ...recentRuns[1], status: "failed" },
    ], now)).toMatchObject({ status: "warning", reason: "incomplete_run" });
  });

  it("warns when the most recent successful run is stale", () => {
    const stale = recentRuns.map((run) => ({
      ...run,
      started_at: "2026-09-24T00:00:00.000Z",
      finished_at: "2026-09-24T00:01:00.000Z",
    }));
    expect(assessBackgroundJobsHealth(stale, now)).toMatchObject({
      status: "warning",
      reason: "stale_run",
    });
  });

  it("requires encryption configuration before secure game links are usable", () => {
    expect(assessSecureLinksHealth(0, false)).toEqual({
      status: "warning",
      reason: "missing_configuration",
    });
    expect(assessSecureLinksHealth(2, false)).toEqual({
      status: "critical",
      reason: "missing_configuration",
    });
    expect(assessSecureLinksHealth(2, true)).toEqual({ status: "healthy" });
  });
});
