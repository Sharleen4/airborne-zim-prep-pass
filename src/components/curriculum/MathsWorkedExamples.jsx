// Renders Mathematics-only worked examples and the in-class exercise.
// Both blocks appear in read-only mode in LessonPlanModal's ReadView.

const DIFFICULTY_COLORS = {
  Easy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  Standard: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  Challenge: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
};

export function WorkedExamplesSection({ items }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="font-bold text-sm text-foreground mb-2">📘 Worked Examples</h3>
      <div className="space-y-3">
        {items.map((ex, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-sm text-foreground">
                {i + 1}. {ex.title || `Example ${i + 1}`}
              </p>
              {ex.difficulty && (
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[ex.difficulty] || DIFFICULTY_COLORS.Standard}`}>
                  {ex.difficulty}
                </span>
              )}
            </div>
            {ex.problem && (
              <p className="text-sm text-foreground bg-secondary/40 rounded-lg p-2.5 whitespace-pre-wrap">
                {ex.problem}
              </p>
            )}
            {ex.steps?.length > 0 && (
              <ol className="list-decimal pl-5 text-sm text-foreground space-y-1">
                {ex.steps.map((s, j) => <li key={j}>{s}</li>)}
              </ol>
            )}
            {ex.answer && (
              <p className="text-sm font-bold text-primary border-t border-border pt-2">
                ✅ Answer: <span className="text-foreground font-semibold">{ex.answer}</span>
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClassExerciseSection({ data }) {
  if (!data || !data.problems?.length) return null;
  return (
    <div>
      <h3 className="font-bold text-sm text-foreground mb-2">✏️ Class Exercise</h3>
      {data.instructions && (
        <p className="text-xs text-muted-foreground bg-secondary/40 border border-border rounded-lg p-2.5 mb-2 italic">
          {data.instructions}
        </p>
      )}
      <div className="space-y-2">
        {data.problems.map((p, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
            <span className="font-bold text-sm text-primary flex-shrink-0">{p.number ?? i + 1}.</span>
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-sm text-foreground whitespace-pre-wrap">{p.problem}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {p.difficulty && (
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[p.difficulty] || DIFFICULTY_COLORS.Standard}`}>
                    {p.difficulty}
                  </span>
                )}
                {p.answer && (
                  <span className="text-[11px] text-muted-foreground">
                    <span className="font-bold text-emerald-600">Answer:</span> {p.answer}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}