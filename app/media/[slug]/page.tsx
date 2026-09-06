import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Copy, ExternalLink, MessageCircle, Share2, ShieldCheck, Star } from "lucide-react";
import { MediaCard } from "@/components/media-card";
import { AddToCartButton, FavoriteButton } from "@/components/user-actions";
import { formatBaht } from "@/server/domain/money";
import { getPublishedMediaBySlug, listPublishedMedia } from "@/server/repositories/catalog-repository";

const Facebook = MessageCircle;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const media = await getPublishedMediaBySlug(slug);
  if (!media) return { title: "ไม่พบสื่อ" };
  return {
    title: media.titleTh,
    description: media.descriptionTh,
    alternates: { canonical: `/media/${slug}` },
    openGraph: { title: media.titleTh, description: media.descriptionTh, type: "article" },
  };
}

export default async function MediaDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const media = await getPublishedMediaBySlug(slug);
  if (!media) notFound();
  const related = await listPublishedMedia({ excludeId: media.id, limit: 4 });

  return (
    <div className="container-page py-8">
      <nav className="mb-5 text-sm text-[#66758A]" aria-label="breadcrumb">
        <Link href="/">หน้าแรก</Link> / <Link href="/media">สื่อทั้งหมด</Link> / <span>{media.titleTh}</span>
      </nav>
      <div className="grid gap-8 lg:grid-cols-[1fr_.88fr]">
        <section>
          <div className="grid aspect-[16/10] place-items-center rounded-[28px] p-10 text-white shadow-xl" style={{ background: media.accent }}>
            <p aria-hidden="true" className="max-w-[16ch] text-center text-4xl font-black md:text-5xl">{media.titleTh}</p>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {["หน้าปก", "ตัวอย่าง 1", "ตัวอย่าง 2", "วิธีใช้"].map((label, index) => (
              <div
                key={label}
                className={`grid aspect-[4/3] place-items-center rounded-xl border text-xs ${index === 0 ? "border-[#0F5BD8] bg-[#EEF4FF] text-[#0F5BD8]" : "border-[#E1E8F2] bg-white text-[#66758A]"}`}
              >
                {label}
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex flex-wrap gap-2">
            <span className="badge bg-[#DDF7EC] text-[#13845B]">{media.subject}</span>
            <span className="badge bg-[#EEF4FF] text-[#0F5BD8]">{media.grade}</span>
            <span className="badge bg-[#F1EDFF] text-[#6554E8]">{media.mediaType}</span>
          </div>
          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-[#0B2F6B] md:text-4xl">{media.titleTh}</h1>
              <p className="mt-2 text-[#66758A]">โดย {media.creator}</p>
            </div>
            <FavoriteButton mediaId={media.id} compact />
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 font-bold"><Star className="h-5 w-5 fill-[#F6B73C] text-[#F6B73C]" />{media.rating}</span>
            <span className="text-[#66758A]">ขายแล้ว {media.salesCount.toLocaleString("th-TH")} ครั้ง</span>
          </div>
          <p className="mt-6 leading-8 text-[#44546B]">
            {media.descriptionTh} ออกแบบเพื่อให้ครูเริ่มใช้งานได้ง่ายทั้งในห้องเรียนและการเรียนรู้ที่บ้าน
          </p>
          <div className="mt-6 rounded-2xl border border-[#E1E8F2] bg-[#FAFCFF] p-5">
            <h2 className="font-extrabold text-[#0B2F6B]">สิ่งที่จะได้รับ</h2>
            <ul className="mt-3 grid gap-2 text-sm text-[#44546B]">
              {["สิทธิ์เปิดสื่อผ่านบัญชี KruPo", "คู่มือใช้งานสำหรับครู", "ประวัติการอัปเดตและสถานะลิงก์"].map((item) => (
                <li className="flex gap-2" key={item}><Check className="h-5 w-5 text-[#2FC58D]" />{item}</li>
              ))}
            </ul>
          </div>
          <div className="soft-card mt-6 p-6">
            <p className="text-sm font-bold text-[#66758A]">ราคา</p>
            <p className="mt-1 text-4xl font-black text-[#159665]">{formatBaht(media.priceSatang)}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {media.accessType === "free" ? (
                <Link href={`/go/${media.id}`} className="btn btn-primary sm:col-span-2">
                  <ExternalLink className="h-5 w-5" />เล่นฟรี
                </Link>
              ) : (
                <>
                  <AddToCartButton mediaId={media.id} />
                  <Link href="/cart" className="btn btn-primary">ปลดล็อก</Link>
                </>
              )}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-[#66758A]">
              <ShieldCheck className="h-4 w-4 text-[#2FC58D]" />{media.protection} • ตรวจสิทธิ์ก่อนเปิดทุกครั้ง
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">แชร์:</span>
            <button className="btn btn-secondary px-3" aria-label="คัดลอกลิงก์"><Copy className="h-4 w-4" /></button>
            <button className="btn btn-secondary px-3" aria-label="แชร์ Facebook"><Facebook className="h-4 w-4" /></button>
            <button className="btn btn-secondary px-3" aria-label="แชร์ผ่านระบบของอุปกรณ์"><Share2 className="h-4 w-4" /></button>
          </div>
        </section>
      </div>

      <section className="mt-14">
        <div className="flex items-center justify-between">
          <h2 className="section-title">สื่อที่เกี่ยวข้อง</h2>
          <Link href="/media" className="font-bold text-[#0F5BD8]">ดูทั้งหมด</Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {related.map((item) => <MediaCard key={item.id} media={item} />)}
        </div>
      </section>
    </div>
  );
}
