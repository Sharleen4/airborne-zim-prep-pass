import { sectionLabel } from "@/lib/lessonExporters";

// Reusable editable section. Two flavours: text (textarea) or list (one item per line).
export default function LessonPlanSection({ sectionKey, value, onChange, mode = "text", label }) {
  const displayLabel = label || sectionLabel(sectionKey);

  if (mode === "list") {
    const text = Array.isArray(value) ? value.join("\n") : (value || "");
    return (
      <div>
        <label className="font-bold text-sm text-foreground mb-1 block">{displayLabel}</label>
        <textarea
          value={text}
          onChange={(e) => onChange(e.target.value.split("\n").map(l => l.trim()).filter(Boolean))}
          rows={Math.max(3, (text.match(/\n/g)?.length || 0) + 2)}
          placeholder="One item per line"
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground resize-y"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="font-bold text-sm text-foreground mb-1 block">{displayLabel}</label>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={Math.max(3, ((value || "").match(/\n/g)?.length || 0) + 3)}
        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground resize-y"
      />
    </div>
  );
}