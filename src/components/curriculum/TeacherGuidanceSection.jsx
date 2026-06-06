import { Lightbulb, ListOrdered, ClipboardCheck, AlertTriangle, MessageCircle, Users, Layout } from "lucide-react";

export default function TeacherGuidanceSection({ guidance }) {
  if (!guidance) return null;
  const {
    how_to_introduce,
    step_by_step_delivery,
    board_layout,
    common_mistakes,
    checking_understanding,
    differentiation_tips,
    classroom_language,
  } = guidance;

  return (
    <div className="bg-emerald-500/5 border-2 border-emerald-500/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-emerald-600" />
        <h3 className="font-bold text-foreground">Teacher Guidance</h3>
        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700">
          For new teachers
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        Practical, step-by-step help — written so even a student teacher or teacher on attachment can deliver this lesson with confidence.
      </p>

      <Block icon={<MessageCircle className="w-4 h-4" />} title="How to Introduce the Lesson" text={how_to_introduce} />
      <Block icon={<ListOrdered className="w-4 h-4" />} title="Step-by-Step Delivery" items={step_by_step_delivery} ordered />
      <Block icon={<Layout className="w-4 h-4" />} title="Suggested Board Layout" text={board_layout} />
      <Block icon={<AlertTriangle className="w-4 h-4" />} title="Common Mistakes & How to Correct Them" items={common_mistakes} />
      <Block icon={<ClipboardCheck className="w-4 h-4" />} title="Check Understanding" items={checking_understanding} />
      <Block icon={<Users className="w-4 h-4" />} title="Differentiation Tips" items={differentiation_tips} />
      <Block icon={<MessageCircle className="w-4 h-4" />} title="Classroom Phrases You Can Use" items={classroom_language} quote />
    </div>
  );
}

function Block({ icon, title, text, items, ordered, quote }) {
  if (!text && !items?.length) return null;
  return (
    <div className="bg-card rounded-xl p-3 border border-border">
      <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-1 flex items-center gap-1.5">
        <span className="text-emerald-600">{icon}</span>{title}
      </p>
      {text && <p className="text-sm text-foreground whitespace-pre-wrap">{text}</p>}
      {items?.length > 0 && (
        ordered ? (
          <ol className="list-decimal pl-5 text-sm text-foreground space-y-1 mt-1">
            {items.map((it, i) => <li key={i}>{it}</li>)}
          </ol>
        ) : (
          <ul className={`pl-5 text-sm text-foreground space-y-1 mt-1 ${quote ? "list-none" : "list-disc"}`}>
            {items.map((it, i) => (
              <li key={i} className={quote ? "before:content-['“'] after:content-['”'] italic text-muted-foreground" : ""}>
                {it}
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}