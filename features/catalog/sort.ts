import type { MediaSummary } from "@/types/domain";

export const catalogSorts = ["new", "popular", "rating", "price-low", "price-high"] as const;
export type CatalogSort = typeof catalogSorts[number];
export function parseCatalogSort(value: string): CatalogSort {
  return catalogSorts.includes(value as CatalogSort) ? value as CatalogSort : "new";
}
export const catalogSortColumns: Record<CatalogSort, { column: string; ascending: boolean }> = {
  new: { column: "published_at", ascending: false },
  popular: { column: "sales_count", ascending: false },
  rating: { column: "rating_average", ascending: false },
  "price-low": { column: "price_satang", ascending: true },
  "price-high": { column: "price_satang", ascending: false },
};
export function sortCatalogItems(items: MediaSummary[], sort: CatalogSort) {
  return [...items].sort((a, b) => {
    if (sort === "popular") return b.salesCount - a.salesCount;
    if (sort === "rating") return b.rating - a.rating;
    if (sort === "price-low") return a.priceSatang - b.priceSatang;
    if (sort === "price-high") return b.priceSatang - a.priceSatang;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}
