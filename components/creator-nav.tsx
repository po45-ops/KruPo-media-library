import Link from "next/link";
import { BookOpen, LayoutDashboard, Plus, UserRound, Wallet } from "lucide-react";
const items = [
  ["/creator", LayoutDashboard, "ภาพรวม"],
  ["/creator#creator-submissions", BookOpen, "สื่อและสถานะการตรวจ"],
  ["/creator/media/new", Plus, "เพิ่มสื่อใหม่"],
  ["/creator#creator-earnings", Wallet, "รายได้"],
  ["/account", UserRound, "ข้อมูลบัญชี"],
] as const;
export function CreatorNav() {
  return <nav aria-label="เมนูผู้สร้าง" className="creator-navigation">{items.map(([href, Icon, label]) => <Link key={href} href={href}><Icon size={17} />{label}</Link>)}</nav>;
}
