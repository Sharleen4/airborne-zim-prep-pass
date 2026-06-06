import { useState } from "react";
import { Link } from "react-router-dom";
import AddChildModal from "@/components/child/AddChildModal";
import { Building2, BookOpen, GraduationCap, Users, ArrowRight, CheckCircle2, Clock } from "lucide-react";

// Step 2 of the wizard — explains what the user needs to do next based on role
// and (where possible) lets them complete that step inline.
//
// Parent → opens AddChildModal inline.
// School admin → CTA goes to /school-admin (SchoolSetupForm shows there).
// Teacher → explains "Wait for your school to add you" + CTA to dashboard.
// Student → explains they need a class invite link from their teacher.
export default function RoleSetupStep({ role, onCompleted, onSkip, onFinishAndLeave }) {
  const [showAddChild, setShowAddChild] = useState(false);
  const [childAdded, setChildAdded] = useState(false);

  if (role === "parent") {
    return (
      <div className="space-y-4">
        <Header
          icon={Users}
          accent="from-violet-500 to-purple-600"
          title="Add your first child"
          subtitle="We'll show subjects and practice tailored to their grade."
        />

        {childAdded ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
            <p className="font-bold text-emerald-700 text-sm">Child added — you're all set!</p>
          </div>
        ) : (
          <button
            onClick={() => setShowAddChild(true)}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm"
          >
            Add my child
          </button>
        )}

        <FooterNav
          onPrimary={onCompleted}
          primaryLabel={childAdded ? "Continue" : "Skip for now"}
          primaryEnabled={true}
        />

        {showAddChild && (
          <AddChildModal
            isOpen={true}
            canDismiss={true}
            onClose={() => setShowAddChild(false)}
            onCreated={() => { setChildAdded(true); setShowAddChild(false); }}
          />
        )}
      </div>
    );
  }

  if (role === "school_admin") {
    return (
      <div className="space-y-4">
        <Header
          icon={Building2}
          accent="from-blue-500 to-indigo-600"
          title="Set up your school"
          subtitle="Add your school details, then invite teachers and create classes."
        />
        <Steps items={[
          "Add your school details (name, contact, students)",
          "Invite teachers — they'll join your school",
          "Create classes & enrol students",
        ]} />
        <Link
          to="/school-admin"
          onClick={onFinishAndLeave}
          className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          Go to school setup <ArrowRight className="w-4 h-4" />
        </Link>
        <FooterNav onPrimary={onSkip} primaryLabel="Skip for now" primaryEnabled={true} />
      </div>
    );
  }

  if (role === "teacher") {
    return (
      <div className="space-y-4">
        <Header
          icon={BookOpen}
          accent="from-emerald-500 to-teal-600"
          title="Waiting for your school"
          subtitle="Your school admin needs to add you. Once added, you'll see your classes."
        />
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-start gap-2">
          <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            Ask your school admin to add you using your registered email. While you wait, you can still earn rewards by referring parents.
          </p>
        </div>
        <Steps items={[
          "Share your email with your school admin",
          "They'll add you to your school's teacher list",
          "Your classes & homework tools will appear here",
        ]} />
        <Link
          to="/teacher-dashboard"
          onClick={onFinishAndLeave}
          className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          View teacher dashboard <ArrowRight className="w-4 h-4" />
        </Link>
        <FooterNav onPrimary={onCompleted} primaryLabel="Continue with tour" primaryEnabled={true} />
      </div>
    );
  }

  if (role === "student") {
    return (
      <div className="space-y-4">
        <Header
          icon={GraduationCap}
          accent="from-amber-500 to-orange-600"
          title="Join your class"
          subtitle="Ask your teacher for a class invite link to join their class."
        />
        <Steps items={[
          "Get a class invite link from your teacher",
          "Open the link and confirm your grade",
          "Once approved, you'll see homework & exercises",
        ]} />
        <FooterNav onPrimary={onCompleted} primaryLabel="Continue" primaryEnabled={true} />
      </div>
    );
  }

  // Fallback (shouldn't happen)
  return <FooterNav onPrimary={onCompleted} primaryLabel="Continue" primaryEnabled={true} />;
}

function Header({ icon: Icon, accent, title, subtitle }) {
  return (
    <div className="text-center">
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${accent} text-white flex items-center justify-center mx-auto mb-3`}>
        <Icon className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-extrabold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

function Steps({ items }) {
  return (
    <ol className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-2.5 bg-card border border-border rounded-xl p-2.5">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
          <span className="text-sm text-foreground">{t}</span>
        </li>
      ))}
    </ol>
  );
}

function FooterNav({ onPrimary, primaryLabel, primaryEnabled }) {
  return (
    <button
      onClick={onPrimary}
      disabled={!primaryEnabled}
      className="w-full text-muted-foreground hover:text-foreground font-semibold text-xs py-2"
    >
      {primaryLabel}
    </button>
  );
}