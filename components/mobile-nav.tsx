"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Library, Search, ShoppingBag, UserRound } from "lucide-react";

const items = [["/", Home, "หน้าแรก"], ["/media", Search, "ค้นหา"], ["/my-library", Library, "คลังของฉัน"], ["/cart", ShoppingBag, "ตะกร้า"], ["/account", UserRound, "บัญชี"]] as const;
export function MobileNav() {
  const pathname = usePathname();
  return <nav aria-label="เมนูมือถือ" className="mobile-bottom-nav">{items.map(([href, Icon, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}><Icon size={20} /><span>{label}</span></Link>)}</nav>;
}
