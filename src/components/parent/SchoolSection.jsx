import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { School as SchoolIcon, ClipboardList, Megaphone, Loader2 } from "lucide-react";

// Shows school-linked info for each of the parent's children:
// - which school + class they're in
// - upcoming school homework
// - recent school announcements
export default function SchoolSection({ children: kids, parentEmail }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    if (!kids?.length || !parentEmail) { setLoading(false); return; }
    (async () => {
      try {
        // Find student profiles linked to this parent
        const profiles = await base44.entities.StudentProfile.filter(
          { parent_email: parentEmail, is_active: true }, "-created_date", 50
        );

        if (!profiles.length) { setData([]); setLoading(false); return; }

        const schoolIds = [...new Set(profiles.map(p => p.school_id).filter(Boolean))];
        const classIds = [...new Set(profiles.map(p => p.class_id).filter(Boolean))];

        const [schools, classes, homework, announcements] = await Promise.all([
          schoolIds.length ? base44.entities.School.filter({ id: { $in: schoolIds } }, "-created_date", 20) : Promise.resolve([]),
          classIds.length ? base44.entities.SchoolClass.filter({ id: { $in: classIds } }, "-created_date", 20) : Promise.resolve([]),
          classIds.length ? base44.entities.SchoolHomework.filter({ class_id: { $in: classIds }, is_active: true }, "-due_date", 20) : Promise.resolve([]),
          schoolIds.length ? base44.entities.SchoolAnnouncement.filter({ school_id: { $in: schoolIds } }, "-created_date", 10) : Promise.resolve([]),
        ]);

        const rows = profiles.map(p => ({
          profile: p,
          school: schools.find(s => s.id === p.school_id),
          klass: classes.find(c => c.id === p.class_id),
          homework: homework.filter(h => h.class_id === p.class_id),
          announcements: announcements.filter(a => a.school_id === p.school_id),
        }));
        setData(rows);
      } catch (e) {
        console.warn("[SchoolSection] failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [parentEmail, kids?.length]);

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading school info...
      </div>
    );
  }

  if (!data.length) return null;

  return (
    <div className="space-y-3">
      <h2 className="font-bold text-foreground flex items-center gap-2">
        <SchoolIcon className="w-4 h-4 text-primary" /> School
      </h2>
      {data.map((row, i) => (
        <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-lg">🏫</div>
            <div className="min-w-0">
              <p className="font-bold text-sm text-foreground truncate">{row.profile.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {row.school?.name || "School"} · {row.klass?.name || "Unassigned"}
              </p>
            </div>
          </div>

          {row.homework.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                <ClipboardList className="w-3 h-3" /> Upcoming Homework
              </p>
              <div className="space-y-1">
                {row.homework.slice(0, 3).map(h => (
                  <div key={h.id} className="text-sm bg-secondary rounded-xl px-3 py-2 flex items-center justify-between">
                    <span className="text-foreground truncate">{h.title}</span>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">Due {h.due_date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {row.announcements.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                <Megaphone className="w-3 h-3" /> Announcements
              </p>
              <div className="space-y-1">
                {row.announcements.slice(0, 2).map(a => (
                  <div key={a.id} className="text-sm bg-violet-500/5 border border-violet-500/20 rounded-xl px-3 py-2">
                    <p className="font-semibold text-foreground text-xs">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{a.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}