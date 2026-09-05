import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/server/supabase/admin";
import { getRequestPrincipal } from "@/server/auth/principal";
import { decryptSecureTarget } from "@/server/security/crypto";
import {enforceRequestRateLimit} from "@/server/security/rate-limit";
import {assertPublicHttpsUrl} from "@/server/security/safe-url";

export const dynamic = "force-dynamic";
const idSchema = z.string().uuid();

export async function GET(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const limited=await enforceRequestRateLimit(request,"game-launch",60,60);if(limited)return limited;
  const { mediaId } = await params;
  if (!idSchema.safeParse(mediaId).success) return new Response("ไม่พบสื่อ", { status: 404 });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return new Response("ระบบเกม Staging ยังไม่ได้เชื่อมฐานข้อมูล", { status: 503, headers: { "Cache-Control": "no-store" } });
  const db = createAdminSupabaseClient();
  const { data: media } = await db.from("media_items").select("id,access_type,status").eq("id", mediaId).single();
  if (!media || !["published", "degraded"].includes(media.status)) return new Response("สื่อนี้ไม่พร้อมใช้งาน", { status: 404, headers: { "Cache-Control": "no-store" } });
  const principal = await getRequestPrincipal();
  if (media.access_type === "paid") {
    if (!principal) return NextResponse.redirect(new URL(`/login?next=/go/${mediaId}`, request.url), 303);
    const { data: right } = await db.from("entitlements").select("id").eq("user_id", principal.userId).eq("media_id", mediaId).is("revoked_at", null).maybeSingle();
    if (!right) return new Response("คุณยังไม่มีสิทธิ์เปิดสื่อนี้", { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const { data: target } = await db.from("media_secure_targets").select("target_ciphertext,target_iv").eq("media_id", mediaId).eq("target_type","primary").eq("active", true).single();
  const secret = process.env.MEDIA_URL_ENCRYPTION_KEY;
  if (!target || !secret) return new Response("ไม่พบปลายทางที่ปลอดภัย", { status: 503, headers: { "Cache-Control": "no-store" } });
  const url = assertPublicHttpsUrl(await decryptSecureTarget(target.target_ciphertext, target.target_iv, secret)).toString();
  await db.from("game_launch_logs").insert({ user_id: principal?.userId ?? null, media_id: mediaId, access_type: media.access_type });
  const response = NextResponse.redirect(url, 302);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
