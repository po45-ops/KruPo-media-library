import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Bookmark,
  CalendarDays,
  Download,
  ExternalLink,
  History,
  Mail,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { requirePrincipal } from "@/server/auth/principal";
import {
  getFavoriteItems,
  getLibraryItems,
  getPurchaseHistory,
  getUserProfile,
} from "@/server/repositories/user-data-repository";

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

function formatAccountDate(value: string | null) {
  if (!value) return "บัญชีทดสอบภายในเครื่อง";
  return `สมาชิกตั้งแต่ ${new Intl.DateTimeFormat("th-TH", {
    dateStyle: "long",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value))}`;
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
  searchParams: Promise<{ filter?: string; sort?: string }>;
}) {
  const principal = await requirePrincipal("/my-library");
  const [items, favorites, orders, profile, params] = await Promise.all([
    getLibraryItems(principal.userId),
    getFavoriteItems(principal.userId),
    getPurchaseHistory(principal.userId),
    getUserProfile(principal.userId, principal.email),
    searchParams,
  ]);
  const activeFilter = filters.some(([value]) => value === params.filter) ? params.filter ?? "all" : "all";
  const activeSort = params.sort === "title" ? "title" : "newest";
  const visibleItems = items.filter((item) => {
    if (activeFilter === "games") return item.mediaType.includes("เกม");
    if (activeFilter === "worksheets") return item.mediaType.includes("ใบงาน") || item.mediaType.includes("แบบฝึก");
    if (activeFilter === "powerpoint") return item.mediaType.toLowerCase().includes("powerpoint");
    if (activeFilter === "purchased") return item.source === "purchase";
    if (activeFilter === "free") return item.source === "free_claim" || item.accessType === "free";
    return true;
  }).sort((a, b) => activeSort === "title"
    ? a.titleTh.localeCompare(b.titleTh, "th")
    : new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime());
  const hasDevelopmentFixtures = items.some((item) => item.source === "development_fixture");
  const purchasedCount = items.filter((item) => item.source === "purchase" || item.source === "development_fixture").length;
  const summary = [
    ["สื่อที่ใช้งานได้", items.length, BookOpen, "สิทธิ์ยังไม่ถูกเพิกถอน"],
    ["สื่อที่ซื้อแล้ว", purchasedCount, ShoppingBag, "สิทธิ์ผูกกับรหัสผู้ใช้"],
    ["รายการโปรด", favorites.length, Bookmark, "เปิดดูได้จากทุกอุปกรณ์"],
    ["ประวัติการซื้อ", orders.length, History, "คำสั่งซื้อล่าสุด 100 รายการ"],
  ] as const;

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-r from-[#EAF3FF] via-[#F3F5FF] to-[#E9F9F5] p-6 sm:p-9">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-[#6554E8]/10" />
        <div className="absolute bottom-[-80px] right-20 h-40 w-40 rounded-full bg-[#2FC58D]/10" />
        <div className="relative flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white text-[#0F5BD8] shadow-sm sm:h-20 sm:w-20">
            <UserRound className="h-9 w-9" />
          </span>
          <div>
            <p className="font-bold text-[#0F5BD8]">ยินดีต้อนรับกลับ</p>
            <h1 className="mt-1 text-2xl font-black text-[#0B2F6B] sm:text-3xl">สวัสดี, {profile.displayName} 👋</h1>
            <p className="mt-1 text-sm text-[#66758A] sm:text-base">จัดการสื่อ สิทธิ์การใช้งาน และประวัติของคุณได้ในที่เดียว</p>
          </div>
        </div>
      </div>

      <nav className="mt-5 flex gap-2 overflow-x-auto border-b border-[#E1E8F2] pb-3" aria-label="เมนูสมาชิก">
        <Link href="/my-library" className="btn btn-primary whitespace-nowrap"><BookOpen className="h-4 w-4" />สื่อของฉัน</Link>
        <Link href="/favorites" className="btn btn-secondary whitespace-nowrap"><Bookmark className="h-4 w-4" />รายการโปรด</Link>
        <Link href="/orders" className="btn btn-secondary whitespace-nowrap"><History className="h-4 w-4" />ประวัติการซื้อ</Link>
        <Link href="/account" className="btn btn-secondary whitespace-nowrap"><UserRound className="h-4 w-4" />ข้อมูลบัญชี</Link>
      </nav>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="สรุปคลังสื่อ">
        {summary.map(([label, value, Icon, description]) => (
          <div className="soft-card flex items-start gap-4 p-5" key={label}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#EEF4FF] text-[#0F5BD8]"><Icon className="h-5 w-5" /></span>
            <div><p className="text-sm font-bold text-[#44546B]">{label}</p><p className="mt-1 text-2xl font-black text-[#0B2F6B]">{value.toLocaleString("th-TH")} <span className="text-sm font-bold text-[#66758A]">รายการ</span></p><p className="mt-1 text-xs text-[#66758A]">{description}</p></div>
          </div>
        ))}
      </section>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full gap-2 overflow-x-auto pb-2" aria-label="ตัวกรองคลังสื่อ">
        {filters.map(([value, label]) => (
          <Link
            href={value === "all" ? "/my-library" : `/my-library?filter=${value}`}
            key={value}
            className={`btn whitespace-nowrap ${activeFilter === value ? "btn-primary" : "btn-secondary"}`}
          >
            {label}
          </Link>
        ))}
        </div>
        <div className="flex gap-2 text-sm">
          <Link className={`btn ${activeSort === "newest" ? "btn-primary" : "btn-secondary"}`} href={activeFilter === "all" ? "/my-library" : `/my-library?filter=${activeFilter}`}>ล่าสุด</Link>
          <Link className={`btn ${activeSort === "title" ? "btn-primary" : "btn-secondary"}`} href={`/my-library?filter=${activeFilter}&sort=title`}>ชื่อ ก–ฮ</Link>
        </div>
      </div>

      {hasDevelopmentFixtures && (
        <p className="mt-4 rounded-xl border border-[#F4D78D] bg-[#FFF9E9] p-3 text-sm text-[#7A5710]">
          รายการนี้เป็นข้อมูลทดสอบภายในเครื่องเท่านั้น Staging และ Production จะแสดงเฉพาะสิทธิ์จากฐานข้อมูล
        </p>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      {visibleItems.length ? (
        <div className="soft-card divide-y divide-[#E1E8F2] p-2 sm:p-3">
          {visibleItems.map((media) => {
            const grantedAt = formatGrantedAt(media.grantedAt);
            return (
              <article key={media.id} className="flex flex-wrap items-center gap-3 p-3 sm:gap-4 sm:p-4">
                <Link
                  href={`/media/${media.slug}`}
                  className="grid h-20 w-24 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#0B2F6B] to-[#6554E8] p-2 text-center text-xs font-black text-white sm:w-28"
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
                <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                  {media.deliveryType !== "file" && (
                    <Link className="btn btn-secondary flex-1 whitespace-nowrap sm:flex-none" href={`/go/${media.id}`}>
                      <ExternalLink className="h-4 w-4" />เปิดสื่อ
                    </Link>
                  )}
                  {media.deliveryType !== "external_link" && (
                    <a className="btn btn-secondary flex-1 whitespace-nowrap sm:flex-none" href={`/api/media/${media.id}/download`}>
                      <Download className="h-4 w-4" />ดาวน์โหลด
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div>
          <EmptyState
            icon="📚"
            title={items.length ? "ไม่พบสื่อในหมวดนี้" : "ยังไม่มีสื่อในคลังของคุณ"}
            description={items.length ? "ลองเลือกหมวดอื่นหรือดูสื่อทั้งหมด" : "สื่อจะปรากฏที่นี่หลังได้รับสิทธิ์จากการซื้อ สื่อฟรี หรือผู้ดูแลระบบ"}
          />
        </div>
      )}
        <aside className="grid gap-4">
          <section className="soft-card p-6">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#EEF4FF] text-[#0F5BD8]"><UserRound className="h-8 w-8" /></span>
            <h2 className="mt-4 text-center text-lg font-black text-[#0B2F6B]">{profile.displayName}</h2>
            <div className="mt-5 grid gap-3 border-t border-[#E1E8F2] pt-5 text-sm text-[#66758A]">
              <p className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0" /><span className="break-all">{profile.email ?? "ยังไม่มีอีเมล"}</span></p>
              <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />{formatAccountDate(profile.createdAt)}</p>
            </div>
            <Link className="btn btn-secondary mt-5 w-full" href="/account">แก้ไขโปรไฟล์</Link>
          </section>
          <section className="rounded-2xl border border-[#B8D2FA] bg-[#F5F9FF] p-5">
            <h2 className="font-black text-[#0B2F6B]">สิทธิ์เป็นของบัญชีคุณ</h2>
            <p className="mt-2 text-sm leading-6 text-[#66758A]">KruPo ตรวจสิทธิ์จากรหัสผู้ใช้ทุกครั้งก่อนเปิดเกมหรือดาวน์โหลดสื่อ ไม่ได้ผูกสิทธิ์กับอีเมลเพียงอย่างเดียว</p>
          </section>
          <Link className="btn btn-primary w-full" href="/media">ค้นหาสื่อเพิ่มเติม</Link>
        </aside>
      </div>
    </div>
  );
}
