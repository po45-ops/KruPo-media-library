import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, FlaskConical, Gamepad2, Landmark, Languages, Monitor, Search, ShieldCheck, Sparkles } from "lucide-react";
import { LearningJourney } from "@/components/learning-journey";
import { AuthCard } from "@/components/auth-card";
import { MediaCard } from "@/components/media-card";
import { subjects } from "@/features/catalog/demo-media";
import { listPublishedMedia } from "@/server/repositories/catalog-repository";

const subjectIcons = [Calculator, FlaskConical, Languages, BookOpen, Landmark, Monitor];

export default async function HomePage() {
  const media = await listPublishedMedia({ limit: 6 });
  return <>
    <LearningJourney />
    <section id="start-learning" className="scroll-mt-24" aria-label="เริ่มใช้งาน KruPo"><AuthCard mode="login" next="/my-library" /></section>
    <section className="container-page py-14">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="design-eyebrow">FIND YOUR NEXT CLASSROOM IDEA</p><h2 className="section-title">ค้นพบสื่อที่เหมาะกับห้องเรียนคุณ</h2><p className="mt-2 text-sm text-[#66758A]">เริ่มจากวิชาที่สนใจ หรือค้นหาไอเดียที่อยากลอง</p></div><Link href="/media" className="btn btn-secondary">สื่อทั้งหมด <ArrowRight size={17} /></Link></div>
      <form action="/media" className="home-search"><Search size={20} aria-hidden="true" /><label htmlFor="hero-search" className="sr-only">ค้นหาสื่อ</label><input id="hero-search" name="q" placeholder="ค้นหาเกม ใบงาน หรือบทเรียน..." /><button className="btn btn-primary" type="submit">ค้นหา</button></form>
      <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">{subjects.map((subject, i) => { const Icon = subjectIcons[i] ?? BookOpen; return <Link key={subject} href={`/media?subject=${encodeURIComponent(subject)}`} className="subject-tile"><span><Icon size={23} /></span>{subject}</Link>; })}</div>
    </section>
    <section className="container-page pb-16"><div className="mb-7 flex items-end justify-between gap-5"><div><p className="design-eyebrow">MADE FOR CURIOUS MINDS</p><h2 className="section-title">สื่อแนะนำสำหรับคุณ</h2></div><Link href="/media?price=free" className="text-sm font-semibold text-[#315DDC]">เลือกสื่อฟรี <ArrowRight className="inline h-4 w-4" /></Link></div>
      {media.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{media.map(item => <MediaCard media={item} key={item.id} />)}</div> : <div className="soft-card p-10 text-center text-[#66758A]">ยังไม่มีสื่อที่ผ่านการอนุมัติ</div>}
    </section>
    <section className="container-page pb-16"><div className="creator-invitation"><div><p className="design-eyebrow">CREATE. SHARE. INSPIRE.</p><h2 className="section-title">ไอเดียของคุณ ไปได้อีกหลายห้องเรียน</h2><p className="mt-3 max-w-xl text-sm leading-7 text-[#66758A]">แบ่งปันสื่อที่คุณตั้งใจทำ จัดการผลงาน และติดตามรายได้จากพื้นที่ผู้สร้าง</p></div><Link className="btn btn-primary shrink-0" href="/creator">เริ่มเป็นผู้สร้าง <ArrowRight size={17} /></Link></div></section>
    <section className="container-page pb-16"><div className="grid gap-7 md:grid-cols-3">{[[ShieldCheck, "เลือกสื่อได้อย่างมั่นใจ", "มีขั้นตอนตรวจสอบสื่อและระบบสิทธิ์สำหรับบัญชีของคุณ"], [Sparkles, "สนับสนุนผู้สร้างไทย", "ทุกไอเดียที่ดีมีโอกาสสร้างคุณค่าให้กับห้องเรียน"], [Gamepad2, "พร้อมนำไปเรียนรู้", "ทั้งเกม ใบงาน และบทเรียน เลือกให้เหมาะกับผู้เรียน"]].map(([Icon, heading, text]) => { const FeatureIcon = Icon as typeof ShieldCheck; return <div className="home-feature" key={heading as string}><FeatureIcon size={25} /><h3>{heading as string}</h3><p>{text as string}</p></div>; })}</div></section>
  </>;
}
