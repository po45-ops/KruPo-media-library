export const roles = ["owner", "admin", "reviewer", "moderator", "finance", "support", "creator", "user"] as const;
export type Role = (typeof roles)[number];

export type AccessType = "free" | "paid";
export type DeliveryType = "external_link" | "file" | "both";
export type MediaStatus = "draft" | "reviewing" | "published" | "degraded" | "suspended" | "archived";

export interface MediaSummary {
  id: string;
  slug: string;
  titleTh: string;
  descriptionTh: string;
  subject: string;
  grade: string;
  mediaType: string;
  creator: string;
  accessType: AccessType;
  deliveryType: DeliveryType;
  priceSatang: number;
  rating: number;
  salesCount: number;
  updatedAt: string;
  protection: "KruPo Protected" | "Verified External" | "External Only";
  linkHealth: "ok" | "warning" | "broken" | "unknown";
  accent: string;
  demo?: boolean;
}
