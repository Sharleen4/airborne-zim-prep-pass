import { useState, useEffect } from "react";
import { X, Layers, Sparkles, Calculator } from "lucide-react";

const CORE_NUMERACY_SKILLS = [
  "Addition", "Subtraction", "Multiplication", "Division",
  "Estimation", "Comparison", "Ordering", "Measurement",
  "Conversion", "Fractions", "Data Interpretation", "Problem Solving",
];

const isMathSubject = (s) => String(s || "").toLowerCase().includes("math");

/**
 * Lets the teacher split a topic / objective into N sequential lessons,
 * then pick which part to generate first. For Mathematics topics the teacher
 * can also assign DIFFERENT numeracy skills to EACH part inline
 * (e.g. Part 1: Identify + Compare, Part 2: Addition, Part 3: Subtraction).
 */
export default function SplitLessonModal({ initial, onClose, onConfirm }) {
  const { topic, target_objective } = initial || {};
  const isMath = isMathSubject(topic?.subject);

  const [totalParts, setTotalParts] = useState(Math.max(2, initial?.total_parts || 2));
  const [partNumber, setPartNumber] = useState(1);
  // skillsByPart: { 1: ["Addition"], 2: ["Subtraction"], ... } — Maths only
  const [skillsByPart, setSkillsByPart] = useState({});

  // When the total changes, prune any skill entries above the new total.
  useEffect(() => {
    setSkillsByPart(prev => {
      const next = {};
      for (let i = 1; i <= totalParts; i++) if (prev[i]) next[i] = prev[i];
      return next;
    });
    if (partNumber > totalParts) setPartNumber(1);
  }, [totalParts]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusLabel = (target_objective && target_objective.trim())
    || (topic?.subtopic ? `${topic.topic} — ${topic.subtopic}` : topic?.topic)
    || "this topic";

  const toggleSkillForPart = (part, skill) => {
    setSkillsByPart(prev => {
      const current = new Set(prev[part] || []);
      if (current.has(skill)) current.delete(skill);
      else current.add(skill);
      return { ...prev, [part]: [...current] };
    });
  };

  const currentPartSkills = skillsByPart[partNumber] || [];

  return (
    <div className="fixed inset-0 z-[250] bg-black/60 flex items-end sm:items-center sm:justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-card text-foreground w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-foreground">Split into multiple lessons</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5" title={focusLabel}>
                {focusLabel}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">How many lessons?</p>
            <div className="grid grid-cols-5 gap-2">
              {[2, 3, 4, 5, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setTotalParts(n)}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition ${
                    totalParts === n
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Generate which part now?</p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: totalParts }, (_, i) => i + 1).map(n => {
                const partSkills = skillsByPart[n] || [];
                return (
                  <button
                    key={n}
                    onClick={() => setPartNumber(n)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold border transition ${
                      partNumber === n
                        ? "bg-primary text-white border-primary"
                        : "bg-background text-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    Part {n}
                    {isMath && partSkills.length > 0 && (
                      <span className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${partNumber === n ? "bg-white/25" : "bg-amber-500/20 text-amber-700"}`}>
                        {partSkills.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Tip: generate Part 1 first, then come back and pick Part {Math.min(2, totalParts)} for the next lesson.
            </p>
          </div>

          {/* Maths-only: pick the numeracy skills for the CURRENTLY selected part.
              Different parts can have different skills (e.g. Part 1: Comparison,
              Part 2: Addition, Part 3: Subtraction). */}
          {isMath && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
                  Numeracy skills for Part {partNumber}
                </p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Pick the skill(s) THIS specific lesson must practise. You can give each part different skills.
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {CORE_NUMERACY_SKILLS.map(s => {
                  const isOn = currentPartSkills.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleSkillForPart(partNumber, s)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition text-left ${
                        isOn
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-background text-foreground border-border hover:border-amber-400"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {currentPartSkills.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">
                  No skills picked for Part {partNumber} — the AI will choose based on the topic.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            onClick={() => onConfirm({
              part_number: partNumber,
              total_parts: totalParts,
              skills_by_part: isMath ? skillsByPart : undefined,
              numeracy_skills: isMath ? (skillsByPart[partNumber] || []) : undefined,
            })}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-primary text-white inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Generate Part {partNumber} of {totalParts}
          </button>
        </div>
      </div>
    </div>
  );
}