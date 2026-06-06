import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Find Social Sciences subject
    const subjects = await base44.asServiceRole.entities.Subject.filter({ name: "Social Sciences" });
    if (!subjects.length) {
      return Response.json({ error: 'Social Sciences subject not found' }, { status: 404 });
    }

    const subjectId = subjects[0].id;

    // Get all topics for Social Sciences
    const topics = await base44.asServiceRole.entities.Topic.filter({ 
      subject_id: subjectId, 
      is_active: true 
    });

    if (!topics.length) {
      return Response.json({ error: 'No topics found for Social Sciences' }, { status: 404 });
    }

    const results = { notesGenerated: 0, questionsGenerated: 0, errors: [] };

    // Delete existing content
    const existingNotes = await base44.asServiceRole.entities.Note.filter({ subject_id: subjectId });
    for (const note of existingNotes) {
      await base44.asServiceRole.entities.Note.delete(note.id);
    }

    const existingQuestions = await base44.asServiceRole.entities.Question.filter({ subject_id: subjectId });
    for (const question of existingQuestions) {
      await base44.asServiceRole.entities.Question.delete(question.id);
    }

    // Generate content for each topic
    for (const topic of topics) {
      try {
        // Generate notes
        const notesRes = await base44.functions.invoke('generateNotes', { topicId: topic.id });
        if (notesRes.data?.success) results.notesGenerated++;

        // Generate questions
        const questionsRes = await base44.functions.invoke('generateQuestions', { topicId: topic.id });
        if (questionsRes.data?.success) results.questionsGenerated++;
      } catch (error) {
        results.errors.push({ topicId: topic.id, error: error.message });
      }
    }

    return Response.json({ 
      success: true, 
      message: `Regenerated Social Sciences content for ${topics.length} topics`,
      results 
    });
  } catch (error) {
    console.error("Regeneration error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});