import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Sends an email to the super admin (ADMIN_NOTIFICATION_EMAIL) when a school
// admin creates a new school, so the super admin can review & approve it.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { school_id } = body;
    if (!school_id) return Response.json({ error: 'school_id required' }, { status: 400 });

    const school = await base44.asServiceRole.entities.School.get(school_id).catch(() => null);
    if (!school) return Response.json({ error: 'School not found' }, { status: 404 });

    const to = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
    if (!to) {
      console.warn("ADMIN_NOTIFICATION_EMAIL not configured");
      return Response.json({ ok: false, warning: 'ADMIN_NOTIFICATION_EMAIL not set' });
    }

    const subject = `New school awaiting approval: ${school.name}`;
    const lines = [
      `A new school has been registered on Zamaai Primary and is awaiting your approval.`,
      ``,
      `School: ${school.name}`,
      `City: ${school.city || "—"}`,
      `Total students: ${school.total_students ?? "—"}`,
      `Contact person: ${school.contact_person_name || "—"} (${school.contact_person_job_title || "—"})`,
      `Contact phone: ${school.contact_phone || "—"}`,
      `Admin email: ${school.school_admin_email}`,
      ``,
      `Sign in to the super admin dashboard to review and approve this school.`,
      ``,
      `Zamaai Primary`,
    ];

    await base44.integrations.Core.SendEmail({
      to,
      subject,
      body: lines.join("\n"),
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('notifySuperAdminOfNewSchool error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});