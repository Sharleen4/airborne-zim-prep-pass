import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Megaphone, Pin, ChevronDown } from "lucide-react";

// Shows the active child's class announcements on the student Home screen.
// Hidden when the child is not linked to a school class or there are no posts.
export default function ClassAnnouncementsCard({ activeChild, userEmail }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!activeChild || !userEmail) { setLoading(false); return; }
    (async () => {
      try {
        // Locate the student's class via StudentProfile (linked by child_profile_id or parent+name)
        const byChildId = await base44.entities.StudentProfile.filter(
          { child_profile_id: activeChild.id, is_active: true }, "-created_date", 1
        );
        let p = byChildId[0];
        if (!p) {
          const byParent = await base44.entities.StudentProfile.filter(
            { parent_email: userEmail, full_name: activeChild.child_name, is_active: true }, "-created_date", 1
          );
          p = byParent[0];
        }
        if (!p?.class_id) { setLoading(false); return; }

        const list = await base44.entities.SchoolAnnouncement
          .filter({ class_id: p.class_id }, "-created_date", 20)
          .catch(() => []);
        // Only show posts targeted at everyone, parents, or students.
        const visible = list.filter(a => !a.audience || ["all", "parents", "students"].includes(a.audience));
        // Sort pinned first, then by created_date desc (filter already returns desc).
        visible.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
        setItems(visible.slice(0, 5));
      } catch (e) {
        console.warn("[ClassAnnouncementsCard]", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [activeChild?.id, userEmail]);

  if (loading || items.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Megaphone className="w-4 h-4" />
        </div>
        <p className="font-bold text-sm text-foreground">Class Announcements</p>
        <span className="ml-auto text-[10px] font-bold uppercase bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map(a => {
          const open = expandedId === a.id;
          return (
            <button
              key={a.id}
              onClick={() => setExpandedId(open ? null : a.id)}
              className={`w-full text-left rounded-xl p-3 transition-colors ${a.is_pinned ? "bg-amber-500/10 border border-amber-500/30" : "bg-secondary/40 hover:bg-secondary/70"}`}
            >
              <div className="flex items-start gap-2">
                {a.is_pinned && <Pin className="w-3 h-3 text-amber-600 mt-1 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{a.title}</p>
                  <p className={`text-xs text-foreground mt-0.5 whitespace-pre-wrap ${open ? "" : "line-clamp-2"}`}>{a.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {a.author_name ? `${a.author_name} · ` : ""}{new Date(a.created_date).toLocaleDateString()}
                  </p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}