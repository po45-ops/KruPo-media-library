import { NextResponse } from "next/server";
import { z } from "zod";
import { getRequestPrincipal, hasRole } from "@/server/auth/principal";
import { createAdminSupabaseClient } from "@/server/supabase/admin";
import { isSupabaseConfigured } from "@/server/supabase/server";
import { validateUpload } from "@/server/security/file-validation";
import { sha256, encryptSecureTarget } from "@/server/security/crypto";
import { assertPublicHttpsUrl } from "@/server/security/safe-url";
import { getStorageProvider } from "@/providers/storage";
import type { StorageMetadata } from "@/providers/storage/storage-provider";
import { BasicCopyrightChecker } from "@/providers/copyright/basic-copyright-checker";
import { BasicFileSafetyChecker } from "@/providers/file-safety/basic-file-safety";
import type { CopyrightCheckResult } from "@/providers/copyright/copyright-risk-provider";
import { isSameOriginMutation } from "@/server/security/request-origin";
import { enforceRequestRateLimit } from "@/server/security/rate-limit";

const schema = z.object({
  titleTh: z.string().trim().min(3).max(180),
  descriptionTh: z.string().trim().min(20).max(10000),
  subject: z.string().min(1), grade: z.string().min(1), mediaType: z.string().min(1),
  priceBaht: z.coerce.number().int().min(0).max(100000),
  gameUrl: z.union([z.literal(""), z.string().url().startsWith("https://")]).optional(),
  backupUrl: z.union([z.literal(""), z.string().url().startsWith("https://")]).optional(),
  tags: z.string().max(500).optional(), ownershipEvidence: z.string().min(10).max(5000), ownershipConfirmed: z.literal("on"),
  sourcePlatform: z.enum(["Wordwall", "Genially", "Canva", "Google Sites", "LearningApps", "Other"]).default("Other"),
  verificationToken: z.string().trim().max(100).optional(),
});

