import "server-only";
import { createAdminSupabaseClient } from "@/server/supabase/admin";
import { getSupabasePublicConfig } from "@/server/supabase/config";

export type HealthStatus = "healthy" | "warning" | "critical" | "unknown";

export interface ComponentHealth {
  status: HealthStatus;
  reason?: "missing_configuration" | "probe_failed" | "timeout";
}

interface ProbeDependencies {
  configured: () => boolean;
  checkDatabase: () => Promise<void>;
  checkAuth: () => Promise<void>;
  timeoutMs: number;
}

const defaultDependencies: ProbeDependencies = {
  configured: () => Boolean(getSupabasePublicConfig() && process.env["SUPABASE_SERVICE_ROLE_KEY"]),
  async checkDatabase() {
    const { error } = await createAdminSupabaseClient()
      .from("system_settings")
      .select("key")
      .limit(1);
    if (error) throw error;
  },
  async checkAuth() {
    const { error } = await createAdminSupabaseClient().auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
  },
  timeoutMs: 4_000,
};

class ProbeTimeoutError extends Error {}

async function runProbe(check: () => Promise<void>, timeoutMs: number): Promise<ComponentHealth> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      check(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ProbeTimeoutError("health probe timed out")), timeoutMs);
      }),
    ]);
    return { status: "healthy" };
  } catch (error) {
    return { status: "critical", reason: error instanceof ProbeTimeoutError ? "timeout" : "probe_failed" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function probeSupabaseHealth(
  overrides: Partial<ProbeDependencies> = {},
): Promise<{ database: ComponentHealth; auth: ComponentHealth }> {
  const dependencies = { ...defaultDependencies, ...overrides };
  if (!dependencies.configured()) {
    return {
      database: { status: "unknown", reason: "missing_configuration" },
      auth: { status: "unknown", reason: "missing_configuration" },
    };
  }

  const [database, auth] = await Promise.all([
    runProbe(dependencies.checkDatabase, dependencies.timeoutMs),
    runProbe(dependencies.checkAuth, dependencies.timeoutMs),
  ]);
  return { database, auth };
}
