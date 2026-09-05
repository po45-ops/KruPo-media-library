"use client";

import {
  Check,
  CreditCard,
  Heart,
  LoaderCircle,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type Feedback = { kind: "success" | "error"; message: string } | null;

interface MutationResponse {
  error?: unknown;
  orderId?: unknown;
  payment?: {
    provider?: unknown;
    clientSecret?: unknown;
  };
}

function errorMessage(payload: MutationResponse, fallback: string) {
  return typeof payload.error === "string" ? payload.error : fallback;
}

function loginPath() {
  const next = `${window.location.pathname}${window.location.search}`;
  return `/login?next=${encodeURIComponent(next)}`;
}

async function mutate(url: string, method: "POST" | "DELETE", mediaId: string) {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaId }),
  });
  const payload = (await response.json().catch(() => ({}))) as MutationResponse;
  return { response, payload };
}

function FeedbackText({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <span
      className={`block text-xs ${feedback.kind === "success" ? "text-[#13845B]" : "text-[#B42318]"}`}
      role={feedback.kind === "error" ? "alert" : "status"}
    >
      {feedback.message}
    </span>
  );
}

export function FavoriteButton({
  mediaId,
  initialFavorite = false,
  compact = false,
}: {
  mediaId: string;
  initialFavorite?: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function toggle() {
    setPending(true);
    setFeedback(null);
    try {
      const { response, payload } = await mutate(
        "/api/favorites",
        favorite ? "DELETE" : "POST",
        mediaId,
      );
      if (response.status === 401) return router.push(loginPath());
      if (!response.ok) throw new Error(errorMessage(payload, "บันทึกรายการโปรดไม่สำเร็จ"));
      setFavorite(!favorite);
      setFeedback({
        kind: "success",
        message: favorite ? "นำออกจากรายการโปรดแล้ว" : "บันทึกในรายการโปรดแล้ว",
      });
      router.refresh();
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" });
    } finally {
      setPending(false);
    }
  }

  const label = favorite ? "นำออกจากรายการโปรด" : "บันทึกรายการโปรด";
  return (
    <span className="grid gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={favorite}
        aria-label={label}
        title={feedback?.message ?? label}
        className={
          compact
            ? "grid h-11 w-11 place-items-center rounded-full border border-[#E1E8F2] bg-white/95 text-[#0B2F6B] shadow-sm disabled:opacity-60"
            : "btn btn-secondary disabled:cursor-wait disabled:opacity-60"
        }
      >
        {pending ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          <Heart className={`h-5 w-5 ${favorite ? "fill-[#E85D75] text-[#E85D75]" : ""}`} />
        )}
        {!compact && label}
      </button>
      {!compact && <FeedbackText feedback={feedback} />}
      {compact && <span className="sr-only" aria-live="polite">{feedback?.message}</span>}
    </span>
  );
}

export function AddToCartButton({ mediaId, compact = false }: { mediaId: string; compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [added, setAdded] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function add() {
    setPending(true);
    setFeedback(null);
    try {
      const { response, payload } = await mutate("/api/cart", "POST", mediaId);
      if (response.status === 401) return router.push(loginPath());
      if (!response.ok) throw new Error(errorMessage(payload, "เพิ่มสื่อลงตะกร้าไม่สำเร็จ"));
      setAdded(true);
      setFeedback({ kind: "success", message: "เพิ่มลงตะกร้าแล้ว" });
      router.refresh();
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" });
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="grid gap-1">
      <button
        type="button"
        onClick={add}
        disabled={pending || added}
        className={`${compact ? "btn min-h-11 px-3 text-sm" : "btn btn-secondary"} disabled:cursor-wait disabled:opacity-60`}
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : added ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
        {added ? "เพิ่มแล้ว" : compact ? "ใส่ตะกร้า" : "เพิ่มลงตะกร้า"}
      </button>
      <FeedbackText feedback={feedback} />
    </span>
  );
}

export function RemoveCartItemButton({ mediaId, title }: { mediaId: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function remove() {
    setPending(true);
    setFeedback(null);
    try {
      const { response, payload } = await mutate("/api/cart", "DELETE", mediaId);
      if (response.status === 401) return router.push(loginPath());
      if (!response.ok) throw new Error(errorMessage(payload, "นำสื่อออกจากตะกร้าไม่สำเร็จ"));
      router.refresh();
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" });
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="grid justify-items-end gap-1">
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="btn min-h-11 px-3 text-[#B42318] hover:bg-[#FFF1F0] disabled:cursor-wait disabled:opacity-60"
        aria-label={`นำ ${title} ออกจากตะกร้า`}
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        ลบ
      </button>
      <FeedbackText feedback={feedback} />
    </span>
  );
}

export function CheckoutButton({
  mediaIds,
  disabled,
}: {
  mediaIds: string[];
  customerEmail: string | null;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const checkoutKey = useRef(crypto.randomUUID());

  async function checkout() {
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaIds, checkoutKey: checkoutKey.current }),
      });
      const payload = (await response.json().catch(() => ({}))) as MutationResponse;
      if (response.status === 401) return router.push(loginPath());
      if (!response.ok) throw new Error(errorMessage(payload, "สร้างคำสั่งซื้อไม่สำเร็จ"));

      const orderId = typeof payload.orderId === "string" ? payload.orderId : null;
      if (!orderId) throw new Error("ไม่พบรหัสคำสั่งซื้อจาก Server");
      router.push(`/checkout/${orderId}`);
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "เกิดข้อผิดพลาด" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={checkout}
        disabled={disabled || pending}
        className="btn btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <CreditCard className="h-5 w-5" />}
        {pending ? "กำลังสร้างคำสั่งซื้อ..." : "ดำเนินการชำระเงิน"}
      </button>
      <FeedbackText feedback={feedback} />
    </div>
  );
}
