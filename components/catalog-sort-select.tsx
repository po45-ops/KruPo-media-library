"use client";

export function CatalogSortSelect({
  defaultValue,
  q,
  subject,
  price,
}: {
  defaultValue: string;
  q: string;
  subject: string;
  price: string;
}) {
  return (
    <form action="/media" className="catalog-sort">
      <input type="hidden" name="q" value={q} />
      <input type="hidden" name="subject" value={subject} />
      <input type="hidden" name="price" value={price} />
      <label htmlFor="catalog-sort" className="text-sm font-semibold text-[#94A3B8]">เรียงตาม</label>
      <select
        id="catalog-sort"
        name="sort"
        className="field cursor-pointer rounded-xl py-1.5 px-3 text-sm"
        defaultValue={defaultValue}
        onChange={(e) => e.target.form?.requestSubmit()}
      >
        <option value="new">ใหม่ล่าสุด</option>
        <option value="popular">ยอดนิยม</option>
        <option value="rating">คะแนน</option>
        <option value="price-low">ราคาต่ำ</option>
        <option value="price-high">ราคาสูง</option>
      </select>
      <button className="btn btn-secondary" type="submit">เรียงสื่อ</button>
    </form>
  );
}
