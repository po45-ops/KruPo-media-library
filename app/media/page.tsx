import type { Metadata } from "next";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { CatalogFilters } from "@/components/catalog-filters";
import { CatalogSortSelect } from "@/components/catalog-sort-select";
import { MediaCard } from "@/components/media-card";
import { listPublishedMedia } from "@/server/repositories/catalog-repository";
import { parseCatalogSort } from "@/features/catalog/sort";

export const metadata: Metadata = {
  title: "สื่อทั้งหมด",
  description: "ค้นหาและกรองสื่อการเรียนรู้ภาษาไทยตามวิชา ระดับชั้น ประเภท ราคา และผู้สร้าง",
};

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = String(params.q || "").trim();
  const selectedSubject = String(params.subject || "");
  const price = String(params.price || "");
  const sort = parseCatalogSort(String(params.sort || ""));
  const results = await listPublishedMedia({
    q,
    subject: selectedSubject || undefined,
    price: price === "free" || price === "paid" ? price : undefined,
    limit: 60,
    sort,
  });

  return (
    <div className="container-page py-8">
      {/* Netflix Cinematic Header Banner */}
      <div className="rounded-[24px] bg-gradient-to-r from-[#1c121e] via-[#141624] to-[#0e1017] p-7 md:p-10 border border-white/10 shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
        <p className="design-eyebrow flex items-center gap-2">KRUPO CATALOG · คลังสื่อการสอนทั้งหมด</p>
        <h1 className="text-3xl font-black text-[#FFFFFF] md:text-4xl tracking-tight">สื่อทั้งหมด</h1>
        <p className="mt-2 text-[#94A3B8]">ค้นหาสื่อที่เหมาะกับวิชา ระดับชั้น และห้องเรียนของคุณ</p>
      </div>

      <details className="soft-card mt-5 p-4 lg:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-extrabold text-[#FFFFFF]">
          <SlidersHorizontal className="h-5 w-5 text-[#E50914]" />
          เปิดตัวกรอง
        </summary>
        <div className="mt-4 border-t border-white/10 pt-4">
          <CatalogFilters q={q} subject={selectedSubject} price={price} />
        </div>
      </details>

      <div className="mt-7 grid gap-6 lg:grid-cols-[250px_1fr]">
        <aside className="soft-card hidden h-fit p-5 lg:block border border-white/10">
          <h2 className="mb-5 flex items-center gap-2 font-extrabold text-[#FFFFFF]">
            <SlidersHorizontal className="h-5 w-5 text-[#E50914]" />
            ตัวกรอง
          </h2>
          <CatalogFilters q={q} subject={selectedSubject} price={price} />
        </aside>

        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="font-bold text-[#FFFFFF]">
              พบ <span className="text-[#E50914]">{results.length.toLocaleString("th-TH")}</span> รายการ
            </p>
            <CatalogSortSelect defaultValue={sort} q={q} subject={selectedSubject} price={price} />
          </div>

          {results.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((media) => (
                <MediaCard key={media.id} media={media} />
              ))}
            </div>
          ) : (
            <div className="soft-card grid min-h-72 place-items-center p-10 text-center border border-white/10">
              <div>
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-[#E50914]">
                  <SearchX className="h-7 w-7" />
                </span>
                <h2 className="mt-4 text-xl font-extrabold text-[#FFFFFF]">ยังไม่พบสื่อที่ตรงกัน</h2>
                <p className="mt-2 text-[#94A3B8]">ลองลดตัวกรองหรือใช้คำค้นที่สั้นลง</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
