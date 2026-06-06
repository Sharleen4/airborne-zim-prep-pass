import { BookOpen, Lightbulb, Sparkles, Globe, GraduationCap } from "lucide-react";

/**
 * Renders the substantive "Teaching Notes" block — the teacher's content
 * reference for content-heavy topics (water cycle, disasters, ecosystems, etc).
 */
export default function TeachingNotesSection({ notes }) {
  if (!notes || typeof notes !== "object") return null;
  const {
    overview,
    background_content = [],
    key_facts = [],
    real_world_examples = [],
    explain_to_children = [],
    extension_knowledge = [],
  } = notes;

  const hasAny =
    overview ||
    background_content.length ||
    key_facts.length ||
    real_world_examples.length ||
    explain_to_children.length ||
    extension_knowledge.length;
  if (!hasAny) return null;

  return (
    <div className="bg-gradient-to-br from-blue-500/5 to-violet-500/5 border border-blue-500/20 rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 flex items-center justify-center">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Teaching Notes</h3>
          <p className="text-[11px] text-muted-foreground">Background content so you can confidently explain this topic to your class.</p>
        </div>
      </div>

      {overview && (
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Overview</p>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{overview}</p>
        </div>
      )}

      {background_content.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Background Content</p>
          {background_content.map((b, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-3">
              <p className="font-bold text-sm text-foreground mb-1">{b.heading}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{b.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {key_facts.length > 0 && (
        <NotesList
          icon={Sparkles}
          color="text-emerald-600"
          bg="bg-emerald-500/10"
          title="Key Facts"
          items={key_facts}
        />
      )}

      {real_world_examples.length > 0 && (
        <NotesList
          icon={Globe}
          color="text-amber-600"
          bg="bg-amber-500/10"
          title="Real-World Zimbabwean Examples"
          items={real_world_examples}
        />
      )}

      {explain_to_children.length > 0 && (
        <NotesList
          icon={Lightbulb}
          color="text-rose-600"
          bg="bg-rose-500/10"
          title="Explain It to Children (read aloud)"
          items={explain_to_children}
        />
      )}

      {extension_knowledge.length > 0 && (
        <NotesList
          icon={GraduationCap}
          color="text-violet-600"
          bg="bg-violet-500/10"
          title="Extra Background (for the teacher)"
          items={extension_knowledge}
        />
      )}
    </div>
  );
}

function NotesList({ icon: Icon, color, bg, title, items }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-6 h-6 rounded-lg ${bg} ${color} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="font-bold text-sm text-foreground">{title}</p>
      </div>
      <ul className="list-disc pl-5 text-sm text-foreground space-y-1">
        {items.map((it, i) => <li key={i} className="leading-relaxed">{it}</li>)}
      </ul>
    </div>
  );
}