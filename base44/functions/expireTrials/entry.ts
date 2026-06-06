import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Scheduled daily job — expires ParentProfiles whose free trial has ended
// and who still have payment_status = 'unpaid'. Changes subscription_status to 'expired'.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  // All trial parents whose trial has ended
  const trialParents = await base44.asServiceRole.entities.ParentProfile.filter({
    subscription_status: 'trial',
  });

  const expired = [];
  const skipped = [];

  for (const parent of trialParents) {
    if (!parent.free_trial_end_date) continue;

    const endDate = new Date(parent.free_trial_end_date);
    endDate.setHours(0, 0, 0, 0);

    // Only process if trial has actually ended
    if (endDate >= today) {
      skipped.push({ parent_id: parent.id, days_left: Math.round((endDate - today) / 86400000) });
      continue;
    }

    // Only expire if still unpaid
    if (parent.payment_status !== 'unpaid') {
      skipped.push({ parent_id: parent.id, reason: 'payment_status is not unpaid' });
      continue;
    }

    // Check if they have an active paid subscription in the Subscription entity
    const subs = await base44.asServiceRole.entities.Subscription.filter({
      user_email: parent.user_email,
      status: 'active',
    });
    const hasActiveSub = subs.some(s => s.end_date >= todayStr);
    if (hasActiveSub) {
      // Upgrade their parent profile to active
      await base44.asServiceRole.entities.ParentProfile.update(parent.id, {
        subscription_status: 'active',
        payment_status: 'paid',
      });
      skipped.push({ parent_id: parent.id, reason: 'has active paid subscription — upgraded' });
      continue;
    }

    // Expire them
    await base44.asServiceRole.entities.ParentProfile.update(parent.id, {
      subscription_status: 'expired',
    });

    expired.push({ parent_id: parent.id, user_email: parent.user_email });
  }

  return Response.json({
    success: true,
    expired: expired.length,
    skipped: skipped.length,
    details: { expired, skipped },
  });
});