import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get Physical Education and Arts subject
    const subjects = await base44.asServiceRole.entities.Subject.filter({ name: "Physical Education and Arts" });
    if (!subjects.length) {
      return Response.json({ error: 'Physical Education and Arts subject not found' }, { status: 404 });
    }

    const subjectId = subjects[0].id;

    // Delete all questions for this subject
    const allQuestions = await base44.asServiceRole.entities.Question.filter({ subject_id: subjectId }, "-created_date", 500);
    
    let deleted = 0;
    for (const q of allQuestions) {
      await base44.asServiceRole.entities.Question.delete(q.id);
      deleted++;
    }

    return Response.json({
      success: true,
      message: `Deleted ${deleted} Physical Education and Arts questions`,
      count: deleted
    });
  } catch (error) {
    console.error("Delete error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});