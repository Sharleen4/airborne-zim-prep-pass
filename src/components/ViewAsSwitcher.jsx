import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { VIEW_AS_ROLES, getViewAsRole, setViewAsRole, isRealSuperAdmin } from "@/lib/viewAs";
import { Eye, X, Check, ShieldCheck } from "lucide-react";

// Floating button visible ONLY to real super admins. Lets them preview the app
// as a teacher, school admin, parent, student or default user.
export default function ViewAsSwitcher() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(getViewAsRole() || "admin");

  useEffect(() => {
    const sync = () => setActive(getViewAsRole() || "admin");
    window.addEventListener("zama:view-as-changed", sync);
    return () => window.removeEventListener("zama:view-as-changed", sync);
  }, []);

  if (!isRealSuperAdmin(user)) return null;

  const isOverriding = active !== "admin";

  const pick = (role) => {
    setViewAsRole(role);
    setActive(role);
    setOpen(false);
    // Reload so role-based redirects (RoleHomeRedirect, auth gates) re-evaluate immediately
    window.location.href = "/home";
  };

  return (
    <>
      {/* Banner while overriding */}
      {isOverriding && (
        <div className="fixed top-0 left-0 right-0 z-[200] bg-amber-500 text-amber-950 text-xs font-bold py-1.5 px-3 flex items-center justify-center gap-2 shadow-md">
          <Eye className="w-3.5 h-3.5" />
          Viewing as <span className="underline">{VIEW_AS_ROLES.find(r => r.key === active)?.label || active}</span>
          <button
            onClick={() => pick("admin")}
            className="ml-2 bg-amber-950 text-amber-100 px-2 py-0.5 rounded-md text-[10px] hover:bg-amber-900"
          >
            Exit
          </button>
        </div>
      )}

      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 right-4 z-[199] w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all ${
          isOverriding ? "bg-amber-500 text-amber-950" : "bg-primary text-white hover:scale-105"
        }`}
        title="View As (super admin)"
      >
        {isOverriding ? <Eye className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
      </button>

      {/* Picker modal */}
      {open && (
        <div className="fixed inset-0 z-[201] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" /> View As
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Preview the app as another role. Only you (super admin) can see this.
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {VIEW_AS_ROLES.map(r => {
                const isActive = active === r.key;
                return (
                  <button
                    key={r.key}
                    onClick={() => pick(r.key)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 flex items-center gap-3 transition-colors ${
                      isActive ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-foreground">{r.label}</p>
                      <p className="text-[11px] text-muted-foreground">{r.desc}</p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}