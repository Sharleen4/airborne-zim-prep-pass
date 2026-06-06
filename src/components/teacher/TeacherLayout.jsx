import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutDashboard, BookOpen, ClipboardList, BarChart3, Calendar, Settings } from "lucide-react";

const navItems = [
  { to: "/teacher", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/teacher/classes", label: "Classes", Icon: BookOpen },
  { to: "/teacher/homework", label: "Exercises", Icon: ClipboardList },
  { to: "/teacher/schedule", label: "Schedule", Icon: Calendar },
  { to: "/teacher/reports", label: "Reports", Icon: BarChart3 },
  { to: "/teacher/profile", label: "Profile", Icon: Settings },
];

export default function TeacherLayout({ title, subtitle, children, showBack = false }) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-28 font-jakarta">
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white px-5 pt-10 pb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3" />
        <div className="relative z-10">
          {showBack && (
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-white/80 text-sm mb-3">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white/70 text-xs font-medium">Teacher</p>
              <h1 className="text-2xl font-extrabold leading-tight truncate">{title}</h1>
              {subtitle && <p className="text-white/80 text-xs mt-1">{subtitle}</p>}
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-lg flex-shrink-0">
              👩‍🏫
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">{children}</div>

      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 pt-2 pb-safe flex justify-around z-40" style={{ paddingBottom: `max(0.5rem, env(safe-area-inset-bottom))` }}>
        {navItems.map(({ to, label, Icon }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-xl transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}