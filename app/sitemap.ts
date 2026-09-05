import type { MetadataRoute } from "next";
import { listPublishedMedia } from "@/server/repositories/catalog-repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const routes: MetadataRoute.Sitemap = ["", "/media", "/games", "/about", "/terms", "/privacy", "/refund-policy", "/copyright", "/contact", "/faq"].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path === "" ? "daily" : "weekly" }));
  const published = await listPublishedMedia({ limit: 60 });
  const media: MetadataRoute.Sitemap = published.map((item) => ({ url: `${base}/media/${item.slug}`, lastModified: new Date(item.updatedAt), changeFrequency: "weekly" }));
  return [...routes, ...media];
}
