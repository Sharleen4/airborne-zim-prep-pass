import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Scheduled daily job — checks all ParentProfiles for trial expiry
// Creates trial_expiry_reminder notifications for 3, 2, and 1 day before expiry
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch all parents on trial
  const parents = await base44.asServiceRole.entities.ParentProfile.filter({ subscription_status: 'trial' });

  const results = [];

  for (const parent of parents) {
    if (!parent.free_trial_end_date) continue;

    const endDate = new Date(parent.free_trial_end_date);
    endDate.setHours(0, 0, 0, 0);

    const diffMs = endDate - today;
    const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

    // Only fire for exactly 3, 2, or 1 day remaining
    if (![1, 2, 3].includes(daysLeft)) continue;

    // Find linked child
    const children = await base44.asServiceRole.entities.ChildProfile.filter({ parent_email: parent.user_email });
    const child = children[0];

    // Check if we already sent this notification today (avoid duplicates)
    const todayStr = today.toISOString().split('T')[0];
    const existingLogs = await base44.asServiceRole.entities.NotificationLog.filter({
      parent_id: parent.id,
      notification_type: 'trial_expiry_reminder',
    });
    const alreadySentToday = existingLogs.some(log => {
      if (!log.sent_date) return false;
      return log.sent_date.startsWith(todayStr) && log.trial_days_remaining === daysLeft;
    });

    if (alreadySentToday) continue;

    await base44.asServiceRole.functions.invoke('createNotificationEvent', {
      parent_id: parent.id,
      child_id: child?.id || parent.child_id || 'unknown',
      notification_type: 'trial_expiry_reminder',
      parent_name: parent.parent_name,
      child_name: child?.child_name || '',
      trial_days_remaining: daysLeft,
      payment_link: 'https://zamaai.base44.app/payment',
    });

    results.push({ parent_id: parent.id, days_left: daysLeft });
  }

  return Response.json({ success: true, processed: results.length, reminders: results });
});