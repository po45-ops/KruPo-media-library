import { BookOpen, Gamepad2, Sparkles } from "lucide-react";

/** Decorative CSS scene: no WebGL, external assets, or continuous animation loop. */
export function LearningScene({ compact = false }: { compact?: boolean }) {
  return <div className={`learning-scene ${compact ? "learning-scene-compact" : ""}`} aria-hidden="true">
    <div className="scene-orbit" /><div className="scene-orbit scene-orbit-two" />
    <div className="scene-book scene-book-mint">เรียนรู้ทุกวัน</div>
    <div className="scene-book">ไอเดียห้องเรียน</div>
    <div className="scene-tablet"><div className="scene-screen">
      <div className="scene-brand"><BookOpen size={18} /> KruPo</div>
      <p className="scene-title">วันนี้จะเรียนรู้<br />อะไรดี?</p>
      <p className="scene-caption">ค้นพบเรื่องสนุกได้ทุกวัน</p>
      <div className="scene-lesson"><span className="scene-shape">+</span><span>คิดเลขให้สนุก<small>เกมคณิตศาสตร์</small></span></div>
      <div className="scene-lesson"><span className="scene-shape scene-shape-purple">Aa</span><span>เปิดโลกคำศัพท์<small>ภาษาอังกฤษ</small></span></div>
      <div className="scene-lesson"><span className="scene-shape scene-shape-mint"><Gamepad2 size={22} /></span><span>เรียนรู้รอบตัว<small>ใบงานและกิจกรรม</small></span></div>
    </div></div>
    <div className="scene-note"><strong>12 + 8 = ?</strong><span>คิดได้ สนุกด้วย</span><i /><i /><i /></div>
    <div className="scene-sphere" /><div className="scene-cube" />
    <div className="scene-label"><Sparkles size={16} />ทุกไอเดีย เริ่มเรียนรู้ได้</div>
  </div>;
}
