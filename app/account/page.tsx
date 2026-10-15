import type { Metadata } from "next";
import { BookOpen, Heart, History, LogOut, Save, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedUserProfile } from "@/server/repositories/user-data-repository";

export const metadata: Metadata = { title: "บัญชีของฉัน", robots: { index: false, follow: false } };

const errorLabels: Record<string, string> = {
  database_not_configured: "ฐานข้อมูล Staging ยังไม่ได้ตั้งค่า จึงยังบันทึกการเปลี่ยนแปลงไม่ได้",
  invalid_input: "กรุณากรอกชื่อที่แสดง 2–80 ตัวอักษร",
  save_failed: "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const [profile, params] = await Promise.all([
    getAuthenticatedUserProfile(),
    searchParams,
  ]);
  if (!profile) redirect("/login?next=%2Faccount");

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-black text-[#0B2F6B]">ข้อมูลบัญชี</h1>
      <p className="mt-2 text-[#66758A]">ดูแลข้อมูลของคุณ แล้วกลับไปค้นพบไอเดียสำหรับห้องเรียน</p>

      {params.saved === "1" && (
        <p className="mt-5 rounded-xl border border-[#BFE9D8] bg-[#F0FBF7] p-4 text-sm text-[#176B50]" role="status">
          บันทึกข้อมูลบัญชีเรียบร้อยแล้ว
        </p>
      )}
      {params.error && (
        <p className="mt-5 rounded-xl border border-[#F4BBB5] bg-[#FFF1F0] p-4 text-sm text-[#8A1C13]" role="alert">
          {errorLabels[params.error] ?? "ไม่สามารถบันทึกข้อมูลได้"}
        </p>
      )}

      <div className="account-layout"><div className="soft-card p-7">
        <div className="mb-7 flex items-center gap-4"><span className="account-avatar"><UserRound size={28}/></span><div className="min-w-0"><h2 className="text-xl font-semibold">{profile.displayName}</h2><p className="break-all text-sm text-[#66758A]">{profile.email}</p></div></div>
        <form className="grid gap-5" method="post" action="/api/account">
          <label className="grid gap-2 font-bold">
            ชื่อที่แสดง
            <input className="field" name="displayName" defaultValue={profile.displayName} minLength={2} maxLength={80} required />
          </label>
          <label className="grid gap-2 font-bold">
            อีเมล
            <input className="field bg-[#F5F7FA]" type="email" value={profile.email ?? "ไม่พบอีเมลในบัญชี"} readOnly />
            <span className="text-xs font-normal text-[#66758A]">สิทธิ์การซื้อผูกกับรหัสผู้ใช้ ไม่ใช่อีเมล</span>
          </label>
          {profile.createdAt && (
            <p className="text-sm text-[#66758A]">
              เป็นสมาชิกตั้งแต่ {new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(new Date(profile.createdAt))}
            </p>
          )}
          <button className="btn btn-primary w-fit" type="submit">
            <Save className="h-4 w-4" />บันทึกข้อมูล
          </button>
        </form>

        <div className="my-7 border-t border-[#E1E8F2]" />
        <form method="post" action="/api/auth/logout">
          <button className="btn btn-secondary text-[#B42318]" type="submit">
            <LogOut className="h-4 w-4" />ออกจากระบบ
          </button>
        </form>
      </div><aside className="soft-card p-5"><h2 className="mb-3 font-semibold">พื้นที่ของคุณ</h2><nav className="account-shortcuts" aria-label="ทางลัดบัญชี"><Link href="/my-library"><BookOpen size={18}/>สื่อของฉัน</Link><Link href="/favorites"><Heart size={18}/>รายการโปรด</Link><Link href="/orders"><History size={18}/>ประวัติการซื้อ</Link><Link href="/creator"><UserRound size={18}/>พื้นที่ผู้สร้าง</Link><Link href="/forgot-password">ตั้งรหัสผ่านใหม่</Link></nav></aside></div>
    </div>
  );
}
