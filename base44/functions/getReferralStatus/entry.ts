import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const referrals = await base44.asServiceRole.entities.Referral.filter({
    referrer_email: user.email,
  });

  const completed = referrals.filter(r => r.status === "completed");
  const pending = referrals.filter(r => r.status === "pending");

  // Referral link uses query param
  const referralLink = `https://zamaaiprimary.online/?ref=${encodeURIComponent(user.email)}`;

  return Response.json({
    total: referrals.length,
    completed: completed.length,
    pending: pending.length,
    referral_link: referralLink,
    can_claim: completed.length >= 3,
  });
});