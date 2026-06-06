import { Link, useLocation } from "react-router-dom";
import { Home, Zap, FileText, TrendingUp, User } from "lucide-react";

const navItems = [
  { to: "/home", label: "Home", icon: Home, match: ["/home", "/subject", "/notes"] },
  { to: "/practice", label: "Practice", icon: Zap, match: ["/practice"] },
  { to: "/mock-exam", label: "Exam", icon: FileText, match: ["/mock-exam"] },
  { to: "/progress", label: "Progress", icon: TrendingUp, match: ["/progress", "/leaderboard"] },
  { to: "/profile", label: "Profile", icon: User, match: ["/profile", "/parent", "/homework", "/bookmarks", "/offline-content"] },
];

const hiddenPrefixes = [
  "/",
  "/login",
  "/pricing",
  "/about",
  "/install",
  "/terms",
  "/privacy",
  "/privacy-policy",
  "/payment",
  "/payment-return",
  "/admin",
  "/school-admin",
  "/teacher",
  "/teacher-dashboard",
  "/class-join",
  "/curriculum",
  "/delete-account",
];

function shouldHide(pathname) {
  if (pathname === "/") return true;
  return hiddenPrefixes.some((prefix) => prefix !== "/" && pathname.startsWith(prefix));
}

export default function AppBottomNav() {
  const { pathname } = useLocation();

  if (shouldHide(pathname)) return null;

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 px-2 pt-1.5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around gap-1">
        {navItems.map(({ to, label, icon: Icon, match }) => {
          const active = match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
          return (
            <Link
              key={to}
              to={to}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors ${
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
