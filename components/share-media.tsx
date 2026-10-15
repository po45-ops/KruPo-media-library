"use client";

import { Copy, MessageCircle, Share2 } from "lucide-react";
import { useState } from "react";

export function ShareMedia({ title }: { title: string }) {
  const [message, setMessage] = useState("");
  const url = () => `${window.location.origin}${window.location.pathname}`;
  async function share(native = false) {
    try {
      if (native && navigator.share) await navigator.share({ title, url: url() });
      else { await navigator.clipboard.writeText(url()); setMessage("คัดลอกลิงก์แล้ว"); }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setMessage("คัดลอกไม่สำเร็จ กรุณาคัดลอก URL จากแถบที่อยู่");
    }
  }
  return <div className="mt-5"><div className="flex flex-wrap items-center gap-2"><span className="text-sm text-[#66758A]">แชร์สื่อ</span>
    <button type="button" className="btn btn-secondary px-3" onClick={() => void share()} aria-label="คัดลอกลิงก์"><Copy size={17} /></button>
    <button type="button" className="btn btn-secondary px-3" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`, "_blank", "noopener,noreferrer")} aria-label="แชร์ Facebook"><MessageCircle size={17} /></button>
    <button type="button" className="btn btn-secondary px-3" onClick={() => window.open(`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url())}`, "_blank", "noopener,noreferrer")} aria-label="แชร์ LINE">LINE</button>
    <button type="button" className="btn btn-secondary px-3" onClick={() => void share(true)} aria-label="แชร์ผ่านระบบของอุปกรณ์"><Share2 size={17} /></button>
  </div><p role="status" className="mt-2 text-xs text-[#66758A]">{message}</p></div>;
}
