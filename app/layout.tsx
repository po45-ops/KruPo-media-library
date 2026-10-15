import type { Metadata, Viewport } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { RouteChrome } from "@/components/route-chrome";

const appName = process.env.NEXT_PUBLIC_APP_NAME || "KruPo คลังสื่อ";
const thaiFont = Noto_Sans_Thai({ subsets: ["thai", "latin"], display: "swap", variable: "--font-thai" });
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: `${appName} — สื่อดี ครบ ครูถูกใจ นักเรียนสนุก`, template: `%s | ${appName}` },
  description: "ตลาดสื่อการเรียนรู้และเกมการศึกษาสำหรับครูไทย ค้นหา ทดลอง และเก็บสื่อไว้ในคลังส่วนตัว",
  applicationName: appName,
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "th_TH", siteName: appName },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0B2F6B" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th" className={thaiFont.variable}><body><a href="#main" className="skip-link">ข้ามไปเนื้อหาหลัก</a><RouteChrome>{children}</RouteChrome></body></html>;
}
