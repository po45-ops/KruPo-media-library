import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart, ShieldCheck, ShoppingBag } from "lucide-react";
import { MediaArtwork } from "@/components/media-artwork";
import { CheckoutButton, RemoveCartItemButton } from "@/components/user-actions";
import { requirePrincipal } from "@/server/auth/principal";
import { calculateCartTotal, canCheckout, formatBaht } from "@/server/domain/money";
import { getCartItems } from "@/server/repositories/user-data-repository";

export const metadata: Metadata = { title: "ตะกร้าสินค้า", robots: { index: false, follow: false } };

export default async function CartPage() {
  const principal = await requirePrincipal("/cart");
  const items = await getCartItems(principal.userId);
  const total = calculateCartTotal(items.map((item) => item.priceSatang));
  const ready = canCheckout(total);
  const usesDevelopmentFixtures = items.some((item) => item.status === "development_fixture");

  return (
    <div className="container-page py-10">
      <div className="rounded-[24px] bg-[#141622] p-6 border border-white/10">
        <h1 className="text-3xl font-black text-white">ตะกร้าสินค้า</h1>
        <div className="mt-6 flex max-w-xl items-center justify-between text-sm text-[#94A3B8]" aria-label="ขั้นตอนสั่งซื้อ">
          <strong className="text-[#E50914]">1 ตะกร้า</strong>
          <span>2 ชำระเงิน</span>
          <span>3 สำเร็จ</span>
        </div>
      </div>

      {usesDevelopmentFixtures && (
        <p className="mt-4 rounded-xl border border-[#F4D78D]/30 bg-[#FFF9E9]/10 p-3 text-sm text-[#FBBF24]">
          ข้อมูลทดสอบภายในเครื่อง — ปุ่มเปลี่ยนข้อมูลจะเริ่มทำงานเมื่อเชื่อมฐานข้อมูล Staging
        </p>
      )}

      <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_360px]">
        <section className="soft-card p-5 border border-white/10">
          <h2 className="font-extrabold text-white">รายการสินค้า ({items.length.toLocaleString("th-TH")})</h2>
          {items.length ? (
            <div className="mt-4 grid gap-3">
              {items.map((media) => (
                <article
                  className="grid grid-cols-[88px_minmax(0,1fr)] gap-3 rounded-2xl border border-white/10 bg-[#161826] p-3 sm:grid-cols-[128px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-4"
                  key={media.id}
                >
                  <Link
                    href={`/media/${media.slug}`}
                    aria-label={`ดูรายละเอียด ${media.titleTh}`}
                    className="overflow-hidden rounded-xl"
                  >
                    <MediaArtwork title={media.titleTh} subject={media.subject} mediaType={media.mediaType} compact className="aspect-[4/3] w-full" />
                  </Link>
                  <div className="min-w-0 self-center">
                    <Link href={`/media/${media.slug}`} className="line-clamp-2 font-extrabold text-white hover:text-[#E50914] transition-colors">
                      {media.titleTh}
                    </Link>
                    <p className="mt-1 line-clamp-1 text-xs text-[#94A3B8] sm:text-sm">{media.subject} • {media.grade}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-[#64748B]">{media.mediaType}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-3 border-t border-white/10 pt-3 sm:col-span-1 sm:grid sm:justify-items-end sm:border-0 sm:pt-0">
                    <strong className="text-[#34D399]">{formatBaht(media.priceSatang)}</strong>
                    <RemoveCartItemButton mediaId={media.id} title={media.titleTh} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/20 p-10 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-[#E50914]"><ShoppingCart className="h-7 w-7" /></span>
              <h3 className="mt-3 text-lg font-extrabold text-white">ยังไม่มีสื่อในตะกร้า</h3>
              <p className="mt-2 text-sm text-[#94A3B8]">เลือกสื่อที่ต้องการก่อนดำเนินการชำระเงิน</p>
            </div>
          )}

          {items.length > 0 && !ready && (
            <div className="mt-4 rounded-xl bg-[#E50914]/15 border border-[#E50914]/30 p-4 text-sm font-semibold text-[#FF8585]">
              ยอดชำระขั้นต่ำ 10 บาท กรุณาเลือกสื่อเพิ่มอีก {formatBaht(1000 - total)}
            </div>
          )}
          <Link href="/media" className="btn btn-secondary mt-4">
            <ShoppingBag className="h-4 w-4" />เลือกสื่อเพิ่ม
          </Link>
        </section>

        <aside className="soft-card h-fit p-6 border border-white/10">
          <h2 className="text-lg font-extrabold text-white">สรุปรายการ</h2>
          <div className="mt-5 flex justify-between text-sm text-[#94A3B8]">
            <span>รวมสินค้า</span><strong className="text-white">{formatBaht(total)}</strong>
          </div>
          <div className="my-5 border-t border-white/10" />
          <div className="flex items-end justify-between gap-3">
            <strong className="text-white">ยอดรวมทั้งหมด</strong>
            <strong className="text-3xl text-white">{formatBaht(total)}</strong>
          </div>
          <div className="mt-6">
            <CheckoutButton
              mediaIds={items.map((item) => item.id)}
              customerEmail={principal.email}
              disabled={!ready || usesDevelopmentFixtures}
            />
          </div>
          <p className="mt-4 flex gap-2 text-xs leading-5 text-[#94A3B8]">
            <ShieldCheck className="h-5 w-5 shrink-0 text-[#10B981]" />
            ราคาจะถูกคำนวณใหม่จากฐานข้อมูลฝั่งเซิร์ฟเวอร์ก่อนสร้างคำสั่งซื้อ
          </p>
        </aside>
      </div>
    </div>
  );
}
