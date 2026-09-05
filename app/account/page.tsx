import type { Metadata } from "next";
import { LogOut, Save } from "lucide-react";
import { requirePrincipal } from "@/server/auth/principal";
import { getUserProfile } from "@/server/repositories/user-data-repository";

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
  const principal = await requirePrincipal("/account");
  const [profile, params] = await Promise.all([
    getUserProfile(principal.userId, principal.email),
    searchParams,
  ]);

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-black text-[#0B2F6B]">ข้อมูลบัญชี</h1>
      <p className="mt-2 text-[#66758A]">ข้อมูลส่วนนี้อ่านและแก้ไขผ่านบัญชี Supabase ของผู้ใช้ที่เข้าสู่ระบบ</p>

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

      <div className="soft-card mt-7 max-w-2xl p-7">
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
      </div>
    </div>
  );
}
