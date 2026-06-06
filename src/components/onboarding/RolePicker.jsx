import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Building2, GraduationCap, Users, BookOpen, ChevronRight } from "lucide-react";

const ROLES = [
  {
    value: "parent",
    label: "Parent / Student",
    desc: "I'm setting up a student profile for my child to learn at home",
    icon: Users,
    accent: "from-violet-500 to-purple-600",
  },
  {
    value: "teacher",
    label: "Teacher",
    desc: "I teach a class and want to manage homework & lessons",
    icon: BookOpen,
    accent: "from-emerald-500 to-teal-600",
  },
  {
    value: "school_admin",
    label: "School Admin",
    desc: "I manage a school, teachers and classes",
    icon: Building2,
    accent: "from-blue-500 to-indigo-600",
  },
  {
    value: "student",
    label: "Independent Student",
    desc: "I'm a learner studying on my own (no parent account)",
    icon: GraduationCap,
    accent: "from-amber-500 to-orange-600",
  },
];

// Step 1 of the onboarding wizard. Lets the user pick what they are so the rest
// of onboarding (and the app) can route them correctly.
export default function RolePicker({ onPicked }) {
  const [picked, setPicked] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    if (!picked) return;
    setSaving(true);
    setError("");
    try {
      // Use a service-role backend function — client-side updateMe() is blocked
      // from changing the `role` field for non-admin users, which was causing
      // "you do not have permission" errors during onboarding.
      const res = await base44.functions.invoke("setOnboardingRole", { role: picked });
      if (res?.data?.error) throw new Error(res.data.error);
      onPicked(picked);
    } catch (e) {
      setError(e?.message || "Could not save your role. Try again.");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="text-4xl mb-2">👋</div>
        <h2 className="text-2xl font-extrabold text-foreground">Welcome to Zama!</h2>
        <p className="text-sm text-muted-foreground mt-1">First — which best describes you?</p>
      </div>

      <div className="space-y-2.5">
        {ROLES.map(r => {
          const Icon = r.icon;
          const isOn = picked === r.value;
          return (
            <button
              key={r.value}
              onClick={() => setPicked(r.value)}
              className={`w-full text-left rounded-2xl border-2 transition-all p-3.5 flex items-center gap-3 ${
                isOn
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border hover:border-primary/40 bg-card"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.accent} text-white flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">{r.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
              </div>
              <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isOn ? "text-primary" : "text-muted-foreground"}`} />
            </button>
          );
        })}
      </div>

      {error && <p className="text-xs text-destructive text-center">{error}</p>}

      <button
        onClick={handleContinue}
        disabled={!picked || saving}
        className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40"
      >
        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Continue"}
      </button>
    </div>
  );
}