type Uploaded = StorageMetadata & { purpose: "source" | "backup" | "cover"; safetyStatus: "clean" | "unsafe" | "manual_review" | "failed" };
function reviewRow(checkType: string, result: CopyrightCheckResult, extra: Record<string, unknown> = {}) {
  return { check_type: checkType, provider: result.provider, model: result.model, model_version: result.modelVersion, input_hash: result.inputHash, risk: result.risk, similarity: result.evidence.reduce<number | undefined>((top, item) => item.similarity === undefined ? top : Math.max(top ?? 0, item.similarity), undefined), urls_found: result.urlsFound, result: extra, reason: result.reason, evidence: result.evidence };
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  const limited = await enforceRequestRateLimit(request, "media-submission", 12, 3600); if (limited) return limited;
  const principal = await getRequestPrincipal();
  if (!principal) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (!hasRole(principal, ["creator"])) return NextResponse.json({ error: "บัญชียังไม่มีสิทธิ์ผู้สร้าง" }, { status: 403 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "ฐานข้อมูล Staging ยังไม่ได้ตั้งค่า" }, { status: 503 });
  const form = await request.formData(), parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return NextResponse.json({ error: "ข้อมูลสื่อไม่ถูกต้อง", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  const sourceFile = form.get("mediaFile"), coverFile = form.get("cover"), backupFile = form.get("backupFile");
  const hasSource = sourceFile instanceof File && sourceFile.size > 0, hasGame = Boolean(parsed.data.gameUrl);
  if (!hasSource && !hasGame) return NextResponse.json({ error: "ต้องมีไฟล์สื่อหรือ Game URL อย่างน้อยหนึ่งรายการ" }, { status: 400 });
  const uploaded: Uploaded[] = [], storage = getStorageProvider();
  try {
    const db = createAdminSupabaseClient();
    const [subjectResult, mediaTypeResult, gradeResult, knownTextResult, knownFileResult, knownTargetResult] = await Promise.all([
      db.from("subjects").select("id").eq("name_th", parsed.data.subject).eq("active", true).maybeSingle(),
      db.from("media_types").select("id").eq("name_th", parsed.data.mediaType).eq("active", true).maybeSingle(),
      db.from("grade_levels").select("id").eq("name_th", parsed.data.grade).eq("active", true).maybeSingle(),
      db.from("media_items").select("id,title_th,description_th").limit(3000),
      db.from("media_files").select("id,checksum,media:media_items(creator_id)").eq("active", true).limit(10000),
      db.from("media_secure_targets").select("id,target_hash").eq("active", true).not("target_hash", "is", null).limit(10000),
    ]);
    if (!subjectResult.data || !mediaTypeResult.data || !gradeResult.data) throw new Error("master data ไม่ถูกต้อง");
    const checker = new BasicCopyrightChecker(), safetyChecker = new BasicFileSafetyChecker(), reviews: Array<Record<string, unknown>> = [];
    const textResult = await checker.checkText({ text: `${parsed.data.titleTh}\n${parsed.data.descriptionTh}`, knownTexts: (knownTextResult.data ?? []).map((item) => ({ id: item.id, text: `${item.title_th}\n${item.description_th}` })) });
    reviews.push(reviewRow("text_similarity", textResult));
    const candidates: [FormDataEntryValue | null, Uploaded["purpose"], number][] = [[sourceFile, "source", 200 * 1024 * 1024], [backupFile, "backup", 200 * 1024 * 1024], [coverFile, "cover", 10 * 1024 * 1024]];
    for (const [entry, purpose, maxBytes] of candidates) {
      if (!(entry instanceof File) || !entry.size) continue;
      validateUpload(entry, maxBytes);
      const bytes = new Uint8Array(await entry.arrayBuffer()), checksum = await sha256(bytes), safety = await safetyChecker.check(bytes, entry.name, entry.type);
      if (safety.status === "unsafe") return NextResponse.json({ error: "ไฟล์ถูกปฏิเสธเพราะพบรูปแบบอันตราย" }, { status: 400 });
      const copyright = purpose === "cover" ? await checker.checkImage({ bytes }) : await checker.checkFile({ bytes, fileName: entry.name, creatorId: principal.userId, knownChecksums: (knownFileResult.data ?? []).map((row) => { const relation = (row as unknown as { media: { creator_id: string } | Array<{ creator_id: string }> | null }).media, media = Array.isArray(relation) ? relation[0] : relation; return { id: row.id, checksum: row.checksum, creatorId: media?.creator_id }; }) });
      const object = await storage.upload({ path: `temporary/review/${principal.userId}/${crypto.randomUUID()}`, fileName: entry.name, mimeType: entry.type, data: bytes, checksum });
      uploaded.push({ ...object, purpose, safetyStatus: safety.status });
      reviews.push({ check_type: "file_safety", provider: safety.provider, model: "deterministic-signatures", model_version: "1.0.0", input_hash: checksum, risk: "UNKNOWN", similarity: null, urls_found: [], result: { storage_file_id: object.fileId, signatures: safety.signatures, explicit_state: safety.status }, reason: safety.reason, evidence: safety.signatures.map((detail) => ({ kind: "dangerous_signature", detail })) });
      reviews.push(reviewRow(purpose === "cover" ? "image_duplicate" : "file_duplicate", copyright, { storage_file_id: object.fileId, purpose }));
    }
    const secret = process.env.MEDIA_URL_ENCRYPTION_KEY, targets: Array<Record<string, unknown>> = [];
    for (const [raw, type] of [[parsed.data.gameUrl, "primary"], [parsed.data.backupUrl, "backup"]] as const) {
      if (!raw) continue;
      if (!secret) throw new Error("encryption key unavailable");
      const canonical = assertPublicHttpsUrl(raw).toString(), targetHash = await sha256(canonical), encrypted = await encryptSecureTarget(canonical, secret), duplicates = (knownTargetResult.data ?? []).filter((item) => item.target_hash === targetHash);
      targets.push({ target_type: type, target_ciphertext: encrypted.ciphertext, target_iv: encrypted.iv, target_hash: targetHash, source_platform: parsed.data.sourcePlatform, verification_token: parsed.data.verificationToken || null });
      reviews.push({ check_type: "url_duplicate", provider: "BASIC", model: "canonical-url-sha256", model_version: "1.0.0", input_hash: targetHash, risk: duplicates.length ? "HIGH" : "LOW", similarity: duplicates.length ? 1 : null, urls_found: [], result: { target_type: type, duplicate_target_ids: duplicates.map((item) => item.id) }, reason: duplicates.length ? "พบ URL ซ้ำในคลัง KruPo" : "ไม่พบ URL ซ้ำ", evidence: duplicates.map((item) => ({ kind: "url_duplicate", reference: item.id, similarity: 1, detail: "canonical URL fingerprint ตรงกัน" })) });
    }
    const slug = `${parsed.data.titleTh.toLocaleLowerCase("th").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/(^-|-$)/g, "")}-${crypto.randomUUID().slice(0, 8)}`, deliveryType = hasGame && hasSource ? "both" : hasGame ? "external_link" : "file";
    const { data: mediaId, error } = await db.rpc("create_media_submission_secure", { p_creator_id: principal.userId, p_slug: slug, p_title_th: parsed.data.titleTh, p_description_th: parsed.data.descriptionTh, p_subject_id: subjectResult.data.id, p_media_type_id: mediaTypeResult.data.id, p_grade_level_id: gradeResult.data.id, p_access_type: parsed.data.priceBaht === 0 ? "free" : "paid", p_delivery_type: deliveryType, p_price_satang: parsed.data.priceBaht * 100, p_tags: parsed.data.tags?.split(",").map((item) => item.trim()).filter(Boolean) ?? [], p_ownership_evidence: parsed.data.ownershipEvidence, p_files: uploaded.map((file) => ({ purpose: file.purpose, storage_provider: file.provider, storage_file_id: file.fileId, storage_path: file.path, file_name: file.fileName, mime_type: file.mimeType, file_size: file.size, checksum: file.checksum, safety_status: file.safetyStatus })), p_targets: targets, p_reviews: reviews });
    if (error || !mediaId) throw error ?? new Error("สร้าง submission ไม่สำเร็จ");
    return NextResponse.json({ ok: true, mediaId, status: "human_review", fileSafety: uploaded.length ? "manual_review" : "not_applicable" }, { status: 201 });
  } catch {
    await Promise.all(uploaded.map((file) => storage.delete(file.fileId).catch(() => undefined)));
    return NextResponse.json({ error: "ส่งสื่อไม่สำเร็จ ระบบไม่ได้เผยแพร่ไฟล์" }, { status: 500 });
  }
}
