import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const fields = ['overview', 'key_definitions', 'key_concepts', 'zimbabwe_examples', 'important_facts', 'common_mistakes', 'summary', 'exam_tips'];

  const notes = await base44.asServiceRole.entities.Note.list('-created_date', 1000);

  let updated = 0;

  for (const note of notes) {
    const patch = {};
    let changed = false;

    for (const field of fields) {
      if (note[field] && typeof note[field] === 'string') {
        const newVal = note[field]
          .replace(/\bstudy notes\b/gi, 'revision notes')
          .replace(/\bStudy Notes\b/g, 'Revision Notes')
          .replace(/\bSTUDY NOTES\b/g, 'REVISION NOTES');
        if (newVal !== note[field]) {
          patch[field] = newVal;
          changed = true;
        }
      }
    }

    if (changed) {
      await base44.asServiceRole.entities.Note.update(note.id, patch);
      updated++;
    }
  }

  return Response.json({ success: true, total: notes.length, updated });
});