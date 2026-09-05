"use client";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";

export function RouteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isolated = pathname.startsWith("/admin");
  return <>{!isolated && <SiteHeader />}<main id="main">{children}</main>{!isolated && <><SiteFooter /><MobileNav /></>}</>;
}
