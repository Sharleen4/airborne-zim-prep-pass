import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Returns per-student performance for a class.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { class_id } = await req.json();
    if (!class_id) return Response.json({ error: 'class_id required' }, { status: 400 });

    const cls = await base44.asServiceRole.entities.SchoolClass.filter({ id: class_id }, '-created_date', 1).then(r => r[0]);
    if (!cls) return Response.json({ error: 'Class not found' }, { status: 404 });

    // Only the class teacher, school admin, or platform admin can view
    const isOwner = cls.teacher_email === user.email;
    const isAdmin = user.role === 'admin' || user.role === 'school_admin';
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const studentEmails = cls.student_emails || [];
    if (!studentEmails.length) {
      return Response.json({ class: cls, students: [], average_score: 0, top_performers: [], needs_intervention: [] });
    }

    const [profiles, results] = await Promise.all([
      base44.asServiceRole.entities.StudentProfile.filter({ user_email: { $in: studentEmails } }, '-created_date', 500).catch(() => []),
      base44.asServiceRole.entities.StudentResult.filter({ student_email: { $in: studentEmails } }, '-created_date', 2000).catch(() => []),
    ]);

    const byEmail = new Map();
    for (const r of results) {
      if (!byEmail.has(r.student_email)) byEmail.set(r.student_email, []);
      byEmail.get(r.student_email).push(r);
    }

    const students = studentEmails.map(email => {
      const prof = profiles.find(p => p.user_email === email);
      const rs = byEmail.get(email) || [];
      const recent = rs.slice(0, 5);
      const avg = rs.length ? Math.round(rs.reduce((s, r) => s + (r.percentage || 0), 0) / rs.length) : 0;

      // Topic strength/weakness from QuestionPerformance equivalent — use weak_topics field on results
      const weak = new Set();
      rs.forEach(r => (r.weak_topics || []).forEach(t => weak.add(t)));

      return {
        email,
        full_name: prof?.full_name || email,
        average: avg,
        sessions_count: rs.length,
        recent_scores: recent.map(r => ({ date: r.created_date, percentage: r.percentage, type: r.session_type })),
        weak_topics: Array.from(weak).slice(0, 5),
      };
    });

    const sorted = [...students].sort((a, b) => b.average - a.average);
    const classAvg = students.length ? Math.round(students.reduce((s, st) => s + st.average, 0) / students.length) : 0;

    return Response.json({
      class: cls,
      students,
      average_score: classAvg,
      top_performers: sorted.slice(0, 3),
      needs_intervention: sorted.filter(s => s.sessions_count > 0 && s.average < 50).slice(0, 10),
    });
  } catch (error) {
    console.error('getClassPerformance error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});