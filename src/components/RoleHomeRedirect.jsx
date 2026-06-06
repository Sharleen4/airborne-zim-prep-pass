import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import Home from "@/pages/Home";

// Routes users to the right home based on their role.
// - school_admin → /school-admin
// - teacher (with a TeacherProfile-backed school) → /teacher
// - everyone else → the existing parent/student Home
export default function RoleHomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Home />;
  if (user.role === "school_admin") return <Navigate to="/school-admin" replace />;
  if (user.role === "teacher") return <Navigate to="/teacher" replace />;
  // Note: teachers can still opt into the regular Home; we only redirect when they have NO child profiles.
  // This keeps the existing "teacher partner referrals" UX intact for users who play both roles.
  return <Home />;
}