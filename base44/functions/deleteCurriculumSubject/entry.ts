import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Deletes ALL CurriculumTopic records that match the given subject (and optional grade).
// Admin-only. Returns the count of deleted topics.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const { subject, grade } = await req.json();
    if (!subject || typeof subject !== 'string') {
      return Response.json({ error: 'subject is required' }, { status: 400 });
    }

    const filter = { subject };
    if (grade) filter.grade = grade;

    // Paginate through all matching topics to handle any size.
    const PAGE = 200;
    let totalDeleted = 0;
    let failed = 0;
    // Loop until no more matches remain.
    for (let safety = 0; safety < 200; safety++) {
      const batch = await base44.asServiceRole.entities.CurriculumTopic.filter(filter, '-created_date', PAGE);
      if (!batch || batch.length === 0) break;

      const results = await Promise.allSettled(
        batch.map(t => base44.asServiceRole.entities.CurriculumTopic.delete(t.id))
      );
      for (const r of results) {
        if (r.status === 'fulfilled') totalDeleted++;
        else failed++;
      }

      // If everything in the batch failed, bail out to avoid infinite loop.
      if (failed > 0 && totalDeleted === 0) break;
      // If batch was smaller than PAGE we're likely done.
      if (batch.length < PAGE) {
        // Re-check in case more exist (filter may include items just deleted in this loop)
        const remaining = await base44.asServiceRole.entities.CurriculumTopic.filter(filter, '-created_date', 1);
        if (!remaining || remaining.length === 0) break;
      }
    }

    return Response.json({ success: true, deleted: totalDeleted, failed, subject, grade: grade || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});