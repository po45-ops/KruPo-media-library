import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state";
import { requirePrincipal } from "@/server/auth/principal";
import { formatBaht } from "@/server/domain/money";
import { getPurchaseHistory } from "@/server/repositories/user-data-repository";

export const metadata: Metadata = { title: "ประวัติการซื้อ", robots: { index: false, follow: false } };

const statusLabels: Record<string, string> = {
  pending: "กำลังสร้างรายการ",
  awaiting_payment: "รอชำระเงิน",
  paid: "ชำระแล้ว",
  failed: "ชำระไม่สำเร็จ",
  expired: "หมดเวลา",
  refunded: "คืนเงินแล้ว",
};

function dateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const principal = await requirePrincipal("/orders");
  const [orders, params] = await Promise.all([getPurchaseHistory(principal.userId), searchParams]);

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-black text-[#0B2F6B]">ประวัติการซื้อ</h1>
      <p className="mb-7 mt-2 text-[#66758A]">ราคาและส่วนแบ่งถูกบันทึกเป็น snapshot ณ วันที่สร้างคำสั่งซื้อ</p>
      {params.payment === "return" && (
        <p className="mb-5 rounded-xl border border-[#AAC9F6] bg-[#EEF4FF] p-4 text-sm text-[#0B2F6B]" role="status">
          กลับจากหน้าชำระเงินแล้ว ระบบจะให้สิทธิ์เมื่อได้รับและตรวจสอบ webhook จาก Stripe Test สำเร็จเท่านั้น
        </p>
      )}
      {orders.length ? (
        <div className="soft-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-[#EEF4FF] text-[#0B2F6B]">
                <tr>
                  <th className="p-4">คำสั่งซื้อ</th>
                  <th className="p-4">รายการ</th>
                  <th className="p-4">ยอดรวม</th>
                  <th className="p-4">สถานะ</th>
                  <th className="p-4">วันที่สร้าง</th>
                  <th className="p-4">วันที่ชำระ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr className="border-t border-[#E1E8F2] align-top" key={order.id}>
                    <td className="p-4 font-mono text-xs text-[#44546B]">{order.id.slice(0, 8)}</td>
                    <td className="p-4">
                      <ul className="grid gap-1">
                        {order.titles.map((title, index) => <li key={`${order.id}-${index}`}>{title}</li>)}
                      </ul>
                    </td>
                    <td className="p-4 font-extrabold text-[#0B2F6B]">{formatBaht(order.totalSatang)}</td>
                    <td className="p-4">
                      <span className={`badge ${order.status === "paid" ? "bg-[#DDF7EC] text-[#13845B]" : "bg-[#FFF1CE] text-[#8A5D00]"}`}>
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </td>
                    <td className="p-4 text-[#66758A]">{dateTime(order.createdAt)}</td>
                    <td className="p-4 text-[#66758A]">{dateTime(order.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon="🧾" title="ยังไม่มีคำสั่งซื้อ" description="เมื่อสร้างคำสั่งซื้อแล้ว รายการและสถานะการชำระเงินจะปรากฏที่นี่" />
      )}
    </div>
  );
}
