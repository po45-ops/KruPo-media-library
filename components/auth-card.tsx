import Image from "next/image";
import Link from "next/link";
import { Mail, ShieldCheck } from "lucide-react";
import { PasswordField } from "@/components/auth-fields";
import { LearningScene } from "@/components/learning-scene";

const messageLabels: Record<string, string> = {
  verify_email: "ส่งลิงก์ยืนยันแล้ว กรุณาตรวจกล่องจดหมายก่อนเข้าสู่ระบบ",
  reset_if_exists: "หากอีเมลนี้มีบัญชี ระบบได้ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว",
  password_updated: "ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว กรุณาเข้าสู่ระบบอีกครั้ง",
};

const errorLabels: Record<string, string> = {
  auth_not_configured: "ระบบสมาชิก Staging ยังไม่พร้อม กรุณาลองใหม่ภายหลัง",
  invalid_credentials: "อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือบัญชียังไม่ได้ยืนยันอีเมล",
  invalid_input: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
  confirmation_failed: "ลิงก์ยืนยันไม่ถูกต้อง หมดอายุ หรือถูกใช้แล้ว",
  recovery_session_required: "กรุณาเปิดลิงก์ตั้งรหัสผ่านล่าสุดจากอีเมลก่อน",
  signup_failed: "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่ภายหลัง",
};

export function AuthCard({
  mode,
  next,
  message,
  error,
}: {
  mode: "login" | "register" | "forgot";
  next?: string;
  message?: string;
  error?: string;
}) {
  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const returnQuery = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <div className="auth-shell">
      <div className="auth-introduction">
        <p className="design-eyebrow">พื้นที่การเรียนรู้สำหรับครู</p>
        <h2>ไอเดียดี ๆ<br />กำลังรอคุณอยู่</h2>
        <p>รวมสื่อที่คุณชอบไว้ในที่เดียว<br />พร้อมหยิบไปใช้ในห้องเรียนครั้งต่อไป</p>
        <LearningScene compact />
      </div>
      <div className="auth-surface">
        <div>
          <Image src="/brand/logo.svg" alt="KruPo คลังสื่อ" width={150} height={40} />
          <h1 className="mt-6 text-2xl font-semibold text-[#142C55]">
            {isLogin ? "เข้าสู่ระบบ" : isRegister ? "สมัครสมาชิก" : "ลืมรหัสผ่าน"}
          </h1>
          <p className="mt-2 text-sm text-[#66758A]">
            {mode === "forgot" ? "เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้คุณ" : "เข้าสู่โลกการเรียนรู้ เก็บสื่อที่ชอบไว้กับคุณ"}
          </p>
        </div>

        {message && (
          <p className="mt-6 rounded-xl border border-[#BFE9D8] bg-[#F0FBF7] p-4 text-sm text-[#176B50]" role="status">
            {messageLabels[message] ?? "ดำเนินการเรียบร้อยแล้ว"}
          </p>
        )}
        {error && (
          <p className="mt-6 rounded-xl border border-[#F4BBB5] bg-[#FFF1F0] p-4 text-sm text-[#8A1C13]" role="alert">
            {errorLabels[error] ?? "ไม่สามารถดำเนินการได้ กรุณาลองใหม่"}
          </p>
        )}

        <form method="post" action={`/api/auth/${mode}`} className="mt-8 grid gap-5">
          {next && <input type="hidden" name="next" value={next} />}
          {isRegister && (
            <label className="grid gap-2 text-sm font-bold">
              ชื่อที่แสดง
              <input required name="displayName" autoComplete="name" className="field" placeholder="เช่น ครูสมชาย" />
            </label>
          )}
          <label className="grid gap-2 text-sm font-bold">
            อีเมล
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-[#66758A]" />
              <input required type="email" name="email" autoComplete="email" className="field pl-12" placeholder="name@example.com" />
            </div>
          </label>
          {mode !== "forgot" && <PasswordField isLogin={isLogin} />}
          {isLogin && <Link href={`/forgot-password${returnQuery}`} className="justify-self-end text-sm font-medium text-[#315DDC]">ลืมรหัสผ่าน?</Link>}
          {isRegister && (
            <label className="flex items-start gap-3 text-sm leading-6 text-[#66758A]">
              <input required type="checkbox" className="mt-1" />
              ฉันยอมรับ <Link href="/terms" className="font-bold text-[#0F5BD8]">เงื่อนไขการใช้งาน</Link> และนโยบายความเป็นส่วนตัว
            </label>
          )}
          <button className="btn btn-primary w-full" type="submit">
            {isLogin ? "เข้าสู่ระบบ" : isRegister ? "สร้างบัญชี" : "ส่งลิงก์ตั้งรหัสผ่าน"}
          </button>
        </form>

        {mode !== "forgot" && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-[#66758A]"><span className="h-px flex-1 bg-[#E1E8F2]" />หรือ<span className="h-px flex-1 bg-[#E1E8F2]" /></div>
            <a className="btn btn-secondary w-full" href={`/api/auth/google${next ? `?next=${encodeURIComponent(next)}` : ""}`}>เข้าสู่ระบบด้วย Google</a>
          </>
        )}

        <p className="mt-6 text-center text-sm text-[#66758A]">
          {isLogin ? <>ยังไม่มีบัญชี? <Link className="font-bold text-[#315DDC]" href={`/register${returnQuery}`}>สมัครสมาชิก</Link></> : isRegister ? <>มีบัญชีแล้ว? <Link className="font-bold text-[#315DDC]" href={`/login${returnQuery}`}>เข้าสู่ระบบ</Link></> : <Link className="font-bold text-[#315DDC]" href={`/login${returnQuery}`}>กลับไปเข้าสู่ระบบ</Link>}
        </p>
        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[#66758A]"><ShieldCheck className="h-4 w-4 text-[#2FC58D]" />ระบบจะไม่ส่งรหัสผ่านไปยังผู้ดูแล</p>
      </div>
    </div>
  );
}
