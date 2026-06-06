import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Removes duplicate questions (same question_text, same topic_id) from the database.
// Keeps the oldest record, deletes the rest.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all active questions
    const questions = await base44.asServiceRole.entities.Question.list('-created_date', 2000);

    // Sort oldest first so we keep the oldest copy
    const sorted = [...questions].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

    // Deduplicate by topic_id + normalised question_text
    const seen = new Map();
    const toDelete = [];

    for (const q of sorted) {
      const key = `${q.topic_id}::${q.question_text?.trim().toLowerCase()}`;
      if (seen.has(key)) {
        toDelete.push(q.id);
      } else {
        seen.set(key, q.id);
      }
    }

    let deleted = 0;
    for (const id of toDelete) {
      await base44.asServiceRole.entities.Question.delete(id);
      deleted++;
      // Small delay to avoid rate limiting
      if (deleted % 10 === 0) await new Promise(r => setTimeout(r, 300));
    }

    return Response.json({
      success: true,
      total_checked: questions.length,
      duplicates_removed: deleted,
    });
  } catch (error) {
    console.error('deduplicateQuestions error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});