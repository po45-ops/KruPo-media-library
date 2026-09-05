import { allocateCommission, type CommissionRule } from "./commission";
import { assertSatang, canCheckout } from "./money";
export interface PricedMedia { id: string; titleTh: string; creatorId: string; priceSatang: number; accessType: "free" | "paid"; status: string }
export interface OrderItemSnapshot { mediaId: string; mediaTitleSnapshot: string; unitPriceSatangSnapshot: number; creatorIdSnapshot: string; creatorCommissionBpsSnapshot: number; platformCommissionBpsSnapshot: number; creatorShareSatangSnapshot: number; platformShareSatangSnapshot: number }
export function createOrderPricing(requestedIds: string[], databaseMedia: PricedMedia[], ruleFor: (media: PricedMedia) => CommissionRule, minimumSatang = 1000) {
  const unique = [...new Set(requestedIds)];
  if (!unique.length || unique.length !== requestedIds.length) throw new Error("รายการสั่งซื้อไม่ถูกต้องหรือซ้ำกัน");
  const byId = new Map(databaseMedia.map((media) => [media.id, media]));
  const items: OrderItemSnapshot[] = unique.map((id) => {
    const media = byId.get(id);
    if (!media || media.status !== "published" || media.accessType !== "paid") throw new Error("มีสื่อที่ไม่พร้อมจำหน่าย");
    assertSatang(media.priceSatang);
    const commission = allocateCommission(media.priceSatang, ruleFor(media));
    return { mediaId: media.id, mediaTitleSnapshot: media.titleTh, unitPriceSatangSnapshot: media.priceSatang, creatorIdSnapshot: media.creatorId, creatorCommissionBpsSnapshot: commission.creatorCommissionBpsSnapshot, platformCommissionBpsSnapshot: commission.platformCommissionBpsSnapshot, creatorShareSatangSnapshot: commission.creatorShareSatang, platformShareSatangSnapshot: commission.platformShareSatang };
  });
  const totalSatang = items.reduce((sum, item) => sum + item.unitPriceSatangSnapshot, 0);
  if (!canCheckout(totalSatang, minimumSatang)) throw new Error("ยอดชำระต่ำกว่าขั้นต่ำ");
  return { items, totalSatang };
}
