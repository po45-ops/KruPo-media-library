import { Activity, AlertTriangle, CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { getSystemHealthReport } from "@/server/health/system-health";

const labels: Record<string, string> = {
  website: "Website",
  database: "Database",
  storage: "Storage",
  payment: "Payment",
  auth: "Auth",
  ai: "AI",
  jobs: "Background Jobs",
};

export default async function Page() {
  const report = await getSystemHealthReport();
  return <>
    <div className="flex items-center gap-3"><Activity className="h-8 w-8 text-[#0F5BD8]"/><div><h1 className="text-3xl font-black text-[#0B2F6B]">Health Center</h1><p className="mt-1 text-[#66758A]">สถานะบริการจริงโดยไม่แสดง secret หรือ token</p></div></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Object.entries(report.checks).map(([key, check]) => {
      const Icon = check.status === "healthy" ? CheckCircle2 : check.status === "warning" ? AlertTriangle : check.status === "critical" ? XCircle : CircleHelp;
      return <div className="soft-card flex items-center justify-between p-5" key={key}><div><h2 className="font-extrabold text-[#0B2F6B]">{labels[key] ?? key}</h2><p className="mt-1 text-xs text-[#66758A]">{check.provider ? `Provider: ${check.provider}` : "ตรวจแบบ fail-safe"}</p></div><span className={`badge ${check.status === "healthy" ? "bg-[#DDF7EC] text-[#13845B]" : check.status === "warning" ? "bg-[#FFF1CE] text-[#8A5D00]" : check.status === "critical" ? "bg-[#FFE4E4] text-[#B42318]" : "bg-[#EEF1F5] text-[#66758A]"}`}><Icon className="h-4 w-4"/>{check.status}</span></div>;
    })}</div>
    <a href="/api/health" className="btn btn-secondary mt-6">ดูผล Health API</a>
  </>;
}
