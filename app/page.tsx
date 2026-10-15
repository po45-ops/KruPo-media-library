import Link from "next/link";
import { ArrowRight, BookOpen, Calculator, Flame, FlaskConical, Gamepad2, Landmark, Languages, Monitor, Search, ShieldCheck, Sparkles } from "lucide-react";
import { LearningJourney } from "@/components/learning-journey";
import { AuthCard } from "@/components/auth-card";
import { MediaCard } from "@/components/media-card";
import { subjects } from "@/features/catalog/demo-media";
import { listPublishedMedia } from "@/server/repositories/catalog-repository";

const subjectIcons = [Calculator, FlaskConical, Languages, BookOpen, Landmark, Monitor];

export default async function HomePage() {
  const media = await listPublishedMedia({ limit: 12 });
  const freeMedia = media.filter(item => item.accessType === "free");
  const trendingMedia = media.slice(0, 3);

  return <>
    <LearningJourney />
    <section id="start-learning" className="scroll-mt-24" aria-label="เริ่มใช้งาน KruPo">
      <AuthCard mode="login" next="/my-library" />
    </section>

    {/* Netflix Shelf 1: Trending Now */}
    <section className="container-page py-14">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5 border-l-4 border-[#E50914] pl-4">
        <div>
          <p className="design-eyebrow flex items-center gap-1.5"><Flame size={14} className="text-[#E50914]" /> กำลังมาแรงในสัปดาห์นี้</p>
          <h2 className="section-title">สื่อแนะนำสำหรับคุณ</h2>
        </div>
        <Link href="/media" className="btn btn-secondary text-xs sm:text-sm">
          สื่อทั้งหมด <ArrowRight size={17} />
        </Link>
      </div>
      {trendingMedia.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {trendingMedia.map(item => <MediaCard media={item} key={item.id} />)}
        </div>
      ) : (
        <div className="soft-card p-10 text-center text-[#94A3B8]">ยังไม่มีสื่อที่ผ่านการอนุมัติ</div>
      )}
    </section>

    {/* Netflix Shelf 2: Search & Browse by Subject */}
    <section className="container-page pb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5 border-l-4 border-[#E50914] pl-4">
        <div>
          <p className="design-eyebrow">หมวดหมู่วิชายอดนิยม</p>
          <h2 className="section-title">ค้นพบสื่อที่เหมาะกับห้องเรียนคุณ</h2>
          <p className="mt-1 text-sm text-[#94A3B8]">เลือกวิชาที่ต้องการ เพื่อค้นหาไอเดียและบทเรียนทันที</p>
        </div>
      </div>
      <form action="/media" className="home-search">
        <Search size={20} className="text-[#94A3B8]" aria-hidden="true" />
        <label htmlFor="hero-search" className="sr-only">ค้นหาสื่อ</label>
        <input id="hero-search" name="q" placeholder="ค้นหาเกม ใบงาน หรือบทเรียน..." />
        <button className="btn btn-primary" type="submit">ค้นหา</button>
      </form>
      <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {subjects.map((subject, i) => {
          const Icon = subjectIcons[i] ?? BookOpen;
          return (
            <Link key={subject} href={`/media?subject=${encodeURIComponent(subject)}`} className="subject-tile group">
              <span><Icon size={22} className="transition-transform group-hover:scale-110" /></span>
              {subject}
            </Link>
          );
        })}
      </div>
    </section>

    {/* Netflix Shelf 3: Free Resources Showcase */}
    {freeMedia.length > 0 && (
      <section className="container-page pb-16">
        <div className="mb-7 flex items-end justify-between gap-5 border-l-4 border-[#10B981] pl-4">
          <div>
            <p className="design-eyebrow !text-[#10B981]">พร้อมใช้งานได้ทันที</p>
            <h2 className="section-title">สื่อฟรีสำหรับคุณครู</h2>
          </div>
          <Link href="/media?price=free" className="text-sm font-semibold text-[#34D399] hover:underline">
            เลือกสื่อฟรี <ArrowRight className="inline h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {freeMedia.slice(0, 3).map(item => <MediaCard media={item} key={`free-${item.id}`} />)}
        </div>
      </section>
    )}

    {/* KruPo Studio / Creator Invitation Banner */}
    <section className="container-page pb-16">
      <div className="creator-invitation">
        <div>
          <p className="design-eyebrow">KRUPO CREATOR STUDIO</p>
          <h2 className="section-title">ไอเดียของคุณ ไปได้อีกหลายห้องเรียน</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#94A3B8]">
            ร่วมแบ่งปันสื่อที่คุณตั้งใจทำ จัดการผลงาน และสร้างรายได้จากพื้นที่ผู้สร้างมืออาชีพ
          </p>
        </div>
        <Link className="btn btn-primary shrink-0" href="/creator">
          เริ่มเป็นผู้สร้าง <ArrowRight size={17} />
        </Link>
      </div>
    </section>

    {/* Quality and Trust Pillars */}
    <section className="container-page pb-16">
      <div className="grid gap-7 md:grid-cols-3">
        {[
          [ShieldCheck, "เลือกสื่อได้อย่างมั่นใจ", "มีขั้นตอนตรวจสอบสื่อและระบบสิทธิ์สำหรับบัญชีของคุณ"],
          [Sparkles, "สนับสนุนผู้สร้างไทย", "ทุกไอเดียที่ดีมีโอกาสสร้างคุณค่าให้กับห้องเรียน"],
          [Gamepad2, "พร้อมนำไปเรียนรู้", "ทั้งเกม ใบงาน และบทเรียน เลือกให้เหมาะกับผู้เรียน"],
        ].map(([Icon, heading, text]) => {
          const FeatureIcon = Icon as typeof ShieldCheck;
          return (
            <div className="home-feature soft-card p-6 border border-white/5" key={heading as string}>
              <FeatureIcon size={28} className="text-[#E50914]" />
              <h3 className="mt-4 text-base font-bold text-white">{heading as string}</h3>
              <p className="mt-2 text-sm text-[#94A3B8] leading-relaxed">{text as string}</p>
            </div>
          );
        })}
      </div>
    </section>
  </>;
}
