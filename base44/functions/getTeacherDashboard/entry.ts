import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns dashboard data for a teacher: their classes, recent homework, and student performance summary.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden — teacher only' }, { status: 403 });
    }

    // Find teacher profile
    const profiles = await base44.asServiceRole.entities.TeacherProfile.filter(
      { user_email: user.email, is_active: true }, '-created_date', 1
    );
    const profile = profiles[0];

    if (!profile) {
      return Response.json({
        profile: null,
        school: null,
        classes: [],
        recent_homework: [],
        totals: { classes: 0, students: 0, homework: 0, pending_submissions: 0 },
      });
    }

    const [school, classes, homework] = await Promise.all([
      base44.asServiceRole.entities.School.filter({ id: profile.school_id }, '-created_date', 1).then(r => r[0] || null),
      base44.asServiceRole.entities.SchoolClass.filter({ school_id: profile.school_id, teacher_email: user.email, is_active: true }, '-created_date', 100),
      base44.asServiceRole.entities.SchoolHomework.filter({ teacher_email: user.email, is_active: true }, '-due_date', 50),
    ]);

    // Submissions for those homework
    const homeworkIds = homework.map(h => h.id);
    let submissions = [];
    if (homeworkIds.length) {
      submissions = await base44.asServiceRole.entities.HomeworkSubmission.filter(
        { homework_id: { $in: homeworkIds } }, '-created_date', 500
      ).catch(() => []);
    }

    const studentsTotal = classes.reduce((sum, c) => sum + (c.student_emails?.length || 0), 0);
    const pendingCount = submissions.filter(s => s.status === 'submitted').length;

    return Response.json({
      profile,
      school,
      classes,
      recent_homework: homework.slice(0, 10),
      totals: {
        classes: classes.length,
        students: studentsTotal,
        homework: homework.length,
        pending_submissions: pendingCount,
      },
    });
  } catch (error) {
    console.error('getTeacherDashboard error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});