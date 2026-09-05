import Link from "next/link";
import { BadgeCheck,ChartNoAxesCombined,Clock3,HandCoins,ShieldCheck,WalletCards } from "lucide-react";
import { CreatorNav } from "@/components/creator-nav";
import { getRequestPrincipal } from "@/server/auth/principal";
import { getCreatorDashboard } from "@/server/repositories/creator-repository";
import { formatBahtAmount } from "@/server/domain/money";

export default async function CreatorPage(){
  const principal=await getRequestPrincipal();
  const dashboard=principal?await getCreatorDashboard(principal.userId):null;
  const stats=dashboard?[
    ["ยอดขายทั้งหมด",formatBahtAmount(dashboard.totalSalesSatang),ChartNoAxesCombined],
    ["รายได้ผู้สร้าง",formatBahtAmount(dashboard.creatorRevenueSatang),HandCoins],
    ["ค่าบริการ KruPo",formatBahtAmount(dashboard.platformFeeSatang),ShieldCheck],
    ["ยอดพัก",formatBahtAmount(dashboard.onHoldSatang),Clock3],
    ["ยอดพร้อมจ่าย",formatBahtAmount(dashboard.availableSatang),WalletCards],
    ["สื่อเผยแพร่",`${dashboard.publishedCount.toLocaleString("th-TH")} รายการ`,BadgeCheck]
  ] as const:[];
  return <div className="container-page py-9">
    <div className="rounded-[28px] bg-gradient-to-r from-[#0B2F6B] to-[#6554E8] p-8 text-white"><span className="badge bg-white/15 text-white"><BadgeCheck className="h-4 w-4"/>Creator Marketplace</span><h1 className="mt-4 text-3xl font-black">ศูนย์ผู้สร้างสื่อ</h1><p className="mt-2 max-w-2xl text-white/75">ส่งผลงาน ติดตามการตรวจสอบ และดูรายได้ที่คำนวณจากบัญชีแยกประเภท</p></div>
    <div className="mt-6"><CreatorNav/></div>
    {principal&&dashboard?<>
      <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{stats.map(([label,value,Icon])=><div className="soft-card p-5" key={label}><Icon className="h-7 w-7 text-[#0F5BD8]"/><p className="mt-3 text-sm text-[#66758A]">{label}</p><p className="mt-1 text-2xl font-black text-[#0B2F6B]">{value}</p></div>)}</section>
      <section className="soft-card mt-7 p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="section-title">สื่อที่ส่งล่าสุด</h2><p className="mt-1 text-sm text-[#66758A]">สถานะบัญชี {dashboard.profileStatus} • ระดับ {dashboard.trustLevel}</p></div><Link className="btn btn-primary" href="/creator/media/new">เพิ่มสื่อใหม่</Link></div><div className="mt-5 grid gap-3">{dashboard.recentSubmissions.length?dashboard.recentSubmissions.map(item=><div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E1E8F2] p-4" key={item.id}><div><strong>{item.title}</strong><p className="mt-1 text-xs text-[#66758A]">ส่งเมื่อ {new Intl.DateTimeFormat("th-TH",{dateStyle:"medium",timeZone:"Asia/Bangkok"}).format(new Date(item.submittedAt))}</p></div><span className="badge bg-[#EEF4FF] text-[#0F5BD8]">{item.status}</span></div>):<p className="text-sm text-[#66758A]">ยังไม่มีสื่อที่ส่งเข้าตรวจ</p>}</div></section>
    </>:<div className="mt-7 rounded-2xl border border-[#AAC9F6] bg-[#EEF4FF] p-5 text-[#0B2F6B]">เข้าสู่ระบบก่อนสมัคร Creator และดูข้อมูลรายได้จริง <Link className="font-black text-[#0F5BD8]" href="/login?next=/creator">เข้าสู่ระบบ</Link></div>}
    <section className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="soft-card p-7"><h2 className="section-title">สมัครเป็นผู้สร้างสื่อ</h2><p className="mt-2 text-sm leading-6 text-[#66758A]">กรอกข้อมูลเพื่อให้ทีมงานตรวจสอบ ระบบจะยังไม่เผยแพร่ผลงานจนกว่าจะผ่าน workflow</p><form method="post" action="/api/creator/applications" className="mt-6 grid gap-4"><label className="grid gap-2 text-sm font-bold">ชื่อที่แสดง<input required name="displayName" className="field"/></label><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">ชื่อจริง<input required name="legalName" className="field"/></label><label className="grid gap-2 text-sm font-bold">เบอร์โทร<input required name="phone" className="field" inputMode="tel"/></label></div><label className="grid gap-2 text-sm font-bold">ประเภท<select name="creatorType" className="field"><option value="teacher">ครู</option><option value="student">นักศึกษา</option><option value="game_creator">ผู้สร้างเกม</option><option value="designer">นักออกแบบสื่อ</option><option value="other">อื่น ๆ</option></select></label><label className="grid gap-2 text-sm font-bold">แนะนำตัว<textarea required name="bio" className="field min-h-28"/></label><label className="grid gap-2 text-sm font-bold">ตัวอย่างผลงาน / ช่องทางติดต่อ<input name="portfolioUrl" type="url" className="field" placeholder="https://"/></label><label className="flex gap-3 text-sm leading-6 text-[#44546B]"><input required type="checkbox" name="ownershipConfirmed" className="mt-1"/>ฉันยืนยันว่าเป็นเจ้าของหรือมีสิทธิ์เผยแพร่/จำหน่ายผลงานนี้</label><label className="flex gap-3 text-sm leading-6 text-[#44546B]"><input required type="checkbox" name="agreementAccepted" className="mt-1"/>ฉันยอมรับ <Link href="/seller-agreement" className="font-bold text-[#0F5BD8]">ข้อตกลงผู้ขาย</Link></label><button className="btn btn-primary" type="submit">ส่งใบสมัคร</button></form></div>
      <div className="grid content-start gap-5"><div className="soft-card p-7"><h2 className="text-xl font-extrabold text-[#0B2F6B]">ส่วนแบ่งโปร่งใส</h2><div className="mt-5 grid gap-3">{[["Creator ใหม่","85%","KruPo 15%"],["Verified Creator","88%","KruPo 12%"],["Trusted Creator","90%","KruPo 10%"]].map(([level,share,fee])=><div key={level} className="flex items-center justify-between rounded-xl bg-[#F7FAFF] p-4"><div><strong>{level}</strong><p className="text-xs text-[#66758A]">{fee}</p></div><span className="text-2xl font-black text-[#159665]">{share}</span></div>)}</div><p className="mt-4 text-xs leading-5 text-[#66758A]">อัตราธุรกรรมจริงอ่านจาก commission rules และ snapshot ตอนสร้างคำสั่งซื้อ</p></div><div className="rounded-2xl border border-[#F4D78D] bg-[#FFF9E9] p-6"><h3 className="font-extrabold text-[#7A5710]">KruPo Copyright Risk Guard</h3><p className="mt-2 text-sm leading-6 text-[#7A5710]">ระบบวิเคราะห์ความเสี่ยงด้านความซ้ำและแหล่งที่มาของสื่อ ผลวิเคราะห์ไม่ใช่การรับรองทางกฎหมาย และมีผู้ตรวจเป็นผู้ตัดสินใจ</p></div></div>
    </section>
  </div>;
}
