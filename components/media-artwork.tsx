import { BookOpen, ClipboardList, FlaskConical, Gamepad2, Presentation } from "lucide-react";

export function MediaArtwork({ title, subject, mediaType, className = "", compact = false, demo = false }: {
  title: string; subject: string; mediaType: string; accent?: string; className?: string; compact?: boolean; demo?: boolean;
}) {
  const theme = /สุริยะ|อวกาศ|ดาวเคราะห์/.test(title) ? "space" : subject.includes("วิทยาศาสตร์") ? "science" : /ภาษา/.test(subject) ? "language" : "math";
  const Icon = mediaType.includes("เกม") ? Gamepad2 : /powerpoint/i.test(mediaType) ? Presentation : /ใบงาน|แบบฝึก/.test(mediaType) ? ClipboardList : theme === "science" ? FlaskConical : BookOpen;
  return <div aria-hidden="true" data-subject={theme} className={`media-cover ${compact ? "media-cover-compact" : ""} ${className}`}>
    <div className="media-cover-object"><Icon strokeWidth={1.5} /></div><div className="media-cover-orb" />
    <div className="media-cover-content">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="media-cover-subject">{subject}</span>
        {demo && (
          <span className="rounded-md bg-[#14243D]/75 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            ตัวอย่าง
          </span>
        )}
      </div>
      <div><p className="media-cover-title line-clamp-2">{title}</p>{!compact && <p className="media-cover-type">{mediaType} · KruPo</p>}</div>
    </div>
  </div>;
}
