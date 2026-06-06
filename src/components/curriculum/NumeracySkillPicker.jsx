import { useState } from "react";
import { X, Calculator, Sparkles } from "lucide-react";

// The 12 core numeracy skills taught across Grades 4–7 (must match backend list).
const CORE_NUMERACY_SKILLS = [
  "Addition", "Subtraction", "Multiplication", "Division",
  "Estimation", "Comparison", "Ordering", "Measurement",
  "Conversion", "Fractions", "Data Interpretation", "Problem Solving",
];

// Suggested underlying skills per topic keyword — used to pre-highlight the
// most relevant skills for the chosen topic. Mirrors the backend mapping.
const SUGGESTED_BY_TOPIC = [
  { match: ["fraction"], skills: ["Addition", "Subtraction", "Multiplication", "Division"] },
  { match: ["money", "currency"], skills: ["Addition", "Subtraction", "Multiplication", "Division"] },
  { match: ["time"], skills: ["Addition", "Subtraction"] },
  { match: ["area"], skills: ["Multiplication"] },
  { match: ["perimeter"], skills: ["Addition"] },
  { match: ["volume", "capacity"], skills: ["Multiplication", "Division"] },
  { match: ["percentage", "percent"], skills: ["Fractions", "Multiplication", "Division"] },
  { match: ["graph", "chart", "pictograph", "bar graph"], skills: ["Data Interpretation"] },
  { match: ["rate", "speed"], skills: ["Multiplication", "Division"] },
];

function detectSuggested(topic) {
  const hay = `${topic?.topic || ""} ${topic?.subtopic || ""}`.toLowerCase();
  const found = new Set();
  for (const row of SUGGESTED_BY_TOPIC) {
    if (row.match.some(k => hay.includes(k))) row.skills.forEach(s => found.add(s));
  }
  return [...found];
}

/**
 * Lets the teacher choose which underlying numeracy skill(s) the lesson should
 * focus on (e.g. Addition, Division). Suggested skills for the topic are
 * pre-selected — teacher can change at will.
 */
export default function NumeracySkillPicker({ topic, onClose, onConfirm }) {
  const suggested = detectSuggested(topic);
  const [selected, setSelected] = useState(new Set(suggested));

  const toggle = (s) => {
    const next = new Set(selected);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setSelected(next);
  };

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 flex items-end sm:items-center sm:justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card text-foreground w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 sticky top-0 bg-card">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground">Choose numeracy skills</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {topic?.topic}{topic?.subtopic ? ` — ${topic.subtopic}` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Pick the underlying numeracy skill(s) this lesson must practise. The lesson plan will be built around the skill(s) you choose — not just the topic name.
          </p>

          {suggested.length > 0 && (
            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2.5 py-1.5">
              💡 Suggested for this topic: {suggested.join(", ")}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2">
            {CORE_NUMERACY_SKILLS.map(s => {
              const isOn = selected.has(s);
              const isSuggested = suggested.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggle(s)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-bold border transition text-left ${
                    isOn
                      ? "bg-primary text-white border-primary"
                      : `bg-background text-foreground border-border hover:border-primary/40 ${isSuggested ? "ring-1 ring-amber-400/50" : ""}`
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-card">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            onClick={() => onConfirm([...selected])}
            disabled={selected.size === 0}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white inline-flex items-center gap-2 disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" /> Generate ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}