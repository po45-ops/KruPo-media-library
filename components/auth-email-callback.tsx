"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useRef, useState } from "react";

export function AuthEmailCallback({ url, publishableKey, next }: { url: string; publishableKey: string; next: string }) {
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = fragment.get("access_token");
    const refreshToken = fragment.get("refresh_token");
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

    void (async () => {
      if (!accessToken || !refreshToken) throw new Error("missing confirmation session");
      const client = createBrowserClient(url, publishableKey);
      const { error } = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) throw error;
      const finalized = await fetch("/api/auth/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        cache: "no-store",
      });
      if (!finalized.ok) throw new Error("server confirmation failed");
      window.location.replace(next);
    })().catch(() => setFailed(true));
  }, [next, publishableKey, url]);

  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-12">
      <div className="soft-card max-w-lg p-8 text-center">
        <h1 className="text-2xl font-black text-[#0B2F6B]">{failed ? "ยืนยันอีเมลไม่สำเร็จ" : "กำลังยืนยันอีเมล"}</h1>
        <p className="mt-3 text-[#66758A]">
          {failed ? "ลิงก์อาจหมดอายุหรือถูกใช้แล้ว กรุณาสมัครใหม่หรือติดต่อทีมงาน" : "กรุณารอสักครู่ ระบบกำลังสร้าง session ที่ปลอดภัยให้บัญชีของคุณ"}
        </p>
        {failed && <a className="btn btn-primary mt-6" href="/login?error=confirmation_failed">กลับไปเข้าสู่ระบบ</a>}
      </div>
    </div>
  );
}
