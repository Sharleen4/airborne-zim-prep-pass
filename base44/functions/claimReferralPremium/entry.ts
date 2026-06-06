import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called when a user has enough referrals to unlock premium
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Count completed referrals for this user
  const referrals = await base44.asServiceRole.entities.Referral.filter({
    referrer_email: user.email,
    status: "completed",
  });

  const REFERRALS_NEEDED = 3;
  if (referrals.length < REFERRALS_NEEDED) {
    return Response.json({
      error: `You need ${REFERRALS_NEEDED} successful referrals. You have ${referrals.length}.`,
      referral_count: referrals.length,
    }, { status: 400 });
  }

  // Check if user already has an active premium subscription
  const existing = await base44.asServiceRole.entities.Subscription.filter({
    user_email: user.email,
    status: "active",
  });
  const todayStr = new Date().toISOString().split("T")[0];
  const activePremium = existing.find(s => s.is_premium && s.end_date >= todayStr);
  if (activePremium) {
    return Response.json({ already_active: true, end_date: activePremium.end_date });
  }

  // Grant 1 month of premium
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const sub = await base44.asServiceRole.entities.Subscription.create({
    user_email: user.email,
    plan: "referral_premium",
    status: "active",
    start_date: startDate.toISOString().split("T")[0],
    end_date: endDate.toISOString().split("T")[0],
    amount_paid: 0,
    is_premium: true,
  });

  return Response.json({ success: true, end_date: sub.end_date });
});