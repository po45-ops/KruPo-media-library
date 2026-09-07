import "server-only";
import { connection } from "next/server";
import { probeSupabaseHealth, type ComponentHealth } from "@/server/supabase/health";
import { getStorageProvider } from "@/providers/storage";

export interface SystemHealthReport {
  service: string;
  status: "operational" | "critical";
  time: string;
  checks: Record<string, ComponentHealth & { provider?: string }>;
}

async function probeStorageHealth(provider: string): Promise<ComponentHealth> {
  if (provider === "local_test") return { status: "warning" };
  try {
    return await getStorageProvider().health();
  } catch {
    return { status: "critical", reason: "missing_configuration" };
  }
}

export async function getSystemHealthReport(): Promise<SystemHealthReport> {
  await connection();
  const payment = process.env.PAYMENT_PROVIDER || "mock";
  const storage = process.env.STORAGE_PROVIDER || "local_test";
  const [supabase, storageHealth] = await Promise.all([
    probeSupabaseHealth(),
    probeStorageHealth(storage),
  ]);
  const checks: SystemHealthReport["checks"] = {
    website: { status: "healthy" },
    database: supabase.database,
    storage: { ...storageHealth, provider: storage },
    payment: { status: payment === "mock" || payment === "disabled" ? "warning" : "healthy", provider: payment },
    auth: supabase.auth,
    ai: { status: (process.env.COPYRIGHT_AI_PROVIDER || "BASIC") === "ADVANCED" ? "unknown" : "healthy" },
    jobs: { status: "unknown" },
  };
  const critical = Object.values(checks).some((check) => check.status === "critical");
  return {
    service: "KruPo คลังสื่อ",
    status: critical ? "critical" : "operational",
    time: new Date().toISOString(),
    checks,
  };
}
