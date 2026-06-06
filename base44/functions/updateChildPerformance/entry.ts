import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const { event_type, student_email, subject_name, topic_name, score, session_type } = await req.json();

  // Find the ChildProfile linked to this student_email
  const childProfiles = await base44.asServiceRole.entities.ChildProfile.filter({ parent_email: student_email });
  // Also check if student_email is the child's own login (not parent)
  // We look up by created_by or a direct match
  let childProfile = childProfiles[0] || null;

  // If not found as parent, try finding ChildProfile where the student might be the child account
  // In this app, students log in with their own account, so we match via parent_email OR created_by
  if (!childProfile) {
    const byCreator = await base44.asServiceRole.entities.ChildProfile.filter({ parent_email: student_email });
    childProfile = byCreator[0] || null;
  }

  if (!childProfile) {
    return Response.json({ message: 'No child profile found for this student', student_email }, { status: 200 });
  }

  const childId = childProfile.id;
  const today = new Date().toISOString().split('T')[0];

  // Find or create ChildPerformanceMetrics for this child
  const existing = await base44.asServiceRole.entities.ChildPerformanceMetrics.filter({ child_id: childId });
  const metrics = existing[0] || null;

  const updates = {};

  if (event_type === 'login') {
    const lastLogin = metrics?.last_login_date;
    const todayDate = new Date(today);

    // Calculate inactive_days
    let inactiveDays = 0;
    if (lastLogin) {
      const lastDate = new Date(lastLogin);
      const diffMs = todayDate - lastDate;
      inactiveDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    // Calculate streak_days
    let streakDays = metrics?.streak_days || 0;
    if (lastLogin) {
      const lastDate = new Date(lastLogin);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streakDays += 1; // consecutive day
      } else if (diffDays === 0) {
        // same day login, no change to streak
      } else {
        streakDays = 1; // streak broken, reset
      }
    } else {
      streakDays = 1; // first login
    }

    updates.last_login_date = today;
    updates.inactive_days = inactiveDays;
    updates.streak_days = streakDays;
  }

  if (event_type === 'quiz_completed') {
    const prevScore = metrics?.last_quiz_score ?? null;
    const completedCount = (metrics?.quizzes_completed || 0) + 1;
    const currentAvg = metrics?.average_score ?? null;

    // Recalculate running average
    let newAverage;
    if (currentAvg !== null && completedCount > 1) {
      newAverage = Math.round(((currentAvg * (completedCount - 1)) + score) / completedCount);
    } else {
      newAverage = score;
    }

    updates.previous_quiz_score = prevScore;
    updates.last_quiz_score = score;
    updates.last_quiz_subject = subject_name || metrics?.last_quiz_subject || '';
    updates.last_quiz_topic = topic_name || metrics?.last_quiz_topic || '';
    updates.quizzes_completed = completedCount;
    updates.average_score = newAverage;
    // Also update last_login_date on activity
    updates.last_login_date = today;
    updates.inactive_days = 0;
  }

  if (event_type === 'homework_completed') {
    const pending = Math.max((metrics?.homework_pending || 1) - 1, 0);
    updates.homework_pending = pending;
    updates.last_login_date = today;
    updates.inactive_days = 0;
  }

  if (event_type === 'mock_exam_completed') {
    updates.mock_exam_score = score;
    updates.last_login_date = today;
    updates.inactive_days = 0;
  }

  updates.child_name = childProfile.child_name;
  updates.child_id = childId;

  // Find linked ParentProfile
  const parentProfiles = await base44.asServiceRole.entities.ParentProfile.filter({ user_email: childProfile.parent_email });
  if (parentProfiles[0]) {
    updates.linked_parent_id = parentProfiles[0].id;
  }

  // Upsert: update if exists, create if not
  let result;
  if (metrics) {
    result = await base44.asServiceRole.entities.ChildPerformanceMetrics.update(metrics.id, updates);
  } else {
    result = await base44.asServiceRole.entities.ChildPerformanceMetrics.create(updates);
  }

  return Response.json({ success: true, event_type, child_id: childId, updates: result });
});