import type { Metadata } from "next";
import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { requirePrincipal } from "@/server/auth/principal";
import { getLibraryItems } from "@/server/repositories/user-data-repository";

export const metadata: Metadata = { title: "คลังของฉัน", robots: { index: false, follow: false } };

const sourceLabel: Record<string, string> = {
  purchase: "ซื้อแล้ว",
  free_claim: "สื่อฟรี",
  admin_grant: "ได้รับสิทธิ์จากผู้ดูแล",
  development_fixture: "สิทธิ์ตัวอย่างภายในเครื่อง",
};

function formatGrantedAt(value: string) {
  if (value === new Date(0).toISOString()) return null;
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

const filters = [
  ["all", "ทั้งหมด"],
  ["games", "เกม"],
  ["worksheets", "ใบงาน"],
  ["powerpoint", "PowerPoint"],
  ["purchased", "ซื้อแล้ว"],
  ["free", "ฟรี"],
] as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const principal = await requirePrincipal("/my-library");
  const [items, params] = await Promise.all([getLibraryItems(principal.userId), searchParams]);
  const activeFilter = filters.some(([value]) => value === params.filter) ? params.filter ?? "all" : "all";
  const visibleItems = items.filter((item) => {
    if (activeFilter === "games") return item.mediaType.includes("เกม");
    if (activeFilter === "worksheets") return item.mediaType.includes("ใบงาน") || item.mediaType.includes("แบบฝึก");
    if (activeFilter === "powerpoint") return item.mediaType.toLowerCase().includes("powerpoint");
    if (activeFilter === "purchased") return item.source === "purchase";
    if (activeFilter === "free") return item.source === "free_claim" || item.accessType === "free";
    return true;
  });
  const hasDevelopmentFixtures = items.some((item) => item.source === "development_fixture");

  return (
    <div className="container-page py-10">
      <div className="rounded-[28px] bg-gradient-to-r from-[#EEF4FF] to-[#E9F9F5] p-8">
        <p className="font-bold text-[#0F5BD8]">ยินดีต้อนรับกลับ</p>
        <h1 className="mt-1 text-3xl font-black text-[#0B2F6B]">คลังสื่อของฉัน</h1>
        <p className="mt-2 text-[#66758A]">สิทธิ์ที่ซื้อหรือได้รับจะผูกกับรหัสผู้ใช้ของบัญชีคุณ</p>
      </div>

      <div className="mt-7 flex gap-2 overflow-x-auto pb-2" aria-label="ตัวกรองคลังสื่อ">
        {filters.map(([value, label]) => (
          <Link
            href={value === "all" ? "/my-library" : `/my-library?filter=${value}`}
            key={value}
            className={`btn whitespace-nowrap ${activeFilter === value ? "btn-primary" : "btn-secondary"}`}
          >
            {label}
          </Link>
        ))}
        <Link href="/favorites" className="btn btn-secondary whitespace-nowrap">รายการโปรด</Link>
      </div>

      {hasDevelopmentFixtures && (
        <p className="mt-4 rounded-xl border border-[#F4D78D] bg-[#FFF9E9] p-3 text-sm text-[#7A5710]">
          รายการนี้เป็นข้อมูลทดสอบภายในเครื่องเท่านั้น Staging และ Production จะแสดงเฉพาะสิทธิ์จากฐานข้อมูล
        </p>
      )}

      {visibleItems.length ? (
        <div className="soft-card mt-6 divide-y divide-[#E1E8F2] p-3">
          {visibleItems.map((media) => {
            const grantedAt = formatGrantedAt(media.grantedAt);
            return (
              <article key={media.id} className="flex flex-wrap items-center gap-4 p-4">
                <Link
                  href={`/media/${media.slug}`}
                  className="grid h-20 w-28 place-items-center rounded-xl bg-gradient-to-br from-[#0B2F6B] to-[#6554E8] p-2 text-center text-xs font-black text-white"
                >
                  {media.titleTh}
                </Link>
                <div className="min-w-44 flex-1">
                  <Link href={`/media/${media.slug}`} className="font-extrabold text-[#0B2F6B] hover:text-[#0F5BD8]">
                    {media.titleTh}
                  </Link>
                  <p className="mt-1 text-sm text-[#66758A]">{media.subject} • {media.grade}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="badge bg-[#DDF7EC] text-[#13845B]">{sourceLabel[media.source] ?? "มีสิทธิ์ใช้งาน"}</span>
                    {grantedAt && <span className="text-xs text-[#66758A]">ได้รับสิทธิ์ {grantedAt}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {media.deliveryType !== "file" && (
                    <Link className="btn btn-secondary" href={`/go/${media.id}`}>
                      <ExternalLink className="h-4 w-4" />เปิดสื่อ
                    </Link>
                  )}
                  {media.deliveryType !== "external_link" && (
                    <a className="btn btn-secondary" href={`/api/media/${media.id}/download`}>
                      <Download className="h-4 w-4" />ดาวน์โหลด
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon="📚"
            title={items.length ? "ไม่พบสื่อในหมวดนี้" : "ยังไม่มีสื่อในคลังของคุณ"}
            description={items.length ? "ลองเลือกหมวดอื่นหรือดูสื่อทั้งหมด" : "สื่อจะปรากฏที่นี่หลังได้รับสิทธิ์จากการซื้อ สื่อฟรี หรือผู้ดูแลระบบ"}
          />
        </div>
      )}
    </div>
  );
}
