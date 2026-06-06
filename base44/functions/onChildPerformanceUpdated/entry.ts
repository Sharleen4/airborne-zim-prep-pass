import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Triggered by entity automation on ChildPerformanceMetrics (update)
// Handles: inactivity_alert, low_score_alert, improvement_praise, homework_completed
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const metrics = body.data;
  const oldMetrics = body.old_data;
  const changedFields = body.changed_fields || [];

  if (!metrics?.child_id) return Response.json({ skipped: true });

  // Find linked parent
  const parents = await base44.asServiceRole.entities.ParentProfile.filter({ child_id: metrics.child_id });
  // Also try via linked_parent_id
  let parent = parents[0];
  if (!parent && metrics.linked_parent_id) {
    const byId = await base44.asServiceRole.entities.ParentProfile.filter({ id: metrics.linked_parent_id });
    parent = byId[0];
  }
  if (!parent) return Response.json({ skipped: true, reason: 'No parent profile found' });

  const basePayload = {
    parent_id: parent.id,
    child_id: metrics.child_id,
    child_name: metrics.child_name,
    parent_name: parent.parent_name,
    subject: metrics.last_quiz_subject,
    topic: metrics.last_quiz_topic,
  };

  const notifications = [];

  // EVENT: inactivity_alert — inactive_days >= 2
  if (
    changedFields.includes('inactive_days') &&
    metrics.inactive_days >= 2 &&
    (oldMetrics?.inactive_days || 0) < 2
  ) {
    notifications.push({ ...basePayload, notification_type: 'inactivity_alert' });
  }

  // EVENT: low_score_alert — last_quiz_score < 50
  if (
    changedFields.includes('last_quiz_score') &&
    metrics.last_quiz_score != null &&
    metrics.last_quiz_score < 50
  ) {
    notifications.push({
      ...basePayload,
      notification_type: 'low_score_alert',
      score: metrics.last_quiz_score,
    });
  }

  // EVENT: improvement_praise — score_difference >= 15
  if (
    changedFields.includes('last_quiz_score') &&
    metrics.last_quiz_score != null &&
    metrics.previous_quiz_score != null
  ) {
    const scoreDiff = metrics.last_quiz_score - metrics.previous_quiz_score;
    if (scoreDiff >= 15) {
      notifications.push({
        ...basePayload,
        notification_type: 'improvement_praise',
        score: metrics.last_quiz_score,
      });
    }
  }

  // EVENT: homework_completed — homework_pending changed to 0
  if (
    changedFields.includes('homework_pending') &&
    metrics.homework_pending === 0 &&
    (oldMetrics?.homework_pending || 0) > 0
  ) {
    notifications.push({ ...basePayload, notification_type: 'homework_completed' });
  }

  // Fire all notifications
  await Promise.all(
    notifications.map(n => base44.asServiceRole.functions.invoke('createNotificationEvent', n))
  );

  return Response.json({ success: true, notifications_created: notifications.length });
});