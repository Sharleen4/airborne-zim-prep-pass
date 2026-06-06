import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called from the frontend on every app load for authenticated users
// to record login and update streak/inactive_days
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  // Log a UserSession record once per user per day so admin analytics can accurately
  // count active users (matches Base44's own active-user counting).
  const today = new Date().toISOString().slice(0, 10);
  try {
    const existing = await base44.asServiceRole.entities.UserSession.filter({
      user_email: user.email,
      session_date: today,
    });
    if (!existing || existing.length === 0) {
      const userAgent = req.headers.get('user-agent') || '';
      await base44.asServiceRole.entities.UserSession.create({
        user_email: user.email,
        user_role: user.role || 'user',
        session_date: today,
        user_agent: userAgent.slice(0, 300),
      });
    }
  } catch (e) {
    console.warn('[onUserLogin] failed to log UserSession:', e?.message);
  }

  // Also stamp last_login_date on the user record (best-effort, kept for compatibility)
  const lastLoginDay = user.last_login_date ? new Date(user.last_login_date).toISOString().slice(0, 10) : null;
  if (lastLoginDay !== today) {
    try {
      await base44.auth.updateMe({ last_login_date: new Date().toISOString() });
    } catch (e) {
      console.warn('[onUserLogin] failed to stamp last_login_date:', e?.message);
    }
  }

  await base44.asServiceRole.functions.invoke('updateChildPerformance', {
    event_type: 'login',
    student_email: user.email,
  });

  // Send welcome email on first login (check if they have any email logs)
  const existingLogs = await base44.asServiceRole.entities.EmailLog.filter({ recipient_email: user.email });
  if (existingLogs.length === 0) {
    await base44.asServiceRole.functions.invoke('sendEngagementEmail', {
      email_type: 'welcome',
      recipient_email: user.email,
      parent_name: user.full_name || user.email,
      child_name: user.full_name || user.email,
    });
  }

  return Response.json({ success: true });
});