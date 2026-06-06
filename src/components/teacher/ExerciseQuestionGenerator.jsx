import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Wand2, Loader2, CheckCircle2, Calculator, Target } from "lucide-react";
import { newQuestionId, QUESTION_TYPES } from "@/lib/exerciseHelpers";

const MAX_QUESTIONS = 40;

// Core numeracy skills (Grade 4–7) — mirrors backend + lesson picker.
const CORE_NUMERACY_SKILLS = [
  "Addition", "Subtraction", "Multiplication", "Division",
  "Estimation", "Comparison", "Ordering", "Measurement",
  "Conversion", "Fractions", "Data Interpretation", "Problem Solving",
];

const isMathSubject = (s) => String(s || "").toLowerCase().includes("math");

// Normalises an LLM-returned answer into a clean, auto-mark-friendly string.
function normaliseAnswer(qType, raw) {
  const s = String(raw || "").trim();
  if (qType === "true_false") {
    const lower = s.toLowerCase().replace(/[^a-z]/g, "");
    if (lower.startsWith("t")) return "true";
    if (lower.startsWith("f")) return "false";
    return "true";
  }
  return s;
}

export default function ExerciseQuestionGenerator({ prefill, difficulty, onAppend }) {
  const [count, setCount] = useState(10);
  const [qType, setQType] = useState("mcq");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [lastAddedCount, setLastAddedCount] = useState(0);
  const [skills, setSkills] = useState([]); // Maths only

  // Objective selection — defaults to ALL (empty selection = use all).
  const [selectedObjectives, setSelectedObjectives] = useState([]);

  const isMath = prefill ? isMathSubject(prefill.subject) : false;

  if (!prefill) return null;

  const toggleSkill = (s) => setSkills(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const toggleObjective = (o) => setSelectedObjectives(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o]);
  const objectives = prefill.learning_objectives || [];

  const generate = async () => {
    setErr("");
    setLoading(true);
    try {
      const n = Math.min(MAX_QUESTIONS, Math.max(1, Number(count) || 1));
      // Use selected objectives if any; otherwise use all topic objectives.
      const objectivesToUse = selectedObjectives.length > 0 ? selectedObjectives : objectives;
      const objectivesText = objectivesToUse.map(o => `- ${o}`).join("\n");
      const typeLabel = QUESTION_TYPES.find(t => t.value === qType)?.label || "Multiple Choice";

      const skillsBlock = (isMath && skills.length > 0)
        ? `\nNUMERACY SKILLS TO PRACTISE (mandatory):
The questions MUST visibly practise these underlying numeracy skill(s): ${skills.join(", ")}.
Every question's calculation/operation must exercise one or more of these skills using the topic "${prefill.topic}${prefill.subtopic ? " — " + prefill.subtopic : ""}" as the context.`
        : "";

      const objectivesFocus = selectedObjectives.length > 0
        ? `\nFOCUS OBJECTIVES (mandatory):
The questions MUST focus ONLY on these specific learning objective(s) from the topic. Do not cover other objectives:`
        : `\nLearning objectives the questions must cover:`;

      const prompt = `You are creating ${n} ${typeLabel} questions for a ${prefill.grade || ""} ${prefill.subject || ""} exercise in the Zimbabwean Heritage-Based Curriculum.

Topic: ${prefill.topic}${prefill.subtopic ? " — " + prefill.subtopic : ""}
${prefill.curriculum_code ? "Curriculum code: " + prefill.curriculum_code : ""}
Difficulty: ${difficulty || "mixed"}
${objectivesFocus}
${objectivesText || "(general topic knowledge)"}
${skillsBlock}

Rules:
- Use age-appropriate Zimbabwean context where natural.
- EVERY question MUST include a correct_answer — this is used for automatic marking. Never leave it blank.
- For MCQ: provide exactly 4 plausible options and one correct_answer that EXACTLY matches one option (same text, same capitalisation).
- For true_false: correct_answer must be EXACTLY the lowercase string "true" or "false" — nothing else (no punctuation, no capitalisation).
- For fill_blank / short_answer: correct_answer should be the expected short text answer (1–5 words).
- Each question carries 1 mark.
- Spread difficulty appropriately across the set.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  prompt: { type: "string" },
                  options: { type: "array", items: { type: "string" } },
                  correct_answer: { type: "string" },
                  difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                },
                required: ["prompt", "correct_answer"],
              },
            },
          },
          required: ["questions"],
        },
      });

      const raw = Array.isArray(res?.questions) ? res.questions.slice(0, n) : [];
      if (raw.length === 0) {
        setErr("No questions returned. Try again or pick a different type.");
        return;
      }

      const mapped = raw
        .map(q => ({
          id: newQuestionId(),
          type: qType,
          prompt: String(q.prompt || "").trim(),
          options: qType === "mcq" ? (Array.isArray(q.options) ? q.options.map(o => String(o)) : []) : [],
          correct_answer: normaliseAnswer(qType, q.correct_answer),
          difficulty: ["easy", "medium", "hard"].includes(q.difficulty) ? q.difficulty : "medium",
          marks: 1,
        }))
        .filter(q => q.prompt && q.correct_answer);

      if (mapped.length === 0) {
        setErr("Generated questions were incomplete. Please try again.");
        return;
      }

      onAppend(mapped);
      setLastAddedCount(mapped.length);
    } catch (e) {
      setErr(e?.message || "Failed to generate questions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-violet-500/5 border-2 border-violet-500/20 rounded-2xl p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Wand2 className="w-4 h-4 text-violet-600" />
        <p className="text-sm font-bold text-foreground">Generate questions from this topic</p>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Uses the learning objectives of <span className="font-semibold">{prefill.topic}</span> to create up to {MAX_QUESTIONS} auto-markable questions.
      </p>

      {/* Objective picker — applies to ALL subjects */}
      {objectives.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-primary" />
            <p className="text-[11px] font-bold text-primary uppercase tracking-wide">
              Focus objectives
            </p>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {selectedObjectives.length === 0 ? "All objectives" : `${selectedObjectives.length} selected`}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Pick one or more objectives to focus on. Leave empty to cover all objectives.
          </p>
          <div className="space-y-1">
            {objectives.map((o, i) => {
              const isOn = selectedObjectives.includes(o);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleObjective(o)}
                  className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition flex items-start gap-2 ${
                    isOn
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/40"
                  }`}
                >
                  <span className={`flex-shrink-0 w-4 h-4 rounded border ${isOn ? "bg-white border-white" : "border-border"} flex items-center justify-center mt-0.5`}>
                    {isOn && <CheckCircle2 className="w-3 h-3 text-primary" />}
                  </span>
                  <span className="flex-1">{o}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Maths: numeracy skills */}
      {isMath && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 space-y-2">
          <div className="flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5 text-amber-600" />
            <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">
              Numeracy skills to practise
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Pick the skill(s) these questions must practise. Leave empty to let the AI choose based on the topic.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {CORE_NUMERACY_SKILLS.map(s => {
              const isOn = skills.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSkill(s)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition text-left ${
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
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">Question type</label>
          <select
            value={qType}
            onChange={e => setQType(e.target.value)}
            className="w-full border border-border rounded-xl px-2 py-2 text-sm bg-background text-foreground"
          >
            {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground block mb-1">How many? (1–{MAX_QUESTIONS})</label>
          <input
            type="number"
            min={1}
            max={MAX_QUESTIONS}
            value={count}
            onChange={e => setCount(Math.min(MAX_QUESTIONS, Math.max(1, Number(e.target.value) || 1)))}
            className="w-full border border-border rounded-xl px-2 py-2 text-sm bg-background text-foreground"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Wand2 className="w-4 h-4" /> Generate {count} question{count !== 1 ? "s" : ""}</>}
      </button>

      {err && <p className="text-xs text-destructive">{err}</p>}

      {lastAddedCount > 0 && !loading && !err && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-800">
            <p className="font-bold">{lastAddedCount} question{lastAddedCount !== 1 ? "s" : ""} added below</p>
            <p>Review them, then tap <span className="font-bold">Create Exercise</span> at the bottom to save.</p>
          </div>
        </div>
      )}
    </div>
  );
}