import Link from "next/link";
import { Home, Library, Search, ShoppingCart, UserRound } from "lucide-react";
const items = [["/",Home,"หน้าแรก"],["/media",Search,"ค้นหา"],["/my-library",Library,"คลังของฉัน"],["/cart",ShoppingCart,"ตะกร้า"],["/account",UserRound,"บัญชี"]] as const;
export function MobileNav(){return <nav aria-label="เมนูมือถือ" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-[#E1E8F2] bg-white/95 px-1 py-1.5 backdrop-blur md:hidden">{items.map(([href,Icon,label])=><Link key={href} href={href} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold text-[#66758A] hover:bg-[#EEF4FF] hover:text-[#0F5BD8]"><Icon className="h-5 w-5"/>{label}</Link>)}</nav>}
