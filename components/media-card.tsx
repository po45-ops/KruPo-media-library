import Link from "next/link";
import { ExternalLink, ShieldCheck, Star } from "lucide-react";
import { AddToCartButton, FavoriteButton } from "@/components/user-actions";
import { formatBaht } from "@/server/domain/money";
import type { MediaSummary } from "@/types/domain";

export function MediaCard({ media }: { media: MediaSummary }) {
  return (
    <article className="soft-card group overflow-hidden">
      <div className="relative">
        <Link href={`/media/${media.slug}`} className="block">
          <div
            className="relative grid aspect-[16/10] place-items-center overflow-hidden p-6 text-white"
            style={{ background: media.accent }}
          >
            <div className="dot-grid absolute inset-0 opacity-20" />
            <span className="relative max-w-[16ch] text-center text-xl font-black leading-tight">{media.titleTh}</span>
            {media.demo && (
              <span className="absolute bottom-3 left-3 rounded-full bg-[#14243D]/75 px-2 py-1 text-[10px]">
                ตัวอย่าง • ยังไม่เผยแพร่จริง
              </span>
            )}
          </div>
        </Link>
        <div className="absolute right-3 top-3">
          <FavoriteButton mediaId={media.id} compact />
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/media/${media.slug}`} className="font-extrabold text-[#0B2F6B] group-hover:text-[#0F5BD8]">
              {media.titleTh}
            </Link>
            <p className="mt-1 text-xs text-[#66758A]">โดย {media.creator}</p>
          </div>
          <span className="badge bg-[#EEF4FF] text-[#0F5BD8]">{media.subject}</span>
        </div>
        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-[#66758A]">{media.descriptionTh}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#66758A]">
          <span>{media.grade}</span><span>•</span><span>{media.mediaType}</span>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className={`badge ${media.accessType === "free" ? "bg-[#DDF7EC] text-[#13845B]" : "bg-[#EEF4FF] text-[#0F5BD8]"}`}>
            {formatBaht(media.priceSatang)}
          </span>
          <span className="flex items-center gap-1 text-xs text-[#66758A]">
            <Star className="h-4 w-4 fill-[#F6B73C] text-[#F6B73C]" />{media.rating}
            <ShieldCheck className="ml-1 h-4 w-4 text-[#2FC58D]" />
          </span>
        </div>
        <div className="mt-4 flex items-start justify-between gap-2 border-t border-[#E1E8F2] pt-3">
          <Link href={`/media/${media.slug}`} className="btn min-h-11 px-3 text-sm text-[#0F5BD8] hover:bg-[#EEF4FF]">
            รายละเอียด
          </Link>
          {media.accessType === "free" ? (
            <Link href={`/go/${media.id}`} className="btn btn-primary min-h-11 px-3 text-sm">
              <ExternalLink className="h-4 w-4" />เปิดสื่อ
            </Link>
          ) : (
            <AddToCartButton mediaId={media.id} compact />
          )}
        </div>
      </div>
    </article>
  );
}
