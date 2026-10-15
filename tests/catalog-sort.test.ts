import { describe, expect, it } from "vitest";
import { demoMedia } from "@/features/catalog/demo-media";
import { catalogSortColumns, parseCatalogSort, sortCatalogItems } from "@/features/catalog/sort";

describe("catalog sorting", () => {
  it("accepts only known sorts for the server query", () => {
    expect(parseCatalogSort("price-low")).toBe("price-low");
    expect(parseCatalogSort("price_satang.desc;drop")).toBe("new");
    expect(catalogSortColumns[parseCatalogSort("unknown")].column).toBe("published_at");
  });
  it("sorts prices without changing the shared input", () => {
    const original = demoMedia.map(x => x.id);
    const ascending = sortCatalogItems(demoMedia, "price-low").map(x => x.priceSatang);
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
    expect(sortCatalogItems(demoMedia, "price-high").map(x => x.priceSatang)).toEqual([...ascending].reverse());
    expect(demoMedia.map(x => x.id)).toEqual(original);
  });
});
