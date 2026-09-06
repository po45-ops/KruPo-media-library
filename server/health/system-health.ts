import "server-only";
import { connection } from "next/server";
import { probeSupabaseHealth, type ComponentHealth } from "@/server/supabase/health";

export interface SystemHealthReport {
  service: string;
  status: "operational" | "critical";
  time: string;
  checks: Record<string, ComponentHealth & { provider?: string }>;
}

export async function getSystemHealthReport(): Promise<SystemHealthReport> {
  await connection();
  const payment = process.env.PAYMENT_PROVIDER || "mock";
  const storage = process.env.STORAGE_PROVIDER || "local_test";
  const supabase = await probeSupabaseHealth();
  const checks: SystemHealthReport["checks"] = {
    website: { status: "healthy" },
    database: supabase.database,
    storage: { status: storage === "local_test" ? "warning" : "healthy", provider: storage },
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
