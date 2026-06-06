import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LayoutDashboard, Users, BookOpen, GraduationCap, BarChart3, Settings } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { to: "/school-admin", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/school-admin/teachers", label: "Teachers", Icon: Users },
  { to: "/school-admin/classes", label: "Classes", Icon: BookOpen },
  { to: "/school-admin/students", label: "Students", Icon: GraduationCap },
  { to: "/school-admin/reports", label: "Reports", Icon: BarChart3 },
  { to: "/school-admin/profile", label: "Profile", Icon: Settings },
];

export default function SchoolAdminLayout({ title, subtitle, children, showBack = false, logoUrl = "" }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-28 font-jakarta">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white px-5 pt-10 pb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/10 -translate-y-1/3 translate-x-1/3" />
        <div className="relative z-10">
          {showBack && (
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-white/80 text-sm mb-3">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white/70 text-xs font-medium">School Admin</p>
              <h1 className="text-2xl font-extrabold leading-tight truncate">{title}</h1>
              {subtitle && <p className="text-white/80 text-xs mt-1">{subtitle}</p>}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="School logo" className="w-full h-full object-cover" />
              ) : (
                <span>🏫</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">{children}</div>

      {/* Bottom nav for school admin */}
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