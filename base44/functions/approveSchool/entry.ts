import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Super admin approves or rejects a school registration.
// Sends an email to the school primary admin notifying them of the decision.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: super admin only' }, { status: 403 });
    }

    const { school_id, action, reason } = await req.json().catch(() => ({}));
    if (!school_id || !['approve', 'reject'].includes(action)) {
      return Response.json({ error: 'school_id and action ("approve"|"reject") required' }, { status: 400 });
    }

    const school = await base44.asServiceRole.entities.School.get(school_id).catch(() => null);
    if (!school) return Response.json({ error: 'School not found' }, { status: 404 });

    const patch = action === 'approve'
      ? {
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: user.email,
          rejection_reason: "",
        }
      : {
          approval_status: 'rejected',
          rejection_reason: (reason || "").trim() || "No reason provided",
        };

    await base44.asServiceRole.entities.School.update(school.id, patch);

    // Notify the primary school admin
    try {
      if (action === 'approve') {
        await base44.integrations.Core.SendEmail({
          to: school.school_admin_email,
          subject: `Your school "${school.name}" has been approved 🎉`,
          body: `Hi ${school.contact_person_name || ""},

Great news — your school "${school.name}" has been approved on Zamaai Primary.

You can now add teachers, create classes, and manage students from your school admin dashboard.

Sign in here: https://zamaaiprimary.online

Welcome to Zamaai Primary!`,
        });
      } else {
        await base44.integrations.Core.SendEmail({
          to: school.school_admin_email,
          subject: `Your school registration was not approved`,
          body: `Hi ${school.contact_person_name || ""},

Unfortunately, the registration for "${school.name}" was not approved at this time.

Reason: ${patch.rejection_reason}

If you believe this is a mistake, please reply to this email and we'll review your account.

Zamaai Primary`,
        });
      }
    } catch (e) {
      console.warn("approveSchool email failed:", e.message);
    }

    return Response.json({ ok: true, approval_status: patch.approval_status });
  } catch (error) {
    console.error('approveSchool error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});