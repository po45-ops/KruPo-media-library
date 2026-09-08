"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminOrderRefund({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("คืนเงินรายการทดสอบ Stripe บน Hosted Staging");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    startTransition(async () => {
      const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(result?.error ?? "คืนเงินไม่สำเร็จ");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        className="min-h-11 rounded-lg border border-red-200 px-3 text-xs font-bold text-red-700 hover:bg-red-50"
        onClick={() => setOpen(true)}
        type="button"
      >
        คืนเงิน
      </button>
    );
  }

  return (
    <div className="min-w-64 space-y-2">
      <label className="block text-xs font-bold text-[#0B2F6B]" htmlFor={`refund-reason-${orderId}`}>
        เหตุผลการคืนเงิน
      </label>
      <textarea
        className="min-h-20 w-full rounded-lg border border-[#E1E8F2] p-2 text-sm"
        id={`refund-reason-${orderId}`}
        onChange={(event) => setReason(event.target.value)}
        value={reason}
      />
      {error ? <p className="text-xs text-red-700" role="alert">{error}</p> : null}
      <div className="flex gap-2">
        <button
          className="min-h-11 rounded-lg bg-red-700 px-3 text-xs font-bold text-white disabled:opacity-50"
          disabled={pending || reason.trim().length < 10}
          onClick={submit}
          type="button"
        >
          {pending ? "กำลังคืนเงิน…" : "ยืนยันคืนเงิน"}
        </button>
        <button
          className="min-h-11 rounded-lg border border-[#E1E8F2] px-3 text-xs font-bold text-[#44546B]"
          disabled={pending}
          onClick={() => setOpen(false)}
          type="button"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}
