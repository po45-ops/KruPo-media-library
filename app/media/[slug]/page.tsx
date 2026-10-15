import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, Check, ExternalLink, ShieldCheck, Star } from "lucide-react";
import { ShareMedia } from "@/components/share-media";
import { MediaArtwork } from "@/components/media-artwork";
import { MediaCard } from "@/components/media-card";
import { AddToCartButton, FavoriteButton } from "@/components/user-actions";
import { formatBaht } from "@/server/domain/money";
import { getPublishedMediaBySlug, listPublishedMedia } from "@/server/repositories/catalog-repository";


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
          <MediaArtwork
            title={media.titleTh}
            subject={media.subject}
            mediaType={media.mediaType}
            accent={media.accent}
            className="aspect-[16/10] rounded-[28px] shadow-xl"
          />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              [BookOpen, media.grade],
              [ShieldCheck, media.protection],
              [ExternalLink, media.deliveryType === "file" ? "ดาวน์โหลดได้" : "เปิดผ่านลิงก์"],
            ].map(([Icon, label]) => {
              const ItemIcon = Icon as typeof BookOpen;
              return (
                <div key={label as string} className="flex min-w-0 items-center gap-2 rounded-xl border border-[#E1E8F2] bg-white p-3 text-xs font-semibold text-[#44546B] sm:text-sm">
                  <ItemIcon className="h-4 w-4 shrink-0 text-[#0F5BD8]" />
                  <span className="line-clamp-2">{label as string}</span>
                </div>
              );
            })}
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
          <div className="soft-card mt-6 border-[#D9E5F7] bg-gradient-to-br from-white to-[#F7FAFF] p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-[#66758A]">ราคา</p>
                <p className="mt-1 text-3xl font-black leading-none text-[#0B2F6B] sm:text-4xl">{formatBaht(media.priceSatang)}</p>
              </div>
              <span className="pb-0.5 text-right text-xs font-medium text-[#66758A]">ชำระครั้งเดียว<br />สิทธิ์ผูกกับบัญชีคุณ</span>
            </div>
            <div className="mt-5 grid gap-2">
              {media.accessType === "free" ? (
                <Link href={media.deliveryType === "file" ? `/api/media/${media.id}/download` : `/go/${media.id}`} className="btn btn-primary min-h-12 w-full">
                  <ExternalLink className="h-5 w-5" />{media.deliveryType === "file" ? "ดาวน์โหลดฟรี" : "เล่นฟรี"}
                </Link>
              ) : (
                <>
                  <AddToCartButton mediaId={media.id} fullWidth primary />
                  <Link href="/cart" className="btn btn-secondary min-h-12 w-full">ไปที่ตะกร้า</Link>
                </>
              )}
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-[#66758A]">
              <ShieldCheck className="h-4 w-4 text-[#2FC58D]" />{media.protection} • ตรวจสิทธิ์ก่อนเปิดทุกครั้ง
            </p>
          </div>
          <ShareMedia title={media.titleTh} />
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
