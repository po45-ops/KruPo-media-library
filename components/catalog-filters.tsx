import { subjects } from "@/features/catalog/demo-media";

export function CatalogFilters({ q, subject, price }: { q: string; subject: string; price: string }) {
  return <form className="grid gap-5" action="/media">
    <label className="grid gap-2 text-sm font-bold">คำค้น<input name="q" defaultValue={q} className="field" placeholder="ชื่อ วิชา ผู้สร้าง"/></label>
    <fieldset><legend className="text-sm font-bold">วิชา</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">{subjects.map((item)=><label className="flex min-h-11 items-center gap-2 text-sm" key={item}><input type="radio" name="subject" value={item} defaultChecked={subject===item}/>{item}</label>)}</div></fieldset>
    <fieldset><legend className="text-sm font-bold">ราคา</legend><div className="sm:flex sm:gap-5 lg:grid lg:gap-0"><label className="mt-2 flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="price" value="free" defaultChecked={price==="free"}/>ฟรี</label><label className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="price" value="paid" defaultChecked={price==="paid"}/>สื่อเสียเงิน</label></div></fieldset>
    <button className="btn btn-primary" type="submit">ใช้ตัวกรอง</button>
  </form>;
}
