import type { Metadata } from "next";
import Link from "next/link";
import { FavoriteButton } from "@/components/user-actions";
import { EmptyState } from "@/components/empty-state";
import { MediaArtwork } from "@/components/media-artwork";
import { Heart } from "lucide-react";
import { requirePrincipal } from "@/server/auth/principal";
import { formatBaht } from "@/server/domain/money";
import { getFavoriteItems } from "@/server/repositories/user-data-repository";

export const metadata: Metadata = { title: "รายการโปรด", robots: { index: false, follow: false } };

export default async function Page() {
  const principal = await requirePrincipal("/favorites");
  const items = await getFavoriteItems(principal.userId);

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-black text-[#0B2F6B]">รายการโปรด</h1>
      <p className="mb-7 mt-2 text-[#66758A]">กลับมาหาสื่อที่บันทึกไว้ได้ง่าย รายการนี้อ่านจากบัญชีของคุณเท่านั้น</p>
      {items.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((media) => (
            <article className="soft-card overflow-hidden" key={media.id}>
              <div className="relative">
                <Link
                  href={`/media/${media.slug}`}
                  aria-label={`ดูสื่อ ${media.titleTh}`}
                  className="block overflow-hidden"
                >
                  <MediaArtwork title={media.titleTh} subject={media.subject} mediaType={media.mediaType} className="aspect-[16/9]" />
                </Link>
                <div className="absolute right-3 top-3">
                  <FavoriteButton mediaId={media.id} initialFavorite compact />
                </div>
              </div>
              <div className="p-5">
                <Link href={`/media/${media.slug}`} className="font-extrabold text-[#0B2F6B] hover:text-[#0F5BD8]">
                  {media.titleTh}
                </Link>
                <p className="mt-2 line-clamp-2 text-sm text-[#66758A]">{media.descriptionTh}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-[#66758A]">{media.subject} • {media.grade}</span>
                  <strong className="text-[#159665]">{formatBaht(media.priceSatang)}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Heart />} title="ยังไม่มีรายการโปรด" description="กดรูปหัวใจบนสื่อที่สนใจเพื่อเก็บไว้ที่นี่" />
      )}
    </div>
  );
}
