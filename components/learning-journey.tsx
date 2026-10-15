"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, BookOpen, Mouse, Pause, Play, Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LearningScene } from "@/components/learning-scene";

const chapters = [
  { title: <>สื่อการสอนคุณภาพ<br />ให้ทุกห้องเรียน<br /><em>มีชีวิตขึ้นมา</em></>, text: "เกม ใบงาน และบทเรียนที่ชวนให้เด็ก ๆ อยากเรียนรู้ และช่วยให้ครูเตรียมสอนได้ง่ายขึ้น", label: "ค้นพบ" },
  { title: <>จากคำถามเล็ก ๆ<br />สู่ช่วงเวลา<br /><em>ที่อยากเรียนรู้</em></>, text: "ลองคิด เล่น และค้นพบคำตอบด้วยตัวเอง ผ่านสื่อที่เปลี่ยนเนื้อหาให้เป็นประสบการณ์", label: "เล่นและเรียน" },
  { title: <>เก็บไอเดียที่ใช่<br />แล้วพาไปสนุก<br /><em>ในห้องเรียนคุณ</em></>, text: "เลือกสื่อที่ตรงกับห้องเรียน แล้วเก็บไว้ในบัญชีของคุณ พร้อมกลับมาเปิดใช้ได้ทุกวัน", label: "เริ่มต้น" },
];

export function LearningJourney() {
  const section = useRef<HTMLElement>(null);
  const [chapter, setChapter] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      const pin = element.querySelector<HTMLElement>(".journey-pin");
      if (!pin) return;
      const headerHeight = parseFloat(getComputedStyle(pin).top) || 72;
      const distance = Math.max(1, element.offsetHeight - pin.offsetHeight);
      const progress = Math.max(0, Math.min(1, (headerHeight - element.getBoundingClientRect().top) / distance));
      const motion = paused || preference.matches ? 0 : progress;
      element.style.setProperty("--journey-progress", String(progress));
      element.style.setProperty("--scene-turn", `${-18 + motion * 34}deg`);
      element.style.setProperty("--scene-tilt", `${8 - motion * 13}deg`);
      element.style.setProperty("--scene-rise", `${Math.sin(motion * Math.PI) * -24}px`);
      element.style.setProperty("--scene-drift", `${motion * 55}px`);
      setChapter(Math.min(2, Math.floor(progress * 3)));
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    preference.addEventListener("change", schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); preference.removeEventListener("change", schedule); };
  }, [paused]);

  function jump(index: number) {
    const element = section.current;
    const pin = element?.querySelector<HTMLElement>(".journey-pin");
    if (!element || !pin) return;
    const top = parseFloat(getComputedStyle(pin).top) || 72;
    window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - top + (element.offsetHeight - pin.offsetHeight) * (index / 3 + .02), behavior: paused || matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  return <section className="learning-journey" ref={section} aria-label="เปิดโลกการเรียนรู้กับ KruPo">
    <div className="journey-pin"><div className="container-page journey-content">
      <div className="journey-copy">
        <span className="journey-tag"><BookOpen size={16} />พื้นที่เล็ก ๆ ของการเรียนรู้ที่ยิ่งใหญ่</span>
        <h1>{chapters[chapter].title}</h1>
        <p className="journey-description">{chapters[chapter].text}</p>
        <form action="/media" className="home-search journey-search-form">
          <Search size={19} className="text-[#66758A] shrink-0" aria-hidden="true" />
          <label htmlFor="journey-search-input" className="sr-only">ค้นหาสื่อ</label>
          <input
            id="journey-search-input"
            name="q"
            type="search"
            placeholder="ค้นหาเกม ใบงาน หรือบทเรียน..."
          />
          <button type="submit" className="btn btn-primary" style={{ padding: "8px 18px", fontSize: "14px" }}>
            ค้นหา
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-3">
          <a className="btn btn-primary" href="#start-learning">เริ่มใช้งาน <ArrowDown size={17} /></a>
          <Link className="btn btn-secondary" href="/media">ดูสื่อทั้งหมด <ArrowRight size={17} /></Link>
          <Link className="btn border border-[#BFE9D8] bg-[#F0FBF7] text-[#13845B] hover:bg-[#DDF7EC]" href="/media?price=free">สื่อฟรี</Link>
        </div>
      </div>
      <LearningScene />
      <div className="journey-controls"><span className="journey-scroll-hint"><Mouse size={17} />เลื่อนลง แล้วออกเดินทางไปด้วยกัน</span>
        <div className="flex items-center gap-2">
          <button className="motion-toggle" type="button" onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? "เปิดการเคลื่อนไหว" : "หยุดการเคลื่อนไหว"}>{paused ? <Play size={15} /> : <Pause size={15} />}</button>
          {chapters.map((item, i) => <button type="button" key={item.label} className={`journey-step ${i === chapter ? "is-active" : ""}`} onClick={() => jump(i)} aria-label={`ช่วงที่ ${i + 1} ${item.label}`} aria-current={i === chapter ? "step" : undefined}>{String(i + 1).padStart(2, "0")}</button>)}
        </div>
      </div>
    </div><div className="journey-progress" /></div>
  </section>;
}
