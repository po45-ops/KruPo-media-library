import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ShoppingBag } from "lucide-react";
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
      <div className="rounded-[24px] bg-[#F7FAFF] p-6">
        <h1 className="text-3xl font-black text-[#0B2F6B]">ตะกร้าสินค้า</h1>
        <div className="mt-6 flex max-w-xl items-center justify-between text-sm" aria-label="ขั้นตอนสั่งซื้อ">
          <strong className="text-[#0F5BD8]">1 ตะกร้า</strong>
          <span>2 ชำระเงิน</span>
          <span>3 สำเร็จ</span>
        </div>
      </div>

      {usesDevelopmentFixtures && (
        <p className="mt-4 rounded-xl border border-[#F4D78D] bg-[#FFF9E9] p-3 text-sm text-[#7A5710]">
          ข้อมูลทดสอบภายในเครื่อง — ปุ่มเปลี่ยนข้อมูลจะเริ่มทำงานเมื่อเชื่อมฐานข้อมูล Staging
        </p>
      )}

      <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_360px]">
        <section className="soft-card p-5">
          <h2 className="font-extrabold text-[#0B2F6B]">รายการสินค้า ({items.length.toLocaleString("th-TH")})</h2>
          {items.length ? (
            <div className="mt-4 grid gap-3">
              {items.map((media) => (
                <article
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#E1E8F2] p-4"
                  key={media.id}
                >
                  <Link
                    href={`/media/${media.slug}`}
                    className="grid h-24 w-32 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#0B2F6B] to-[#6554E8] p-2 text-center text-sm font-black text-white"
                  >
                    {media.titleTh}
                  </Link>
                  <div className="min-w-44 flex-1">
                    <Link href={`/media/${media.slug}`} className="font-extrabold text-[#0B2F6B] hover:text-[#0F5BD8]">
                      {media.titleTh}
                    </Link>
                    <p className="mt-1 text-sm text-[#66758A]">{media.subject} • {media.grade}</p>
                    <p className="mt-1 text-xs text-[#66758A]">{media.mediaType}</p>
                  </div>
                  <div className="ml-auto grid justify-items-end gap-2">
                    <strong className="text-[#159665]">{formatBaht(media.priceSatang)}</strong>
                    <RemoveCartItemButton mediaId={media.id} title={media.titleTh} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-[#B9C7DA] p-10 text-center">
              <p className="text-4xl">🛒</p>
              <h3 className="mt-3 text-lg font-extrabold text-[#0B2F6B]">ยังไม่มีสื่อในตะกร้า</h3>
              <p className="mt-2 text-sm text-[#66758A]">เลือกสื่อที่ต้องการก่อนดำเนินการชำระเงิน</p>
            </div>
          )}

          {items.length > 0 && !ready && (
            <div className="mt-4 rounded-xl bg-[#EEF4FF] p-4 text-sm font-semibold text-[#0F5BD8]">
              ยอดชำระขั้นต่ำ 10 บาท กรุณาเลือกสื่อเพิ่มอีก {formatBaht(1000 - total)}
            </div>
          )}
          <Link href="/media" className="btn btn-secondary mt-4">
            <ShoppingBag className="h-4 w-4" />เลือกสื่อเพิ่ม
          </Link>
        </section>

        <aside className="soft-card h-fit p-6">
          <h2 className="text-lg font-extrabold text-[#0B2F6B]">สรุปรายการ</h2>
          <div className="mt-5 flex justify-between text-sm">
            <span>รวมสินค้า</span><strong>{formatBaht(total)}</strong>
          </div>
          <div className="my-5 border-t border-[#E1E8F2]" />
          <div className="flex items-end justify-between gap-3">
            <strong>ยอดรวมทั้งหมด</strong>
            <strong className="text-3xl text-[#0B2F6B]">{formatBaht(total)}</strong>
          </div>
          <div className="mt-6">
            <CheckoutButton
              mediaIds={items.map((item) => item.id)}
              customerEmail={principal.email}
              disabled={!ready || usesDevelopmentFixtures}
            />
          </div>
          <p className="mt-4 flex gap-2 text-xs leading-5 text-[#66758A]">
            <ShieldCheck className="h-5 w-5 shrink-0 text-[#2FC58D]" />
            ราคาจะถูกคำนวณใหม่จากฐานข้อมูลฝั่งเซิร์ฟเวอร์ก่อนสร้างคำสั่งซื้อ
          </p>
        </aside>
      </div>
    </div>
  );
}
