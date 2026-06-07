import { matchPath, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { BottomNav } from "@/pages/Home";

const STUDENT_PARENT_ROUTES = [
  "/home",
  "/subject/:subjectId",
  "/notes/:topicId",
  "/practice",
  "/practice/:topicId",
  "/mock-exam",
  "/progress",
  "/bookmarks",
  "/gamification",
  "/help",
  "/parent",
  "/homework",
  "/profile",
  "/activation",
  "/offline-content",
  "/leaderboard",
  "/english",
];

const ROUTES_WITH_OWN_BOTTOM_NAV = [
  "/home",
  "/gamification",
];

function activeKeyFor(pathname) {
  if (pathname.startsWith("/home") || pathname.startsWith("/subject") || pathname.startsWith("/notes")) return "home";
  if (pathname.startsWith("/practice")) return "practice";
  if (pathname.startsWith("/mock-exam")) return "exam";
  if (pathname.startsWith("/progress") || pathname.startsWith("/leaderboard")) return "progress";
  if (
    pathname.startsWith("/profile") ||
    pathname.startsWith("/activation") ||
    pathname.startsWith("/parent") ||
    pathname.startsWith("/homework") ||
    pathname.startsWith("/bookmarks") ||
    pathname.startsWith("/offline-content")
  ) {
    return "profile";
  }
  return "";
}

export default function GlobalBottomNav() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) return null;

  if (user.role === "teacher" || user.role === "school_admin") return null;

  const path = location.pathname;
  if (ROUTES_WITH_OWN_BOTTOM_NAV.some((route) => matchPath({ path: route, end: true }, path))) return null;

  const shouldShow = STUDENT_PARENT_ROUTES.some((route) => matchPath({ path: route, end: true }, path));
  if (!shouldShow) return null;

  return <BottomNav active={activeKeyFor(path)} />;
}
