import Link from "next/link";
const items=["ภาพรวม","สื่อของฉัน","เพิ่มสื่อใหม่","รอตรวจสอบ","ยอดขาย","รายได้","ยอดพร้อมรับ","การรับเงิน","รีวิว","แจ้งปัญหา","ข้อมูลผู้ขาย"];
export function CreatorNav(){return <nav aria-label="เมนูผู้สร้าง" className="flex gap-2 overflow-x-auto pb-2">{items.map((x,i)=><Link href={i===2?"/creator/media/new":`/creator#section-${i}`} className={`btn whitespace-nowrap ${i===0?"btn-primary":"btn-secondary"}`} key={x}>{x}</Link>)}</nav>}
