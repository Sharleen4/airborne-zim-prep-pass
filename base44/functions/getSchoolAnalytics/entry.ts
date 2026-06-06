import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns aggregate analytics for the school owned by the calling school_admin.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'school_admin' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — school admin only' }, { status: 403 });
    }

    // Determine which school to report on.
    // 1. If the caller passes a specific school_id, use it — but only if they're allowed to administer it.
    // 2. Otherwise fall back to the first school they own / co-admin.
    const callerEmail = (user.email || "").toLowerCase();
    let body = {};
    try { body = await req.json(); } catch {}
    const requestedSchoolId = body?.school_id || null;

    const canAdminister = (s) => {
      if (!s) return false;
      if (user.role === 'admin') return true;
      if ((s.school_admin_email || "").toLowerCase() === callerEmail) return true;
      const coAdmins = Array.isArray(s.co_admin_emails) ? s.co_admin_emails : [];
      return coAdmins.map(e => (e || "").toLowerCase()).includes(callerEmail);
    };

    let school = null;
    if (requestedSchoolId) {
      const candidate = await base44.asServiceRole.entities.School.get(requestedSchoolId).catch(() => null);
      if (candidate && canAdminister(candidate)) school = candidate;
    }
    if (!school) {
      const owned = await base44.asServiceRole.entities.School.filter({ school_admin_email: user.email }, '-created_date', 5).catch(() => []);
      school = owned[0] || null;
    }
    if (!school) {
      const all = await base44.asServiceRole.entities.School.list('-created_date', 500).catch(() => []);
      school = all.find(s => Array.isArray(s.co_admin_emails) && s.co_admin_emails.map(e => (e || "").toLowerCase()).includes(callerEmail)) || null;
    }
    if (!school) {
      return Response.json({
        school: null,
        totals: { students: 0, teachers: 0, classes: 0 },
        homework_completion_rate: 0,
        student_activity_rate: 0,
        recent_announcements: [],
      });
    }

    const schoolId = school.id;

    const [students, teachers, classes, homeworks, submissions, announcements] = await Promise.all([
      base44.asServiceRole.entities.StudentProfile.filter({ school_id: schoolId, is_active: true }, '-created_date', 1000),
      base44.asServiceRole.entities.TeacherProfile.filter({ school_id: schoolId, is_active: true }, '-created_date', 500),
      base44.asServiceRole.entities.SchoolClass.filter({ school_id: schoolId, is_active: true }, '-created_date', 500),
      base44.asServiceRole.entities.SchoolHomework.filter({ school_id: schoolId, is_active: true }, '-created_date', 500),
      base44.asServiceRole.entities.HomeworkSubmission.filter({ school_id: schoolId }, '-created_date', 2000),
      base44.asServiceRole.entities.SchoolAnnouncement.filter({ school_id: schoolId }, '-created_date', 5),
    ]);

    // Homework completion rate: submitted/graded vs total expected (homework * students_in_class)
    const totalExpected = homeworks.reduce((sum, hw) => {
      const cls = classes.find(c => c.id === hw.class_id);
      return sum + (cls?.student_emails?.length || 0);
    }, 0);
    const totalSubmitted = submissions.filter(s => s.status === 'submitted' || s.status === 'graded').length;
    const homeworkRate = totalExpected > 0 ? Math.round((totalSubmitted / totalExpected) * 100) : 0;

    // Student activity rate: students who logged in within last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const studentEmails = students.map(s => s.user_email).filter(Boolean);
    let activeCount = 0;
    if (studentEmails.length > 0) {
      const allUsers = await base44.asServiceRole.entities.User.filter({ email: { $in: studentEmails } }, '-last_login_date', 2000).catch(() => []);
      activeCount = allUsers.filter(u => u.last_login_date && new Date(u.last_login_date) >= sevenDaysAgo).length;
    }
    const activityRate = students.length > 0 ? Math.round((activeCount / students.length) * 100) : 0;

    return Response.json({
      school,
      totals: {
        students: students.length,
        teachers: teachers.length,
        classes: classes.length,
        homework: homeworks.length,
      },
      homework_completion_rate: homeworkRate,
      student_activity_rate: activityRate,
      recent_announcements: announcements,
    });
  } catch (error) {
    console.error('getSchoolAnalytics error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});