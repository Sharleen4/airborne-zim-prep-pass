import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Triggered by entity automation on StudentResult (create)
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const result = body.data;
  if (!result) return Response.json({ skipped: true });

  const isMockExam = result.session_type === 'mock_exam';
  const eventType = isMockExam ? 'mock_exam_completed' : 'quiz_completed';
  const score = result.percentage || 0;

  // Look up subject and topic names
  let subjectName = '';
  let topicName = '';
  if (result.subject_id) {
    const subjects = await base44.asServiceRole.entities.Subject.filter({ id: result.subject_id });
    subjectName = subjects[0]?.name || '';
  }
  if (result.topic_id) {
    const topics = await base44.asServiceRole.entities.Topic.filter({ id: result.topic_id });
    topicName = topics[0]?.name || '';
  }

  // Update performance metrics
  await base44.asServiceRole.functions.invoke('updateChildPerformance', {
    event_type: eventType,
    student_email: result.student_email,
    subject_name: subjectName,
    topic_name: topicName,
    score,
    session_type: result.session_type,
  });

  // --- SMS Notification to parent ---
  // Find the child profile and parent
  const childProfiles = await base44.asServiceRole.entities.ChildProfile.filter({ parent_email: result.student_email });
  const childProfile = childProfiles[0] || null;

  if (childProfile) {
    const parentProfiles = await base44.asServiceRole.entities.ParentProfile.filter({ user_email: childProfile.parent_email });
    const parent = parentProfiles[0] || null;

    if (parent) {
      // Get previous metrics to detect streaks & improvements
      const metricsList = await base44.asServiceRole.entities.ChildPerformanceMetrics.filter({ child_id: childProfile.id });
      const metrics = metricsList[0] || null;
      const prevScore = metrics?.previous_quiz_score ?? null;
      const streakDays = metrics?.streak_days || 0;
      const childName = childProfile.child_name;
      const sessionLabel = isMockExam ? 'mock exam' : `${subjectName}${topicName ? ' – ' + topicName : ''}`;

      let notificationType = null;
      let extraPayload = {};

      if (isMockExam) {
        // Always notify on mock exam
        notificationType = score >= 70 ? 'improvement_praise' : 'low_score_alert';
        extraPayload = { subject: subjectName, topic: topicName, score };
      } else if (score < 50) {
        // Low score alert
        notificationType = 'low_score_alert';
        extraPayload = { subject: subjectName, topic: topicName, score };
      } else if (prevScore !== null && score >= prevScore + 10) {
        // Significant improvement (10%+ better)
        notificationType = 'improvement_praise';
        extraPayload = { subject: subjectName, topic: topicName, score };
      } else if (streakDays > 0 && streakDays % 5 === 0) {
        // Milestone streak (every 5 days)
        notificationType = 'improvement_praise';
        extraPayload = { subject: subjectName, topic: topicName, score };
      }

      if (notificationType) {
        await base44.asServiceRole.functions.invoke('createNotificationEvent', {
          parent_id: parent.id,
          child_id: childProfile.id,
          notification_type: notificationType,
          child_name: childName,
          parent_name: parent.parent_name,
          ...extraPayload,
        });
        console.log(`SMS notification triggered: ${notificationType} for ${childName}, score: ${score}`);
      }
    }
  }

  return Response.json({ success: true });
});