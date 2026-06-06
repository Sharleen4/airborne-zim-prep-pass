import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Invite a co-admin to a school. Adds the email to School.co_admin_emails and
// stores their contact details (full name, job title, phone) in co_admin_details.
// Emails them and promotes their account role to school_admin if they exist.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const inviteEmail = (body.email || "").trim().toLowerCase();
    const fullName = (body.full_name || "").trim();
    const jobTitle = (body.job_title || "").trim();
    const phone = (body.phone || "").trim();

    if (!inviteEmail || !inviteEmail.includes("@")) {
      return Response.json({ error: "Valid email required" }, { status: 400 });
    }
    if (!fullName || !jobTitle || !phone) {
      return Response.json({ error: "Full name, job title and phone are required" }, { status: 400 });
    }

    // Find the school owned by the caller (primary admin can invite)
    const schools = await base44.asServiceRole.entities.School.filter({ school_admin_email: user.email }, '-created_date', 1);
    let school = schools[0];

    // Also allow existing co-admins to invite
    if (!school) {
      const allSchools = await base44.asServiceRole.entities.School.list('-created_date', 200);
      school = allSchools.find(s => Array.isArray(s.co_admin_emails) && s.co_admin_emails.map(e => e.toLowerCase()).includes(user.email.toLowerCase()));
    }
    if (!school) return Response.json({ error: 'No school found for this admin' }, { status: 404 });

    if (inviteEmail === (school.school_admin_email || "").toLowerCase()) {
      return Response.json({ error: 'That user is already the primary admin' }, { status: 400 });
    }

    const existing = Array.isArray(school.co_admin_emails) ? school.co_admin_emails : [];
    if (existing.map(e => e.toLowerCase()).includes(inviteEmail)) {
      return Response.json({ error: 'That user is already a co-admin' }, { status: 400 });
    }

    const updatedList = [...existing, inviteEmail];
    const existingDetails = Array.isArray(school.co_admin_details) ? school.co_admin_details : [];
    const updatedDetails = [
      ...existingDetails.filter(d => (d.email || "").toLowerCase() !== inviteEmail),
      { email: inviteEmail, full_name: fullName, job_title: jobTitle, phone },
    ];

    await base44.asServiceRole.entities.School.update(school.id, {
      co_admin_emails: updatedList,
      co_admin_details: updatedDetails,
    });

    // Promote existing user to school_admin if they have an account
    const matchingUsers = await base44.asServiceRole.entities.User.filter({ email: inviteEmail }, '-created_date', 1).catch(() => []);
    if (matchingUsers[0] && matchingUsers[0].role !== 'admin') {
      await base44.asServiceRole.entities.User.update(matchingUsers[0].id, { role: 'school_admin' }).catch(() => {});
    }

    // Send notification email
    try {
      await base44.integrations.Core.SendEmail({
        to: inviteEmail,
        subject: `You're invited to co-admin ${school.name} on Zamaai Primary`,
        body: `Hi ${fullName},

${user.full_name || user.email} has invited you to be a co-administrator (${jobTitle}) for ${school.name} on Zamaai Primary.

Co-admins can manage teachers, classes, students, and school settings. You'll also be required as one of three approvers for any school deletion request.

To accept, sign in (or create an account) using this email address — ${inviteEmail} — and you'll automatically have school admin access.

Sign in here: https://zamaaiprimary.online

Welcome to the team!
Zamaai Primary`,
      });
    } catch (e) {
      console.warn("inviteCoAdmin email failed:", e.message);
    }

    return Response.json({ ok: true, co_admin_emails: updatedList });
  } catch (error) {
    console.error('inviteCoAdmin error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});