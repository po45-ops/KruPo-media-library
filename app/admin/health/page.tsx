import { Activity, AlertTriangle, CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { getSystemHealthReport } from "@/server/health/system-health";

const labels: Record<string, string> = {
  website: "เว็บไซต์",
  database: "ฐานข้อมูล",
  storage: "พื้นที่จัดเก็บไฟล์",
  payment: "ระบบชำระเงิน",
  auth: "ระบบสมาชิก",
  ai: "ตรวจความเสี่ยงสื่อ",
  jobs: "งานตามกำหนดเวลา",
  secureGameLinks: "ลิงก์เกมที่ป้องกันไว้",
};

const reasonLabels: Record<string, string> = {
  missing_configuration: "ยังตั้งค่าการเชื่อมต่อไม่ครบ",
  probe_failed: "ตรวจการเชื่อมต่อไม่สำเร็จ",
  timeout: "หมดเวลารอตรวจการเชื่อมต่อ",
  not_run: "ยังไม่มีผลรันของงานตามรอบ",
  incomplete_run: "งานรอบล่าสุดยังไม่สำเร็จครบ",
  stale_run: "ผลรันล่าสุดเก่ากว่า 36 ชั่วโมง",
  not_probed: "ยังไม่ได้ตรวจการเชื่อมต่อ Stripe อัตโนมัติ",
  mock_provider: "ใช้ระบบทดสอบ ไม่ใช่ระบบรับเงินจริง",
  disabled_provider: "ปิดการชำระเงินอยู่",
};

const providerLabels: Record<string, string> = {
  cloudflare_cron: "Cloudflare ตามกำหนดเวลา",
  google_drive: "Google Drive ส่วนตัว",
  local_test: "ที่เก็บไฟล์ทดสอบ",
  stripe: "Stripe",
  mock: "ระบบชำระเงินทดสอบ",
  disabled: "ปิดใช้งาน",
  "AES-256-GCM": "เข้ารหัสลิงก์เกม",
};

export default async function Page() {
  const report = await getSystemHealthReport();
  return <>
    <div className="flex items-center gap-3"><Activity className="h-8 w-8 text-[#0F5BD8]"/><div><h1 className="text-3xl font-black text-[#0B2F6B]">Health Center</h1><p className="mt-1 text-[#66758A]">สถานะบริการจริงโดยไม่แสดง secret หรือ token</p></div></div>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Object.entries(report.checks).map(([key, check]) => {
      const Icon = check.status === "healthy" ? CheckCircle2 : check.status === "warning" ? AlertTriangle : check.status === "critical" ? XCircle : CircleHelp;
      const description = check.lastRunAt
        ? `รันล่าสุด ${new Date(check.lastRunAt).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`
        : check.reason
          ? reasonLabels[check.reason] ?? "ต้องตรวจสอบเพิ่มเติม"
          : check.provider
            ? providerLabels[check.provider] ?? check.provider
            : "ตรวจแบบ fail-safe";
      const statusLabel = check.status === "healthy" ? "ปกติ" : check.status === "warning" ? "ควรตรวจสอบ" : check.status === "critical" ? "ขัดข้อง" : "ยังไม่ทราบ";
      return <div className="soft-card flex items-center justify-between p-5" key={key}><div><h2 className="font-extrabold text-[#0B2F6B]">{labels[key] ?? key}</h2><p className="mt-1 text-xs text-[#66758A]">{description}</p></div><span className={`badge ${check.status === "healthy" ? "bg-[#DDF7EC] text-[#13845B]" : check.status === "warning" ? "bg-[#FFF1CE] text-[#8A5D00]" : check.status === "critical" ? "bg-[#FFE4E4] text-[#B42318]" : "bg-[#EEF1F5] text-[#66758A]"}`}><Icon className="h-4 w-4"/>{statusLabel}</span></div>;
    })}</div>
    <a href="/api/health" className="btn btn-secondary mt-6">ดูผล Health API</a>
  </>;
}
