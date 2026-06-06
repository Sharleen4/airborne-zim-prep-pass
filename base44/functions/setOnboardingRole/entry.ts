import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Allows an authenticated user to set their OWN role during onboarding.
// Uses service role to bypass any client-side restrictions on changing the
// `role` field via base44.auth.updateMe().
const ALLOWED_ROLES = ["parent", "teacher", "school_admin", "student", "user"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await req.json().catch(() => ({}));
    if (!role || !ALLOWED_ROLES.includes(role)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Never allow self-elevation to admin.
    if (role === "admin") {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    await base44.asServiceRole.entities.User.update(user.id, { role });

    return Response.json({ success: true, role });
  } catch (error) {
    console.error("setOnboardingRole error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});