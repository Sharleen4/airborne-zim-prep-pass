import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Remove a co-admin from a school. Only the primary admin can do this.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetEmail = (body.email || "").trim().toLowerCase();
    if (!targetEmail) return Response.json({ error: "Email required" }, { status: 400 });

    const schools = await base44.asServiceRole.entities.School.filter({ school_admin_email: user.email }, '-created_date', 1);
    const school = schools[0];
    if (!school) return Response.json({ error: 'Only the primary admin can remove co-admins' }, { status: 403 });

    const existing = Array.isArray(school.co_admin_emails) ? school.co_admin_emails : [];
    const updated = existing.filter(e => e.toLowerCase() !== targetEmail);
    await base44.asServiceRole.entities.School.update(school.id, { co_admin_emails: updated });

    return Response.json({ ok: true, co_admin_emails: updated });
  } catch (error) {
    console.error('removeCoAdmin error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});