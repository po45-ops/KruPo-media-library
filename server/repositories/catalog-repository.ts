import "server-only";
import { createClient } from "@supabase/supabase-js";
import { demoMedia } from "@/features/catalog/demo-media";
import type { MediaSummary } from "@/types/domain";

export interface CatalogFilters {
  q?: string;
  subject?: string;
  price?: "free" | "paid";
  mediaType?: string;
  excludeId?: string;
  limit?: number;
}

type Relation<T> = T | T[] | null;
type CatalogRow = {
  id: string;
  slug: string;
  title_th: string;
  short_description_th: string;
  access_type: "free" | "paid";
  delivery_type: "external_link" | "file" | "both";
  price_satang: number;
  protection_status: "krupo_protected" | "verified_external" | "external_only";
  rating_average: number | string;
  sales_count: number;
  updated_at: string;
  subject: Relation<{ name_th: string }>;
  media_type: Relation<{ name_th: string }>;
  creator: Relation<{ display_name: string }>;
  media_grade_levels: Array<{ grade_level: Relation<{ name_th: string }> }>;
};

const accents = [
  "linear-gradient(135deg,#0B2F6B,#0F5BD8)",
  "linear-gradient(135deg,#6554E8,#A58BFA)",
  "linear-gradient(135deg,#0F5BD8,#2FC58D)",
  "linear-gradient(135deg,#E9B949,#FF8B5A)",
];
const publicCatalogColumns = "id,slug,title_th,short_description_th,access_type,delivery_type,price_satang,protection_status,rating_average,sales_count,updated_at,subject:subjects!inner(name_th),media_type:media_types!inner(name_th),creator:creator_profiles(display_name),media_grade_levels(grade_level:grade_levels(name_th))";

function one<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapRow(row: CatalogRow): MediaSummary {
  const grade = one(row.media_grade_levels?.[0]?.grade_level ?? null);
  const protection = {
    krupo_protected: "KruPo Protected",
    verified_external: "Verified External",
    external_only: "External Only",
  } as const;
  const accentIndex = [...row.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) % accents.length;
  return {
    id: row.id,
    slug: row.slug,
    titleTh: row.title_th,
    descriptionTh: row.short_description_th,
    subject: one(row.subject)?.name_th ?? "ไม่ระบุวิชา",
    grade: grade?.name_th ?? "ทุกระดับชั้น",
    mediaType: one(row.media_type)?.name_th ?? "สื่อการเรียนรู้",
    creator: one(row.creator)?.display_name ?? "ผู้สร้าง KruPo",
    accessType: row.access_type,
    deliveryType: row.delivery_type,
    priceSatang: row.price_satang,
    rating: Number(row.rating_average),
    salesCount: row.sales_count,
    updatedAt: row.updated_at,
    protection: protection[row.protection_status],
    linkHealth: "unknown",
    accent: accents[accentIndex],
  };
}

function localFallback(filters: CatalogFilters): MediaSummary[] {
  const query = filters.q?.trim().toLocaleLowerCase("th") ?? "";
  return demoMedia
    .filter((item) => !filters.excludeId || item.id !== filters.excludeId)
    .filter((item) => !filters.subject || item.subject === filters.subject)
    .filter((item) => !filters.price || item.accessType === filters.price)
    .filter((item) => !filters.mediaType || item.mediaType === filters.mediaType)
    .filter((item) => !query || `${item.titleTh} ${item.descriptionTh} ${item.subject} ${item.grade} ${item.creator}`.toLocaleLowerCase("th").includes(query))
    .slice(0, filters.limit ?? 24);
}

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

export async function listPublishedMedia(filters: CatalogFilters = {}): Promise<MediaSummary[]> {
  const client = publicClient();
  if (!client) return localFallback(filters);

  let query = client
    .from("media_items")
    .select(publicCatalogColumns)
    .in("status", ["published", "degraded"])
    .is("hidden_at", null)
    .order("published_at", { ascending: false })
    .limit(Math.min(Math.max(filters.limit ?? 24, 1), 60));

  if (filters.excludeId) query = query.neq("id", filters.excludeId);
  if (filters.price) query = query.eq("access_type", filters.price);
  if (filters.subject) query = query.eq("subject.name_th", filters.subject);
  if (filters.mediaType) query = query.eq("media_type.name_th", filters.mediaType);
  if (filters.q?.trim()) {
    const safe = filters.q.trim().replace(/[,%()]/g, " ").slice(0, 80);
    query = query.or(`title_th.ilike.%${safe}%,short_description_th.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("catalog_query_failed", { code: error.code, message: error.message });
    return process.env.NODE_ENV === "production" ? [] : localFallback(filters);
  }
  return (data as unknown as CatalogRow[]).map(mapRow);
}

export async function getPublishedMediaBySlug(slug: string): Promise<MediaSummary | null> {
  const client = publicClient();
  if (!client) return localFallback({ limit: 60 }).find((item) => item.slug === slug) ?? null;
  const { data, error } = await client
    .from("media_items")
    .select(publicCatalogColumns)
    .eq("slug", slug)
    .in("status", ["published", "degraded"])
    .is("hidden_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data as unknown as CatalogRow);
}
