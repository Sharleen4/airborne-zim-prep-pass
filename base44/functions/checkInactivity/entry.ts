import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Scheduled daily job — sends inactivity nudge SMS to parents
// when a child hasn't studied in 3 or more days
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const today = new Date().toISOString().split('T')[0];
  const todayDate = new Date(today);

  // Get all child performance metrics
  const allMetrics = await base44.asServiceRole.entities.ChildPerformanceMetrics.list();

  const results = [];

  for (const metrics of allMetrics) {
    if (!metrics.last_login_date) continue;

    const lastLogin = new Date(metrics.last_login_date);
    const diffMs = todayDate - lastLogin;
    const inactiveDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Only fire at exactly 3 days inactive to avoid spam
    if (inactiveDays !== 3) continue;

    // Check we haven't already sent an inactivity alert today
    const existingLogs = await base44.asServiceRole.entities.NotificationLog.filter({
      child_id: metrics.child_id,
      notification_type: 'inactivity_alert',
    });
    const alreadySentToday = existingLogs.some(log =>
      log.sent_date && log.sent_date.startsWith(today)
    );
    if (alreadySentToday) continue;

    // Find linked parent
    if (!metrics.linked_parent_id) continue;
    const parents = await base44.asServiceRole.entities.ParentProfile.filter({ id: metrics.linked_parent_id });
    const parent = parents[0];
    if (!parent) continue;

    await base44.asServiceRole.functions.invoke('createNotificationEvent', {
      parent_id: parent.id,
      child_id: metrics.child_id,
      notification_type: 'inactivity_alert',
      child_name: metrics.child_name,
      parent_name: parent.parent_name,
    });

    results.push({ child_id: metrics.child_id, child_name: metrics.child_name, inactive_days: inactiveDays });
    console.log(`Inactivity alert sent for ${metrics.child_name} (${inactiveDays} days inactive)`);
  }

  return Response.json({ success: true, nudges_sent: results.length, results });
});