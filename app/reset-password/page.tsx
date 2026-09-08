import type { Metadata } from "next";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/server/supabase/server";

export const metadata: Metadata = { title: "ตั้งรหัสผ่านใหม่", robots: { index: false, follow: false } };

const errorLabels: Record<string, string> = {
  auth_not_configured: "ระบบสมาชิก Staging ยังไม่พร้อม กรุณาลองใหม่ภายหลัง",
  invalid_password: "รหัสผ่านต้องมี 10–128 ตัวอักษร และกรอกทั้งสองช่องให้ตรงกัน",
  update_failed: "ตั้งรหัสผ่านใหม่ไม่สำเร็จ ลิงก์อาจหมดอายุ กรุณาขอลิงก์ใหม่",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  if (!isSupabaseConfigured()) redirect("/login?error=auth_not_configured");
  const client = await createServerSupabaseClient();
  const [{ data: { user } }, params] = await Promise.all([client.auth.getUser(), searchParams]);
  if (!user) redirect("/login?error=recovery_session_required");

  return (
    <div className="container-page grid min-h-[65vh] place-items-center py-12">
      <div className="soft-card w-full max-w-lg p-7 sm:p-10">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#EEF4FF] text-[#0F5BD8]">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-[#0B2F6B]">ตั้งรหัสผ่านใหม่</h1>
          <p className="mt-2 text-sm text-[#66758A]">กำหนดรหัสผ่านใหม่สำหรับบัญชี {user.email}</p>
        </div>

        {params.error && (
          <p className="mt-6 rounded-xl border border-[#F4BBB5] bg-[#FFF1F0] p-4 text-sm text-[#8A1C13]" role="alert">
            {errorLabels[params.error] ?? "ไม่สามารถตั้งรหัสผ่านใหม่ได้"}
          </p>
        )}

        <form method="post" action="/api/auth/reset-password" className="mt-7 grid gap-5">
          <label className="grid gap-2 text-sm font-bold">
            รหัสผ่านใหม่
            <input className="field" type="password" name="password" minLength={10} maxLength={128} autoComplete="new-password" required />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            ยืนยันรหัสผ่านใหม่
            <input className="field" type="password" name="confirmPassword" minLength={10} maxLength={128} autoComplete="new-password" required />
          </label>
          <button className="btn btn-primary w-full" type="submit">บันทึกรหัสผ่านใหม่</button>
        </form>

        <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-[#66758A]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#2FC58D]" />
          ระบบจะออกจาก recovery session หลังบันทึก และให้เข้าสู่ระบบใหม่ด้วยรหัสผ่านล่าสุด
        </p>
      </div>
    </div>
  );
}
