import { Sparkles, BookOpen, ClipboardList, TrendingUp, MessageCircle } from "lucide-react";

const TOURS = {
  parent: [
    { icon: BookOpen, title: "Subjects per grade", desc: "Your child sees lessons & notes for their grade." },
    { icon: ClipboardList, title: "Set homework", desc: "Assign practice and track who's done what." },
    { icon: TrendingUp, title: "See progress", desc: "Get weekly performance summaries." },
  ],
  teacher: [
    { icon: BookOpen, title: "Curriculum Explorer", desc: "Browse the syllabus & generate AI lesson plans." },
    { icon: ClipboardList, title: "Exercises & homework", desc: "Assign auto-marked work to your classes." },
    { icon: TrendingUp, title: "Class reports", desc: "See who's struggling and where." },
  ],
  school_admin: [
    { icon: BookOpen, title: "Teachers & classes", desc: "Invite teachers and organise classes." },
    { icon: ClipboardList, title: "Bulk student enrolment", desc: "Upload your student list in one go." },
    { icon: TrendingUp, title: "School-wide reports", desc: "Track engagement and performance." },
  ],
  student: [
    { icon: BookOpen, title: "Study notes", desc: "Read short, exam-focused notes per topic." },
    { icon: ClipboardList, title: "Practice & mock exams", desc: "Sharpen your skills with auto-marked tests." },
    { icon: TrendingUp, title: "Track your progress", desc: "See where you're improving every week." },
  ],
};

// Step 3 — quick 3-card tour of what the role can do.
export default function TourStep({ role, onDone }) {
  const tour = TOURS[role] || TOURS.parent;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
        <h2 className="text-xl font-extrabold text-foreground">You're all set!</h2>
        <p className="text-sm text-muted-foreground mt-1">Here's what you can do in Zama:</p>
      </div>

      <div className="space-y-2">
        {tour.map((t, i) => {
          const Icon = t.icon;
          return (
            <div key={i} className="bg-card border border-border rounded-2xl p-3 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm text-foreground">{t.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <a
        href="https://wa.me/263786987358?text=Hi%20Zama%20Ai%20Primary%2C%20I%20need%20help%20getting%20started"
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-2"
      >
        <MessageCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <p className="text-xs text-emerald-700 font-semibold flex-1">Stuck? Message us on WhatsApp — we reply quickly.</p>
      </a>

      <button
        onClick={onDone}
        className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm"
      >
        Start using Zama
      </button>
    </div>
  );
}