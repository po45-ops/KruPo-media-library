"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";

export function PasswordField({ isLogin }: { isLogin: boolean }) {
  const [visible, setVisible] = useState(false);
  return <div className="grid gap-2 text-sm font-semibold"><label htmlFor="auth-password">รหัสผ่าน</label><div className="relative">
    <LockKeyhole className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[#66758A]" aria-hidden="true" />
    <input id="auth-password" required minLength={10} type={visible ? "text" : "password"} name="password" autoComplete={isLogin ? "current-password" : "new-password"} className="field auth-password" placeholder="อย่างน้อย 10 ตัวอักษร" />
    <button type="button" className="password-toggle" aria-label={visible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
  </div></div>;
}
