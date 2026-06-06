import { Link } from "react-router-dom";
import { ChevronLeft, FileSearch, Clock, BookOpen } from "lucide-react";

export default function ZimsecPapersPage() {
  return (
    <div className="min-h-screen bg-background font-jakarta flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-violet-600 to-violet-800 text-white px-6 pt-14 pb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10">
          <Link to="/home" className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium mb-4 w-fit">
            <ChevronLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <FileSearch className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold leading-tight">ZIMSEC Past Papers</h1>
              <p className="text-white/70 text-sm mt-0.5">Previous exam papers for Grade 7</p>
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          <Clock className="w-12 h-12 text-primary" />
        </div>

        <h2 className="text-2xl font-extrabold text-foreground mb-3">Coming Soon!</h2>
        <p className="text-muted-foreground text-base max-w-sm leading-relaxed mb-8">
          We're preparing a full library of past ZIMSEC exam papers for Grade 7, covering all subjects. 
          Check back soon!
        </p>

        {/* Subject preview cards (teaser) */}
        <div className="w-full max-w-sm space-y-3 text-left">
          {[
            { icon: "📐", subject: "Mathematics", grades: "Grade 7" },
            { icon: "📖", subject: "English", grades: "Grade 7" },
            { icon: "🌍", subject: "Social Sciences", grades: "Grade 7" },
            { icon: "🔬", subject: "Science & Technology", grades: "Grade 7" },
          ].map(({ icon, subject, grades }) => (
            <div key={subject} className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3 opacity-50">
              <span className="text-2xl flex-shrink-0">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-foreground">{subject}</p>
                <p className="text-xs text-muted-foreground">{grades}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                Soon
              </span>
            </div>
          ))}
        </div>

        <Link
          to="/home"
          className="mt-10 bg-primary text-white font-semibold px-8 py-3 rounded-2xl text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <BookOpen className="w-4 h-4" /> Back to Study
        </Link>
      </div>
    </div>
  );
}