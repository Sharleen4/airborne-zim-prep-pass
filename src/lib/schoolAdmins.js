// Helpers for determining school admin permissions including co-admins.

export function getAllAdminEmails(school) {
  if (!school) return [];
  const primary = school.school_admin_email ? [school.school_admin_email] : [];
  const coAdmins = Array.isArray(school.co_admin_emails) ? school.co_admin_emails : [];
  const all = [...primary, ...coAdmins].map(e => (e || "").toLowerCase()).filter(Boolean);
  return Array.from(new Set(all));
}

export function isSchoolAdminOf(user, school) {
  if (!user?.email || !school) return false;
  if (user.role === "admin") return true;
  return getAllAdminEmails(school).includes(user.email.toLowerCase());
}

export function isPrimaryAdmin(user, school) {
  if (!user?.email || !school?.school_admin_email) return false;
  return user.email.toLowerCase() === school.school_admin_email.toLowerCase();
}

export const REQUIRED_DELETION_APPROVALS = 3;
export const DELETION_GRACE_DAYS = 30;