import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Admins always have access
  if (user.role === "admin") {
    return Response.json({ active: true, isAdmin: true });
  }

  const todayStr = new Date().toISOString().split("T")[0];

  // Check for a paid active subscription FIRST — paid subs override trial logic
  const subs = await base44.asServiceRole.entities.Subscription.filter({
    user_email: user.email,
    status: "active",
  });

  const activeSubs = subs.filter(s => s.end_date >= todayStr);

  if (!activeSubs.length) {
    // Mark any stale "active" subs as expired
    for (const s of subs) {
      if (s.end_date < todayStr) {
        await base44.asServiceRole.entities.Subscription.update(s.id, { status: "expired" });
      }
    }

    // No paid subscription — check free trial
    // Existing users (signed up before NEW_TRIAL_POLICY_DATE) keep their 14-day trial.
    // New users from this date onwards get a 7-day full-access trial.
    const TRIAL_RESET_DATE = new Date("2026-04-26");
    const NEW_TRIAL_POLICY_DATE = new Date("2026-05-11");
    const accountCreatedDate = new Date(user.created_date);
    const trialStartDate = accountCreatedDate > TRIAL_RESET_DATE ? accountCreatedDate : TRIAL_RESET_DATE;
    const trialDurationDays = accountCreatedDate >= NEW_TRIAL_POLICY_DATE ? 7 : 14;
    const trialEndDate = new Date(trialStartDate);
    trialEndDate.setDate(trialEndDate.getDate() + trialDurationDays);
    const today = new Date();
    if (today <= trialEndDate) {
      const daysLeft = Math.ceil((trialEndDate - today) / (1000 * 60 * 60 * 24));
      return Response.json({
        active: true,
        isTrial: true,
        trial_end_date: trialEndDate.toISOString().split("T")[0],
        days_left: daysLeft,
        payment_url: "https://zamaai.base44.app/payment",
      });
    }

    // Also expire linked ParentProfile if still on trial/unpaid
    const parentProfiles = await base44.asServiceRole.entities.ParentProfile.filter({ user_email: user.email });
    for (const p of parentProfiles) {
      if (p.subscription_status === 'trial' && p.payment_status === 'unpaid') {
        await base44.asServiceRole.entities.ParentProfile.update(p.id, { subscription_status: 'expired' });
      }
    }
    return Response.json({ active: false, isExpired: true });
  }

  // Pick the best active subscription (family > premium > standard)
  const activeSub =
    activeSubs.find(s => s.is_family) ||
    activeSubs.find(s => s.is_premium) ||
    activeSubs[0];

  return Response.json({
    active: true,
    plan: activeSub.plan,
    end_date: activeSub.end_date,
    isPremium: !!activeSub.is_premium,
    isFamily: !!activeSub.is_family,
    maxChildren: activeSub.is_family ? (activeSub.max_children || 4) : 1,
  });
});