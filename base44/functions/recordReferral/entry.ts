import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called by newly logged-in user to record who referred them
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { referrer_email } = await req.json();
  if (!referrer_email || referrer_email === user.email) {
    return Response.json({ error: "Invalid referrer" }, { status: 400 });
  }

  // Check if this referral already exists
  const existing = await base44.asServiceRole.entities.Referral.filter({
    referred_email: user.email,
  });
  if (existing.length > 0) {
    return Response.json({ already_recorded: true });
  }

  // Record the referral as completed (user has signed up)
  await base44.asServiceRole.entities.Referral.create({
    referrer_email,
    referred_email: user.email,
    status: "completed",
  });

  return Response.json({ success: true });
});