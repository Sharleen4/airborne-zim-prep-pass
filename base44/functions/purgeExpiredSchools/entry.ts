import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Daily scheduled job: permanently deletes schools whose 30-day recycle-bin window has elapsed.
// Admin-only invocation.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    // Only admin (manual trigger) OR scheduled invocation (no user) is allowed.
    // We accept both; for safety, if a user is present and isn't admin we reject.
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const candidates = await base44.asServiceRole.entities.School.filter(
      { deletion_status: "scheduled" },
      '-deletion_scheduled_at',
      500
    );

    const expired = candidates.filter(s => s.deletion_scheduled_at && s.deletion_scheduled_at <= now);

    let purged = 0;
    for (const s of expired) {
      try {
        await base44.asServiceRole.entities.School.delete(s.id);
        purged += 1;
      } catch (e) {
        console.warn("Failed to purge school", s.id, e.message);
      }
    }

    return Response.json({ ok: true, candidates: candidates.length, purged });
  } catch (error) {
    console.error('purgeExpiredSchools error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});