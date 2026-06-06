import { Building2 } from "lucide-react";

/**
 * Compact dropdown shown at the top of every school admin page when the
 * current user can administer more than one school. Choosing a school
 * updates the shared active-school state so every page (dashboard, teachers,
 * classes, students, reports, profile) loads data for the SAME school.
 */
export default function SchoolSwitcher({ schools, activeId, onChange }) {
  if (!schools || schools.length <= 1) return null;
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 mb-3">
      <label className="text-[11px] font-bold uppercase tracking-wide text-primary flex items-center gap-1 mb-1.5">
        <Building2 className="w-3 h-3" /> Active school
      </label>
      <select
        value={activeId || ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
      >
        {schools.map(s => (
          <option key={s.id} value={s.id}>
            {s.name}{s.approval_status && s.approval_status !== "approved" ? ` (${s.approval_status})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}