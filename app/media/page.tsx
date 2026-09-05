import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
import { CatalogFilters } from "@/components/catalog-filters";
import { MediaCard } from "@/components/media-card";
import { listPublishedMedia } from "@/server/repositories/catalog-repository";

export const metadata:Metadata={title:"สื่อทั้งหมด",description:"ค้นหาและกรองสื่อการเรียนรู้ภาษาไทยตามวิชา ระดับชั้น ประเภท ราคา และผู้สร้าง"};

export default async function MediaPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=await searchParams;
  const q=String(params.q||"").trim();
  const selectedSubject=String(params.subject||"");
  const price=String(params.price||"");
  const results=await listPublishedMedia({q,subject:selectedSubject||undefined,price:price==="free"||price==="paid"?price:undefined,limit:60});
  return <div className="container-page py-8">
    <div className="rounded-[26px] bg-gradient-to-r from-[#EEF4FF] to-[#F1EDFF] p-7 md:p-10"><h1 className="text-3xl font-black text-[#0B2F6B] md:text-4xl">สื่อทั้งหมด</h1><p className="mt-2 text-[#66758A]">ค้นหาสื่อที่เหมาะกับวิชา ระดับชั้น และห้องเรียนของคุณ</p></div>
    <details className="soft-card mt-5 p-4 lg:hidden"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-extrabold text-[#0B2F6B]"><SlidersHorizontal className="h-5 w-5"/>เปิดตัวกรอง</summary><div className="mt-4 border-t border-[#E1E8F2] pt-4"><CatalogFilters q={q} subject={selectedSubject} price={price}/></div></details>
    <div className="mt-7 grid gap-6 lg:grid-cols-[250px_1fr]">
      <aside className="soft-card hidden h-fit p-5 lg:block"><h2 className="mb-5 flex items-center gap-2 font-extrabold text-[#0B2F6B]"><SlidersHorizontal className="h-5 w-5"/>ตัวกรอง</h2><CatalogFilters q={q} subject={selectedSubject} price={price}/></aside>
      <section><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="font-bold text-[#0B2F6B]">พบ {results.length.toLocaleString("th-TH")} รายการ</p><label className="flex items-center gap-2 text-sm">เรียงตาม<select className="field min-w-40" defaultValue="new"><option value="new">ใหม่ล่าสุด</option><option value="popular">ยอดนิยม</option><option value="rating">คะแนน</option><option value="price-low">ราคาต่ำ</option><option value="price-high">ราคาสูง</option></select></label></div>
        {results.length?<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.map((media)=><MediaCard key={media.id} media={media}/>)}</div>:<div className="soft-card grid min-h-72 place-items-center p-10 text-center"><div><p className="text-4xl">🔎</p><h2 className="mt-3 text-xl font-extrabold text-[#0B2F6B]">ยังไม่พบสื่อที่ตรงกัน</h2><p className="mt-2 text-[#66758A]">ลองลดตัวกรองหรือใช้คำค้นที่สั้นลง</p></div></div>}
      </section>
    </div>
  </div>;
}
