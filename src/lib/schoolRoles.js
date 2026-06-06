// Helper utilities for role-based access in the school management module.

export const SCHOOL_ROLES = {
  ADMIN: "admin",
  SCHOOL_ADMIN: "school_admin",
  TEACHER: "teacher",
  PARENT: "parent",
  STUDENT: "student",
  USER: "user", // legacy default (treated as parent)
};

export function isSchoolAdmin(user) {
  return user?.role === SCHOOL_ROLES.SCHOOL_ADMIN || user?.role === SCHOOL_ROLES.ADMIN;
}

export function isTeacher(user) {
  return user?.role === SCHOOL_ROLES.TEACHER;
}

export function isParent(user) {
  return user?.role === SCHOOL_ROLES.PARENT || user?.role === SCHOOL_ROLES.USER;
}

export function isStudent(user) {
  return user?.role === SCHOOL_ROLES.STUDENT;
}

export function getSchoolNavLinks(role) {
  if (role === SCHOOL_ROLES.SCHOOL_ADMIN || role === SCHOOL_ROLES.ADMIN) {
    return [
      { to: "/school-admin", label: "Dashboard", icon: "🏫" },
      { to: "/school-admin/teachers", label: "Teachers", icon: "👩‍🏫" },
      { to: "/school-admin/classes", label: "Classes", icon: "📚" },
      { to: "/school-admin/students", label: "Students", icon: "🧑‍🎓" },
      { to: "/school-admin/reports", label: "Reports", icon: "📊" },
    ];
  }
  return [];
}