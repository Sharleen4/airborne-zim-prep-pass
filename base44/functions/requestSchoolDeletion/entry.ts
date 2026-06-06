import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Handles the school deletion approval workflow.
// Actions:
//   "request" - any admin/co-admin initiates a deletion request (counts as the first approval)
//   "approve" - another admin adds their approval. On the 3rd unique approval, the school is hidden
//               and deletion_scheduled_at is set 30 days out.
//   "cancel"  - any admin cancels the pending request (only while still pending, not after schedule)
//   "restore" - any admin restores a scheduled deletion within the 30-day window
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const schoolId = body.school_id;
    if (!action || !schoolId) return Response.json({ error: "action and school_id required" }, { status: 400 });

    const school = await base44.asServiceRole.entities.School.filter({ id: schoolId }, '-created_date', 1).then(r => r[0]);
    if (!school) return Response.json({ error: 'School not found' }, { status: 404 });

    const allAdminEmails = [
      (school.school_admin_email || "").toLowerCase(),
      ...(Array.isArray(school.co_admin_emails) ? school.co_admin_emails.map(e => e.toLowerCase()) : []),
    ].filter(Boolean);

    const callerEmail = user.email.toLowerCase();
    if (!allAdminEmails.includes(callerEmail) && user.role !== 'admin') {
      return Response.json({ error: 'Only school admins can manage deletion' }, { status: 403 });
    }

    const totalUniqueAdmins = new Set(allAdminEmails).size;

    if (action === "request") {
      if (school.deletion_status === "scheduled") {
        return Response.json({ error: 'Deletion already scheduled' }, { status: 400 });
      }
      if (totalUniqueAdmins < 3) {
        return Response.json({ error: 'A school needs at least 3 admins (1 primary + 2 co-admins) before deletion can be requested' }, { status: 400 });
      }
      await base44.asServiceRole.entities.School.update(school.id, {
        deletion_status: "pending",
        deletion_requested_by: callerEmail,
        deletion_requested_at: new Date().toISOString(),
        deletion_approvals: [callerEmail],
        deletion_scheduled_at: null,
      });
      return Response.json({ ok: true, status: "pending", approvals: 1, required: 3 });
    }

    if (action === "approve") {
      if (school.deletion_status !== "pending") {
        return Response.json({ error: 'No pending deletion request' }, { status: 400 });
      }
      const approvals = Array.isArray(school.deletion_approvals) ? school.deletion_approvals.map(e => e.toLowerCase()) : [];
      if (approvals.includes(callerEmail)) {
        return Response.json({ error: 'You have already approved this request' }, { status: 400 });
      }
      const newApprovals = [...approvals, callerEmail];
      if (newApprovals.length >= 3) {
        const scheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await base44.asServiceRole.entities.School.update(school.id, {
          deletion_status: "scheduled",
          deletion_approvals: newApprovals,
          deletion_scheduled_at: scheduledAt,
          is_active: false,
        });
        return Response.json({ ok: true, status: "scheduled", approvals: newApprovals.length, required: 3, scheduled_at: scheduledAt });
      }
      await base44.asServiceRole.entities.School.update(school.id, { deletion_approvals: newApprovals });
      return Response.json({ ok: true, status: "pending", approvals: newApprovals.length, required: 3 });
    }

    if (action === "cancel" || action === "restore") {
      await base44.asServiceRole.entities.School.update(school.id, {
        deletion_status: "none",
        deletion_approvals: [],
        deletion_requested_by: null,
        deletion_requested_at: null,
        deletion_scheduled_at: null,
        is_active: true,
      });
      return Response.json({ ok: true, status: "none" });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('requestSchoolDeletion error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});