import Image from "next/image";
import Link from "next/link";

const groups = [
  ["เกี่ยวกับเรา",[["/about","เกี่ยวกับ KruPo"],["/terms","เงื่อนไขการใช้งาน"],["/privacy","ความเป็นส่วนตัว"]]],
  ["ช่วยเหลือ",[["/faq","คำถามที่พบบ่อย"],["/refund-policy","นโยบายคืนเงิน"],["/copyright/report","แจ้งลิขสิทธิ์"]]],
  ["สำหรับครู",[["/creator","สมัครเป็นผู้สร้าง"],["/seller-agreement","ข้อตกลงผู้ขาย"],["/contact","ติดต่อทีมงาน"]]],
];
export function SiteFooter(){return <footer className="mt-20 border-t border-[#E1E8F2] bg-[#F9FBFF] pb-24 md:pb-0"><div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]"><div><Image src="/brand/logo.svg" alt="KruPo คลังสื่อ" width={180} height={48}/><p className="mt-4 max-w-sm text-sm leading-7 text-[#66758A]">สื่อดี ครบ ครูถูกใจ นักเรียนสนุก — พื้นที่รวมสื่อการเรียนรู้ที่เป็นมิตรกับครูไทย</p></div>{groups.map(([title,items])=><div key={title as string}><h2 className="font-extrabold text-[#0B2F6B]">{title as string}</h2><div className="mt-3 grid gap-2 text-sm text-[#66758A]">{(items as string[][]).map(([href,label])=><Link key={href} href={href} className="hover:text-[#0F5BD8]">{label}</Link>)}</div></div>)}</div><div className="bg-[#0B2F6B] py-4 text-center text-sm text-white">© 2026 KruPo คลังสื่อ สงวนลิขสิทธิ์</div></footer>}
