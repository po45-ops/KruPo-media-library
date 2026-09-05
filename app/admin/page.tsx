import { Activity,Bot,Boxes,Copyright,HandCoins,Link2,ReceiptText,Store,Users } from "lucide-react";
import { formatBahtAmount } from "@/server/domain/money";
import { getAdminDashboard,getFeatureFlags } from "@/server/repositories/admin-repository";

export default async function AdminPage(){
  const [data,flags]=await Promise.all([getAdminDashboard(),getFeatureFlags()]);
  const kpis=[
    ["ยอดขายวันนี้",formatBahtAmount(data.salesTodaySatang),ReceiptText],
    ["ผู้ใช้",data.users.toLocaleString("th-TH"),Users],
    ["Creator",data.creators.toLocaleString("th-TH"),Store],
    ["Media / Games",`${data.media.toLocaleString("th-TH")} / ${data.games.toLocaleString("th-TH")}`,Boxes],
    ["Broken links",data.brokenLinks.toLocaleString("th-TH"),Link2],
    ["Copyright claims",data.copyrightClaims.toLocaleString("th-TH"),Copyright],
    ["Payout pending",data.payoutPending.toLocaleString("th-TH"),HandCoins],
    ["AI usage",formatBahtAmount(data.aiUsedSatang),Bot]
  ] as const;
  const actions=[["เคสลิขสิทธิ์",data.copyrightClaims],["ลิงก์มีปัญหา",data.brokenLinks],["สื่อรอตรวจ",data.pendingReviews],["ยอดรอจ่าย",data.payoutPending]] as const;
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold text-[#0F5BD8]">KruPo Operations</p><h1 className="text-3xl font-black text-[#0B2F6B]">แดชบอร์ดผู้ดูแลระบบ</h1></div><span className="badge bg-[#DDF7EC] text-[#13845B]"><Activity className="h-4 w-4"/>ข้อมูลจากฐานข้อมูล</span></div>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.map(([label,value,Icon])=><div className="soft-card p-5" key={label}><Icon className="h-7 w-7 text-[#0F5BD8]"/><p className="mt-4 text-sm text-[#66758A]">{label}</p><p className="mt-1 text-2xl font-black text-[#0B2F6B]">{value}</p></div>)}</section>
    <section className="soft-card mt-6 p-6"><h2 className="section-title">สิ่งที่ต้องดำเนินการวันนี้</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{actions.map(([label,value])=><div className="flex items-center justify-between rounded-xl border border-[#E1E8F2] p-4" key={label}><span className="font-bold">{label}</span><span className={`badge ${value===0?"bg-[#DDF7EC] text-[#13845B]":"bg-[#FFF1CE] text-[#8A5D00]"}`}>{value.toLocaleString("th-TH")}</span></div>)}</div></section>
    <section className="soft-card mt-6 p-6"><h2 className="text-xl font-extrabold text-[#0B2F6B]">Kill switches</h2><p className="mt-1 text-sm text-[#66758A]">ค่าปัจจุบันอ่านจาก `feature_flags` การแก้ไขต้องผ่าน API พร้อม role และ audit log</p><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{flags.length?flags.map(flag=><div key={flag.key} className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F9FD] p-3"><span className="text-sm font-bold">{flag.description}</span><span className={`badge ${flag.enabled?"bg-[#DDF7EC] text-[#13845B]":"bg-[#FFF1CE] text-[#8A5D00]"}`}>{flag.enabled?"เปิด":"ปิด"}</span></div>):<p className="text-sm text-[#66758A]">ยังไม่มีข้อมูล Staging</p>}</div></section>
  </>;
}
