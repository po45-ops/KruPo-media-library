"use client";
import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MobileNav } from "@/components/mobile-nav";

export function RouteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isolated = pathname.startsWith("/admin");
  const immersive = pathname === "/";
  const auth = ["/login", "/register", "/forgot-password", "/reset-password"].includes(pathname);
  return <>{!isolated && <SiteHeader />}<main id="main" className={isolated ? "admin-workspace" : ""}><div key={pathname} className={immersive ? undefined : `route-arrival ${auth ? "auth-arrival" : ""}`}>{children}</div></main>{!isolated && <><SiteFooter /><MobileNav /></>}</>;
}
