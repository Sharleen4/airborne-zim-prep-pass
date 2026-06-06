import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, AlertTriangle } from "lucide-react";
import { QUESTION_TYPES, validateQuestion } from "@/lib/exerciseHelpers";

const DIFFS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

// One editable question row in the exercise builder.
export default function QuestionEditorRow({ index, question, onChange, onRemove }) {
  const update = (patch) => onChange({ ...question, ...patch });

  const updateOption = (i, value) => {
    const options = [...(question.options || [])];
    options[i] = value;
    update({ options });
  };

  const addOption = () => update({ options: [...(question.options || []), ""] });
  const removeOption = (i) => {
    const options = (question.options || []).filter((_, idx) => idx !== i);
    update({ options });
  };

  const errors = validateQuestion(question);
  const hasErrors = errors.length > 0;

  return (
    <div className={`border rounded-2xl p-3 space-y-2 ${hasErrors ? "bg-amber-50 border-amber-300" : "bg-secondary/40 border-border"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-muted-foreground">Q{index + 1}</span>
        <button type="button" onClick={onRemove} className="text-destructive p-1" title="Delete this question">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {hasErrors && (
        <div className="bg-amber-100 border border-amber-300 rounded-xl p-2 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 flex-1">
            <p className="font-bold mb-0.5">This question has issues — fix or delete it:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((er, i) => <li key={i}>{er}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Select value={question.type} onValueChange={(v) => update({ type: v, options: v === "mcq" ? (question.options?.length ? question.options : ["", ""]) : [], correct_answer: "" })}>
          <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            {QUESTION_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={question.difficulty || ""} onValueChange={(v) => update({ difficulty: v })}>
          <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            {DIFFS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Textarea
        rows={2}
        placeholder="Question prompt"
        value={question.prompt || ""}
        onChange={(e) => update({ prompt: e.target.value })}
      />

      {question.type === "mcq" && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground uppercase">Options (tap the dot to mark correct)</p>
          {(question.options || []).map((opt, i) => {
            const isCorrect = question.correct_answer === opt && opt !== "";
            return (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => update({ correct_answer: opt })}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${isCorrect ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/40"}`}
                  aria-label="Mark as correct"
                />
                <Input
                  value={opt}
                  placeholder={`Option ${i + 1}`}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    const wasCorrect = question.correct_answer === opt;
                    updateOption(i, newVal);
                    if (wasCorrect) update({ correct_answer: newVal });
                  }}
                />
                {(question.options.length > 2) && (
                  <button type="button" onClick={() => removeOption(i)} className="text-muted-foreground p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={addOption}
            className="text-xs font-semibold text-primary inline-flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add option
          </button>
        </div>
      )}

      {question.type === "true_false" && (
        <Select value={question.correct_answer} onValueChange={(v) => update({ correct_answer: v })}>
          <SelectTrigger><SelectValue placeholder="Correct answer" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      )}

      {(question.type === "fill_blank" || question.type === "short_answer") && (
        <div className="space-y-2">
          <Input
            placeholder="Correct answer"
            value={question.correct_answer || ""}
            onChange={(e) => update({ correct_answer: e.target.value })}
          />
          <Input
            placeholder="Other accepted answers (comma separated, optional)"
            value={(question.accepted_answers || []).join(", ")}
            onChange={(e) => update({
              accepted_answers: e.target.value.split(",").map(s => s.trim()).filter(Boolean),
            })}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="text-xs text-muted-foreground">Marks</label>
        <Input
          type="number"
          min="1"
          className="w-20"
          value={question.marks ?? 1}
          onChange={(e) => update({ marks: Number(e.target.value) || 1 })}
        />
      </div>
    </div>
  );
}