import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Admin-only: permanently delete a user and their personal data.
// Cleans up commonly-linked records (child profiles, results, bookmarks, etc.)
// but leaves billing/audit records intact per our published policy.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (me.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { user_id, user_email } = await req.json().catch(() => ({}));
    if (!user_id && !user_email) {
      return Response.json({ error: 'user_id or user_email required' }, { status: 400 });
    }

    // Resolve the user record
    let target = null;
    if (user_id) {
      const matches = await base44.asServiceRole.entities.User.filter({ id: user_id }, '-created_date', 1).catch(() => []);
      target = matches[0];
    }
    if (!target && user_email) {
      const matches = await base44.asServiceRole.entities.User.filter({ email: user_email }, '-created_date', 1).catch(() => []);
      target = matches[0];
    }
    if (!target) return Response.json({ error: 'User not found' }, { status: 404 });

    // Safety: don't allow an admin to delete themselves via this endpoint
    if (target.email === me.email) {
      return Response.json({ error: "You can't delete your own account from here." }, { status: 400 });
    }

    const email = target.email;
    const summary = { user: 0, child_profiles: 0, student_results: 0, bookmarks: 0, homework: 0, parent_profile: 0 };

    // Best-effort cascade cleanup — each in its own try/catch so one failure
    // doesn't abort the whole delete.
    const sr = base44.asServiceRole;

    try {
      const items = await sr.entities.ChildProfile.filter({ parent_email: email }, '-created_date', 1000);
      for (const it of items) { await sr.entities.ChildProfile.delete(it.id).catch(() => null); summary.child_profiles++; }
    } catch {}

    try {
      const items = await sr.entities.StudentResult.filter({ student_email: email }, '-created_date', 5000);
      for (const it of items) { await sr.entities.StudentResult.delete(it.id).catch(() => null); summary.student_results++; }
    } catch {}

    try {
      const items = await sr.entities.Bookmark.filter({ student_email: email }, '-created_date', 5000);
      for (const it of items) { await sr.entities.Bookmark.delete(it.id).catch(() => null); summary.bookmarks++; }
    } catch {}

    try {
      const items = await sr.entities.HomeworkAssignment.filter({ parent_email: email }, '-created_date', 1000);
      for (const it of items) { await sr.entities.HomeworkAssignment.delete(it.id).catch(() => null); summary.homework++; }
    } catch {}

    try {
      const items = await sr.entities.ParentProfile.filter({ user_email: email }, '-created_date', 10);
      for (const it of items) { await sr.entities.ParentProfile.delete(it.id).catch(() => null); summary.parent_profile++; }
    } catch {}

    // Finally, delete the user record itself
    try {
      await sr.entities.User.delete(target.id);
      summary.user = 1;
    } catch (e) {
      return Response.json({ error: `Failed to delete user record: ${e.message}` }, { status: 500 });
    }

    return Response.json({ success: true, email, summary });
  } catch (error) {
    console.error('adminDeleteUser error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});