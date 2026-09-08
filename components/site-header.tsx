import Image from "next/image";
import Link from "next/link";
import { Heart, Menu, Search, ShoppingCart, UserRound } from "lucide-react";

const links = [["/","หน้าแรก"],["/media","สื่อทั้งหมด"],["/games","เกมการศึกษา"],["/media?price=free","สื่อฟรี"],["/creator","สำหรับครู"]];

export function SiteHeader() {
  return <header className="sticky top-0 z-40 border-b border-[#E1E8F2] bg-white/95 backdrop-blur">
    <div className="container-page flex min-h-20 items-center gap-5">
      <Link href="/" aria-label="KruPo คลังสื่อ หน้าแรก" className="shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0F5BD8]/40">
        <Image src="/brand/logo.svg" alt="KruPo คลังสื่อ" width={205} height={52} className="h-auto w-[172px] md:w-[205px]" priority/>
      </Link>
      <form action="/media" className="hidden min-w-48 flex-1 lg:flex"><label className="sr-only" htmlFor="global-search">ค้นหาสื่อ</label><div className="relative w-full"><Search className="absolute left-4 top-3.5 h-5 w-5 text-[#66758A]"/><input id="global-search" name="q" className="field pl-12" placeholder="ค้นหาเกม ใบงาน แบบฝึกหัด..."/></div></form>
      <nav aria-label="เมนูหลัก" className="hidden items-center gap-1 xl:flex">{links.map(([href,label])=><Link className="min-h-11 rounded-xl px-3 py-3 font-semibold text-[#14243D] hover:bg-[#EEF4FF] hover:text-[#0F5BD8]" href={href} key={href+label}>{label}</Link>)}</nav>
      <div className="ml-auto hidden items-center gap-2 sm:flex">
        <Link href="/favorites" className="btn px-3" aria-label="รายการโปรด"><Heart className="h-5 w-5"/></Link>
        <Link href="/cart" className="btn px-3" aria-label="ตะกร้าสินค้า"><ShoppingCart className="h-5 w-5"/></Link>
        <Link href="/login" className="btn btn-secondary"><UserRound className="h-4 w-4"/>เข้าสู่ระบบ</Link>
      </div>
      <details className="relative ml-auto xl:hidden"><summary className="btn btn-secondary list-none px-3" aria-label="เปิดเมนู"><Menu/></summary><div className="soft-card absolute right-0 top-14 w-64 p-3">{links.map(([href,label])=><Link className="block rounded-xl p-3 font-semibold hover:bg-[#EEF4FF]" href={href} key={href+label}>{label}</Link>)}<div className="border-t border-[#E1E8F2] pt-2"><Link className="block rounded-xl p-3" href="/login">เข้าสู่ระบบ</Link></div></div></details>
    </div>
  </header>;
}
