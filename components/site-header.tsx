"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useState } from "react";

const links = [["/media", "ค้นหาสื่อ"], ["/media?price=free", "สื่อฟรี"], ["/games", "เกมการศึกษา"], ["/creator", "สำหรับผู้สร้าง"]] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;
  return <header className="site-header">
    <div className="container-page header-inner">
      <Link href="/" aria-label="KruPo คลังสื่อ หน้าแรก" className="header-logo"><Image src="/brand/logo.svg" alt="KruPo คลังสื่อ" width={157} height={42} priority /></Link>
      <nav className="desktop-links" aria-label="เมนูหลัก">{links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}</nav>
      <div className="header-actions">
        <Link href="/media" className="header-icon header-search" aria-label="ค้นหาสื่อ"><Search size={19} /></Link>
        <Link href="/cart" className="header-icon" aria-label="ตะกร้าสินค้า"><ShoppingBag size={19} /></Link>
        <Link href="/account" className="header-icon" aria-label="บัญชีของฉัน"><UserRound size={19} /></Link>
        <Link href="/login" className="btn btn-primary header-login">เข้าสู่ระบบ</Link>
        <button type="button" className="header-icon header-menu" onClick={() => setOpenPath(open ? null : pathname)} aria-label={open ? "ปิดเมนู" : "เปิดเมนู"} aria-expanded={open} aria-controls="mobile-header-menu">{open ? <X size={21} /> : <Menu size={21} />}</button>
      </div>
    </div>
    {open && <nav id="mobile-header-menu" className="mobile-header-menu container-page" aria-label="เมนูเพิ่มเติม">{[...links, ["/my-library", "สื่อของฉัน"], ["/favorites", "รายการโปรด"], ["/login", "เข้าสู่ระบบ"]].map(([href, label]) => <Link href={href} key={href} onClick={() => setOpenPath(null)}>{label}</Link>)}</nav>}
  </header>;
}
