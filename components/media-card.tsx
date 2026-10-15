import Link from "next/link";
import { ExternalLink, ShieldCheck, Star } from "lucide-react";
import { MediaArtwork } from "@/components/media-artwork";
import { AddToCartButton, FavoriteButton } from "@/components/user-actions";
import { formatBaht } from "@/server/domain/money";
import type { MediaSummary } from "@/types/domain";

export function MediaCard({ media }: { media: MediaSummary }) {
  return (
    <article className="soft-card group flex h-full flex-col overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-[#C7D9F2] hover:shadow-[0_16px_38px_rgba(11,47,107,.12)]">
      <div className="relative">
        <Link href={`/media/${media.slug}`} aria-label={`ดูสื่อ ${media.titleTh}`} className="block overflow-hidden focus-visible:outline-none">
          <MediaArtwork
            title={media.titleTh}
            subject={media.subject}
            mediaType={media.mediaType}
            accent={media.accent}
            className="aspect-[16/10] transition duration-300 group-hover:scale-[1.015]"
          />
          {media.demo && (
            <span className="absolute bottom-3 left-3 rounded-full border border-white/20 bg-[#14243D]/75 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
              ตัวอย่างภายในเครื่อง
            </span>
          )}
        </Link>
        <div className="absolute right-3 top-3">
          <FavoriteButton mediaId={media.id} compact />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/media/${media.slug}`} className="media-card-title line-clamp-2 group-hover:text-[#0F5BD8]">
              {media.titleTh}
            </Link>
            <p className="mt-1 truncate text-xs text-[#66758A]">โดย {media.creator}</p>
          </div>
          <span className="badge max-w-[42%] truncate bg-[#EEF4FF] text-[#0F5BD8]">{media.subject}</span>
        </div>
        <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-[#66758A]">{media.descriptionTh}</p>
        <div className="mt-3 flex min-h-5 flex-wrap items-center gap-2 text-xs text-[#66758A]">
          <span>{media.grade}</span><span>•</span><span>{media.mediaType}</span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-4">
          <span className={`badge text-sm ${media.accessType === "free" ? "bg-[#DDF7EC] text-[#13845B]" : "bg-[#EEF4FF] text-[#0F5BD8]"}`}>
            {formatBaht(media.priceSatang)}
          </span>
          <span className="flex items-center gap-1 text-xs text-[#66758A]">
            <Star className="h-4 w-4 fill-[#F6B73C] text-[#F6B73C]" />{media.rating}
            <ShieldCheck className="ml-1 h-4 w-4 text-[#2FC58D]" />
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#E1E8F2] pt-3">
          <Link href={`/media/${media.slug}`} className="btn min-h-11 min-w-0 px-2 text-xs text-[#0F5BD8] hover:bg-[#EEF4FF] sm:text-sm">
            ดูรายละเอียด
          </Link>
          {media.accessType === "free" ? (
            <Link href={media.deliveryType === "file" ? `/api/media/${media.id}/download` : `/go/${media.id}`} className="btn btn-primary min-h-11 min-w-0 whitespace-nowrap px-2 text-xs sm:text-sm">
              <ExternalLink className="h-4 w-4 shrink-0" />{media.deliveryType === "file" ? "ดาวน์โหลด" : "เปิดฟรี"}
            </Link>
          ) : (
            <AddToCartButton mediaId={media.id} compact fullWidth primary />
          )}
        </div>
      </div>
    </article>
  );
}
