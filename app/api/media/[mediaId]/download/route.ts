import { z } from "zod";
import { createAdminSupabaseClient } from "@/server/supabase/admin";
import { getRequestPrincipal } from "@/server/auth/principal";
import { getStorageProvider } from "@/providers/storage";
import type { StorageProviderName } from "@/providers/storage/storage-provider";
import { enforceRequestRateLimit } from "@/server/security/rate-limit";
import { canDownloadMedia, storedFileMatches } from "@/server/services/media-download-policy";

export const dynamic = "force-dynamic";
const providerSchema = z.enum(["local_test", "google_drive", "cloudflare_r2"]);
const noStore = { "Cache-Control": "private, no-store" };

export async function GET(request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const limited = await enforceRequestRateLimit(request, "download", 30, 60);
  if (limited) return limited;
  const { mediaId } = await params;
  if (!z.string().uuid().safeParse(mediaId).success) return new Response("ไม่พบไฟล์", { status: 404, headers: noStore });

  const principal = await getRequestPrincipal();
  if (!principal) return new Response("กรุณาเข้าสู่ระบบ", { status: 401, headers: noStore });

  const db = createAdminSupabaseClient();
  const [{ data: entitlement, error: entitlementError }, { data: media, error: mediaError }] = await Promise.all([
    db.from("entitlements").select("id").eq("user_id", principal.userId).eq("media_id", mediaId).is("revoked_at", null).maybeSingle(),
    db.from("media_items").select("access_type,status").eq("id", mediaId).maybeSingle(),
  ]);
  if (entitlementError || mediaError) return new Response("ตรวจสอบสิทธิ์ดาวน์โหลดไม่สำเร็จ", { status: 503, headers: noStore });
  if (!canDownloadMedia(media, Boolean(entitlement))) {
    return new Response("คุณไม่มีสิทธิ์ดาวน์โหลด", { status: 403, headers: noStore });
  }

  const { data: files, error: fileError } = await db
    .from("media_files")
    .select("id,storage_provider,storage_file_id,purpose,file_name,mime_type,file_size,checksum,malware_status")
    .eq("media_id", mediaId)
    .eq("area", "permanent")
    .eq("active", true)
    .eq("malware_status", "clean")
    .in("purpose", ["download", "source"])
    .limit(10);
  if (fileError) return new Response("ตรวจสอบสถานะไฟล์ไม่สำเร็จ", { status: 503, headers: noStore });
  const file = [...(files ?? [])].sort((a, b) => a.purpose === "download" ? -1 : b.purpose === "download" ? 1 : 0)[0];
  if (!file) return new Response("ไฟล์ยังไม่พร้อมหรือยังไม่ผ่านการตรวจ", { status: 503, headers: noStore });
  const provider = providerSchema.safeParse(file.storage_provider);
  if (!provider.success) return new Response("Storage provider ของไฟล์ไม่รองรับ", { status: 503, headers: noStore });

  try {
    const storage = getStorageProvider(provider.data as StorageProviderName);
    const metadata = await storage.getMetadata(file.storage_file_id);
    if (!storedFileMatches(file, metadata)) {
      return new Response("Metadata หรือ checksum ของไฟล์ไม่ตรงกับฐานข้อมูล", { status: 409, headers: noStore });
    }
    const response = await storage.download(file.storage_file_id);
    if (!response.ok || !response.body) return new Response("ดาวน์โหลดจาก Storage ไม่สำเร็จ", { status: 503, headers: noStore });
    const { error: logError } = await db.from("download_logs").insert({ user_id: principal.userId, media_id: mediaId, media_file_id: file.id });
    if (logError) return new Response("บันทึกประวัติดาวน์โหลดไม่สำเร็จ", { status: 503, headers: noStore });
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return new Response("Storage ไม่พร้อมใช้งานชั่วคราว", { status: 503, headers: noStore });
  }
}
