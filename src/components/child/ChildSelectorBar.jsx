import { useState, useRef, useEffect } from "react";
import { useActiveChild } from "@/lib/ActiveChildContext";
import { ChevronDown, Plus, Check, X, Lock } from "lucide-react";
import { useSubscription } from "@/lib/useSubscription";
import { useAuth } from "@/lib/AuthContext";
import AddChildModal from "./AddChildModal";
import { Link } from "react-router-dom";

// Premium parents can manage multiple children; free parents are limited to 1.
export default function ChildSelectorBar() {
  const { activeChild, childProfiles, switchChild, reload } = useActiveChild();
  const { user } = useAuth();
  const subStatus = useSubscription(user || null);
  const isPremium = !!subStatus?.active && !subStatus?.isTrial;
  const canAddMore = isPremium || childProfiles.length === 0;

  const [open, setOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);

  // Position the dropdown using fixed coordinates so it escapes any parent
  // stacking contexts (e.g. framer-motion cards below the header).
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  if (!activeChild) return null;

  const handleAddClick = () => {
    setOpen(false);
    if (canAddMore) setShowAdd(true);
    else setShowUpgrade(true);
  };

  return (
    <>
      <div className="relative">
        <button
          ref={btnRef}
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 bg-white/15 hover:bg-white/25 border border-white/20 rounded-2xl px-3 py-2.5 transition-colors text-left"
        >
          <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">
            {activeChild.avatar_emoji || "🧒"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-white/60 uppercase tracking-wide font-bold">Studying as</p>
            <p className="font-bold text-white text-sm truncate">
              {activeChild.child_name} <span className="font-normal text-white/70">· {activeChild.grade}</span>
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-white/70 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          {pos && (
            <div
              className="fixed bg-card border border-border rounded-2xl shadow-xl z-[9999] overflow-hidden"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
            >
              <div className="max-h-72 overflow-y-auto">
                {childProfiles.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { switchChild(c.id); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary text-left ${c.id === activeChild.id ? "bg-primary/5" : ""}`}
                  >
                    <span className="text-2xl">{c.avatar_emoji || "🧒"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{c.child_name}</p>
                      <p className="text-xs text-muted-foreground">{c.grade}</p>
                    </div>
                    {c.id === activeChild.id && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <button
                onClick={handleAddClick}
                className="w-full flex items-center gap-2 px-3 py-3 border-t border-border text-sm font-semibold text-primary hover:bg-primary/5"
              >
                {canAddMore ? (
                  <><Plus className="w-4 h-4" /> Add another child</>
                ) : (
                  <><Lock className="w-4 h-4" /> Add another child (Premium)</>
                )}
              </button>
            </div>
          )}
        </>
      )}

      <AddChildModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(c) => { reload(); switchChild(c.id); }}
      />

      {showUpgrade && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-card w-full md:max-w-md rounded-t-3xl md:rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-foreground">Add more children</h2>
              <button onClick={() => setShowUpgrade(false)} className="p-1"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="text-5xl text-center py-2">👨‍👩‍👧‍👦</div>
            <p className="text-sm text-foreground text-center">
              Premium parents can add unlimited child profiles. Each child gets their own grade-specific content and progress.
            </p>
            <Link
              to="/payment"
              onClick={() => setShowUpgrade(false)}
              className="block w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm text-center"
            >
              View Premium plans
            </Link>
            <button
              onClick={() => setShowUpgrade(false)}
              className="w-full text-sm font-medium text-muted-foreground py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </>
  );
}