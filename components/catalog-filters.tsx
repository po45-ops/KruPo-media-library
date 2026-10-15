import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { subjects } from "@/features/catalog/demo-media";

export function CatalogFilters({ q, subject, price }: { q: string; subject: string; price: string }) {
  const hasFilter = Boolean(q || subject || price);
  return (
    <form className="grid gap-4" action="/media">
      <label className="grid gap-2 text-sm font-bold text-[#FFFFFF]">
        คำค้น
        <input name="q" defaultValue={q} className="field mt-1" placeholder="ชื่อ วิชา ผู้สร้าง" />
      </label>

      <fieldset>
        <legend className="text-sm font-bold text-[#FFFFFF]">วิชา</legend>
        <div className="mt-1.5 space-y-0.5">
          <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#E2E8F0] hover:bg-white/10 cursor-pointer transition-colors">
            <input type="radio" name="subject" value="" defaultChecked={!subject} className="accent-[#E50914]" />
            ทุกวิชา
          </label>
          {subjects.map((item) => (
            <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#E2E8F0] hover:bg-white/10 cursor-pointer transition-colors" key={item}>
              <input type="radio" name="subject" value={item} defaultChecked={subject === item} className="accent-[#E50914]" />
              {item}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-bold text-[#FFFFFF]">ราคา</legend>
        <div className="mt-1.5 space-y-0.5">
          <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#E2E8F0] hover:bg-white/10 cursor-pointer transition-colors">
            <input type="radio" name="price" value="" defaultChecked={!price} className="accent-[#E50914]" />
            ทั้งหมด
          </label>
          <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#E2E8F0] hover:bg-white/10 cursor-pointer transition-colors">
            <input type="radio" name="price" value="free" defaultChecked={price === "free"} className="accent-[#E50914]" />
            ฟรี
          </label>
          <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#E2E8F0] hover:bg-white/10 cursor-pointer transition-colors">
            <input type="radio" name="price" value="paid" defaultChecked={price === "paid"} className="accent-[#E50914]" />
            สื่อเสียเงิน
          </label>
        </div>
      </fieldset>

      <div className="pt-2 flex flex-col gap-2">
        <button className="btn btn-primary w-full text-sm" type="submit">
          ใช้ตัวกรอง
        </button>
        {hasFilter && (
          <Link href="/media" className="flex items-center justify-center gap-1.5 py-1.5 text-xs text-[#94A3B8] hover:text-[#FFFFFF] transition-colors">
            <RotateCcw size={13} /> ล้างตัวกรองทั้งหมด
          </Link>
        )}
      </div>
    </form>
  );
}
