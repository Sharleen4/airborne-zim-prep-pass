// "View As" lets a real super admin (role=admin) temporarily browse the app as
// another role (teacher, school_admin, parent, student, user). It's a UI-only
// override — the backend still sees the real admin user. All role checks in the
// frontend run against the overridden role returned from useAuth().

const KEY = "zama_view_as_role";
const EVT = "zama:view-as-changed";

export const VIEW_AS_ROLES = [
  { key: "admin", label: "Super Admin (real)", desc: "Full access to everything" },
  { key: "school_admin", label: "School Admin", desc: "School dashboard & management" },
  { key: "teacher", label: "Teacher", desc: "Teacher home, classes, lessons" },
  { key: "parent", label: "Parent", desc: "Parent dashboard & children" },
  { key: "student", label: "Student", desc: "Student learning home" },
  { key: "user", label: "User (default)", desc: "Default home" },
];

export function getViewAsRole() {
  try { return localStorage.getItem(KEY) || null; } catch { return null; }
}

export function setViewAsRole(role) {
  try {
    if (!role || role === "admin") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, role);
  } catch {}
  // Broadcast so AuthContext re-renders with the new effective role.
  window.dispatchEvent(new Event(EVT));
}

export function subscribeViewAs(callback) {
  const handler = () => callback(getViewAsRole());
  window.addEventListener(EVT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVT, handler);
    window.removeEventListener("storage", handler);
  };
}

// Only the REAL underlying user role decides who can use this feature.
// We stash the real role on the user object as __realRole when overriding.
// Additionally, View As is restricted to a single super-admin email.
const VIEW_AS_ALLOWED_EMAIL = "sharleenbwakura@gmail.com";

export function isRealSuperAdmin(user) {
  if (!user) return false;
  if ((user.email || "").toLowerCase() !== VIEW_AS_ALLOWED_EMAIL) return false;
  return user.__realRole === "admin" || (!user.__realRole && user.role === "admin");
}