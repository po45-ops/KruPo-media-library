import "server-only";
import { connection } from "next/server";
import { probeSupabaseHealth, type ComponentHealth } from "@/server/supabase/health";
import { getStorageProvider } from "@/providers/storage";
import { getSupabasePublicConfig } from "@/server/supabase/config";
import { createAdminSupabaseClient } from "@/server/supabase/admin";
import { assessBackgroundJobsHealth, type BackgroundJobName, type BackgroundJobRunSnapshot } from "@/server/health/background-job-health";
import { assessSecureLinksHealth } from "@/server/health/secure-links-health";

export interface SystemHealthReport {
  service: string;
  status: "operational" | "critical";
  time: string;
  checks: Record<string, ComponentHealth & { provider?: string; lastRunAt?: string }>;
}

async function probeBackgroundJobsHealth(): Promise<ComponentHealth & { lastRunAt?: string }> {
  if (!getSupabasePublicConfig() || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
    return { status: "unknown", reason: "missing_configuration" };
  }
  if (!process.env["JOB_RUNNER_SECRET"]) {
    return { status: "warning", reason: "missing_configuration" };
  }

  try {
    const db = createAdminSupabaseClient();
    const jobNames: BackgroundJobName[] = ["link_health", "refund_reconciliation"];
    const results = await Promise.all(jobNames.map((jobName) =>
      db.from("background_job_runs")
        .select("job_name,status,started_at,finished_at")
        .eq("job_name", jobName)
        .order("started_at", { ascending: false })
        .limit(1),
    ));
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;

    const runs = results.flatMap((result) => result.data ?? []) as BackgroundJobRunSnapshot[];
    return assessBackgroundJobsHealth(runs);
  } catch {
    console.error("background_job_health_probe_failed");
    return { status: "unknown", reason: "probe_failed" };
  }
}

async function probeSecureLinksHealth(): Promise<ComponentHealth> {
  if (!getSupabasePublicConfig() || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
    return { status: "unknown", reason: "missing_configuration" };
  }

  try {
    const { count, error } = await createAdminSupabaseClient()
      .from("media_secure_targets")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    return assessSecureLinksHealth(count ?? 0, (process.env["MEDIA_URL_ENCRYPTION_KEY"]?.length ?? 0) >= 32);
  } catch {
    console.error("secure_links_health_probe_failed");
    return { status: "unknown", reason: "probe_failed" };
  }
}

async function probeStorageHealth(provider: string): Promise<ComponentHealth> {
  if (provider === "local_test") return { status: "warning" };
  try {
    return await getStorageProvider().health();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const credentialNames = [
      "GOOGLE_DRIVE_CLIENT_ID",
      "GOOGLE_DRIVE_CLIENT_SECRET",
      "GOOGLE_DRIVE_REFRESH_TOKEN",
      "GOOGLE_DRIVE_ROOT_FOLDER_ID",
    ];
    const missingCredentials = credentialNames.filter((name) => message.includes(name));
    console.error("storage_provider_configuration_unavailable", {
      missingCredentials,
      reason: missingCredentials.length ? "missing_drive_credentials" : "invalid_storage_configuration",
    });
    return { status: "critical", reason: "missing_configuration" };
  }
}

export async function getSystemHealthReport(): Promise<SystemHealthReport> {
  await connection();
  const payment = process.env.PAYMENT_PROVIDER || "mock";
  const storage = process.env.STORAGE_PROVIDER || "local_test";
  const [supabase, storageHealth, jobsHealth, secureLinksHealth] = await Promise.all([
    probeSupabaseHealth(),
    probeStorageHealth(storage),
    probeBackgroundJobsHealth(),
    probeSecureLinksHealth(),
  ]);
  const checks: SystemHealthReport["checks"] = {
    website: { status: "healthy" },
    database: supabase.database,
    storage: { ...storageHealth, provider: storage },
    payment: {
      status: payment === "stripe" ? "unknown" : "warning",
      reason: payment === "stripe" ? "not_probed" : payment === "mock" ? "mock_provider" : "disabled_provider",
      provider: payment,
    },
    auth: supabase.auth,
    secureGameLinks: { ...secureLinksHealth, provider: "AES-256-GCM" },
    ai: { status: (process.env.COPYRIGHT_AI_PROVIDER || "BASIC") === "ADVANCED" ? "unknown" : "healthy" },
    jobs: { ...jobsHealth, provider: "cloudflare_cron" },
  };
  const critical = Object.values(checks).some((check) => check.status === "critical");
  return {
    service: "KruPo คลังสื่อ",
    status: critical ? "critical" : "operational",
    time: new Date().toISOString(),
    checks,
  };
}
