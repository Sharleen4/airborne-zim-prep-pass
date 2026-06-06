import { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Megaphone, Pin, PinOff, Trash2, Send } from "lucide-react";

// Lets a teacher post & manage announcements scoped to a specific class.
// Audience options reflect who will see it (parents/students/all).
const AUDIENCE_OPTIONS = [
  { value: "all", label: "Everyone" },
  { value: "parents", label: "Parents" },
  { value: "students", label: "Students" },
];

export default function ClassAnnouncementsPanel({ classObj, teacher }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [pinned, setPinned] = useState(false);

  const load = useCallback(async () => {
    if (!classObj?.id) return;
    setLoading(true);
    const items = await base44.entities.SchoolAnnouncement
      .filter({ class_id: classObj.id }, "-created_date", 50)
      .catch(() => []);
    setList(items);
    setLoading(false);
  }, [classObj?.id]);

  useEffect(() => { load(); }, [load]);

  const reset = () => { setTitle(""); setBody(""); setAudience("all"); setPinned(false); };

  const post = async () => {
    setError("");
    if (!title.trim() || !body.trim()) { setError("Please add a title and a message."); return; }
    setBusy(true);
    try {
      await base44.entities.SchoolAnnouncement.create({
        school_id: classObj.school_id,
        class_id: classObj.id,
        author_email: teacher?.email,
        author_name: teacher?.full_name || "",
        title: title.trim(),
        body: body.trim(),
        audience,
        is_pinned: pinned,
        description: title.trim(),
      });
      reset();
      await load();
    } catch (e) {
      setError(e.message || "Could not post announcement.");
    } finally {
      setBusy(false);
    }
  };

  const togglePin = async (a) => {
    await base44.entities.SchoolAnnouncement.update(a.id, { is_pinned: !a.is_pinned });
    load();
  };

  const remove = async (a) => {
    if (!confirm("Delete this announcement?")) return;
    await base44.entities.SchoolAnnouncement.delete(a.id);
    load();
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-4 mb-3 space-y-3">
      <div className="flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-primary" />
        <p className="font-bold text-sm text-foreground">Announcements</p>
        {list.length > 0 && (
          <span className="ml-auto text-[10px] font-bold uppercase bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
            {list.length}
          </span>
        )}
      </div>

      {/* New post form */}
      <div className="space-y-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title (e.g. Trip on Friday)"
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
        />
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={3}
          placeholder="Write an update or reminder for parents…"
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
        />
        <div className="flex items-center gap-2">
          <select
            value={audience}
            onChange={e => setAudience(e.target.value)}
            className="flex-1 border border-border rounded-xl px-3 py-2 text-xs bg-background text-foreground"
          >
            {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="text-xs font-semibold text-foreground inline-flex items-center gap-1.5">
            <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
            Pin
          </label>
          <button
            onClick={post}
            disabled={busy}
            className="bg-primary text-white text-xs font-semibold px-3 py-2 rounded-xl inline-flex items-center gap-1 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Post
          </button>
        </div>
        {error && <div className="bg-destructive/10 text-destructive text-xs p-2 rounded-lg">{error}</div>}
      </div>

      {/* Existing posts */}
      <div className="pt-1">
        {loading ? (
          <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
        ) : list.length === 0 ? (
          <p className="text-xs text-muted-foreground">No announcements yet.</p>
        ) : (
          <div className="space-y-2">
            {list.map(a => (
              <div key={a.id} className={`rounded-xl p-3 ${a.is_pinned ? "bg-amber-500/10 border border-amber-500/30" : "bg-secondary/40"}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {a.is_pinned && <span className="text-[10px] font-bold uppercase bg-amber-500 text-white px-1.5 py-0.5 rounded-full">Pinned</span>}
                      <p className="font-semibold text-sm text-foreground truncate">{a.title}</p>
                    </div>
                    <p className="text-xs text-foreground mt-0.5 whitespace-pre-wrap">{a.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase">
                      To: {a.audience || "all"} · {new Date(a.created_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => togglePin(a)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground" title={a.is_pinned ? "Unpin" : "Pin"}>
                      {a.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => remove(a)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}