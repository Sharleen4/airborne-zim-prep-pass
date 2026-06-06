import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useActiveChild } from "@/lib/ActiveChildContext";
import { useSubscription } from "@/lib/useSubscription";
import { X, Loader2, Bell, Users } from "lucide-react";

const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];
const AVATARS = ["🧒", "👦", "👧", "🧑‍🎓", "👨‍🎓", "👩‍🎓", "🦸‍♂️", "🦸‍♀️", "🐯", "🦊", "🐼", "🦁"];

export default function AddChildModal({ isOpen, onClose, onCreated, canDismiss = true }) {
  const { user } = useAuth();
  const { childProfiles, reload: reloadActiveChild } = useActiveChild();
  const subStatus = useSubscription(user || null);
  const isAdmin = user?.role === "admin";
  const maxChildren = isAdmin ? Infinity : (subStatus?.maxChildren ?? 1);
  const currentCount = childProfiles?.length || 0;
  const atLimit = currentCount >= maxChildren;
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("Grade 7");
  const [avatar, setAvatar] = useState("🧒");
  const [parentName, setParentName] = useState(user?.parent_name || "");
  const [contactNumber, setContactNumber] = useState(user?.contact_number || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // Only show the parent contact prompt if the user hasn't already saved one.
  const showContactStep = !user?.contact_number;

  const handleSave = async () => {
    if (atLimit) { setError(`Your plan allows ${maxChildren} child${maxChildren !== 1 ? "ren" : ""}. Upgrade to a Family plan to add more.`); return; }
    if (!name.trim()) { setError("Please enter your child's name."); return; }
    setSaving(true);
    setError("");
    try {
      const created = await base44.entities.ChildProfile.create({
        parent_email: user.email,
        child_name: name.trim(),
        grade,
        avatar_emoji: avatar,
        is_active: true,
      });
      // Save optional parent contact info on the user record (skip if unchanged/empty).
      if (showContactStep && (parentName.trim() || contactNumber.trim())) {
        try {
          await base44.auth.updateMe({
            parent_name: parentName.trim() || undefined,
            contact_number: contactNumber.trim() || undefined,
          });
        } catch {}
      }
      setName("");
      // Refresh the global active-child context so the new child shows up
      // in the selector bar and everywhere else immediately.
      try { await reloadActiveChild?.(); } catch {}
      onCreated?.(created);
      onClose?.();
    } catch (e) {
      setError(e?.message || "Could not save. Try again.");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-card w-full md:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-foreground">Add a child</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Your child will see content for their grade.</p>
          </div>
          {canDismiss && (
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {atLimit && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Users className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-amber-700">
                  {subStatus?.isFamily ? `Family plan limit reached (${maxChildren} children)` : "Individual plan — 1 child only"}
                </p>
                <p className="text-[11px] text-amber-600 mt-0.5">
                  {subStatus?.isFamily
                    ? "You've added the maximum number of children for your plan."
                    : "Upgrade to a Family plan to add up to 4 children on one subscription."}
                </p>
              </div>
            </div>
            {!subStatus?.isFamily && (
              <Link
                to="/payment"
                onClick={onClose}
                className="block text-center w-full bg-amber-500 text-white font-semibold py-2 rounded-xl text-xs"
              >
                View Family plans →
              </Link>
            )}
          </div>
        )}

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Child's first name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Tinashe"
            className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Grade</label>
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map(g => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${grade === g ? "border-primary bg-primary text-white" : "border-border text-muted-foreground hover:border-primary/40"}`}
              >
                {g.replace("Grade ", "G")}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Pick an avatar</label>
          <div className="grid grid-cols-6 gap-2">
            {AVATARS.map(a => (
              <button
                key={a}
                onClick={() => setAvatar(a)}
                className={`text-2xl py-2 rounded-xl border-2 transition-colors ${avatar === a ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        {showContactStep && (
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-violet-700">Parent contact <span className="font-normal text-violet-500">(optional)</span></p>
                <p className="text-[11px] text-violet-600 mt-0.5">Recommended — receive WhatsApp updates on your child's progress and new content.</p>
              </div>
            </div>
            <input
              value={parentName}
              onChange={e => setParentName(e.target.value)}
              placeholder="Parent's name (optional)"
              className="w-full border border-violet-500/30 bg-background rounded-xl px-3 py-2 text-sm text-foreground"
            />
            <input
              value={contactNumber}
              onChange={e => setContactNumber(e.target.value)}
              placeholder="WhatsApp number e.g. +263 77 123 4567"
              inputMode="tel"
              className="w-full border border-violet-500/30 bg-background rounded-xl px-3 py-2 text-sm text-foreground"
            />
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || atLimit}
          className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save child"}
        </button>
      </div>
    </div>
  );
}