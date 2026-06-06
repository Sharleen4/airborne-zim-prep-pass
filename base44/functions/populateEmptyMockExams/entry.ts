import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all mock exams
    const allExams = await base44.asServiceRole.entities.MockExam.filter(
      { is_active: true },
      "-created_date",
      500
    );

    let populated = 0;
    const results = [];

    for (const exam of allExams) {
      // Check if exam has no questions
      const hasQuestions = exam.question_ids && exam.question_ids.length > 0;
      
      if (!hasQuestions) {
        // Get questions from the same subject
        const subjectQuestions = await base44.asServiceRole.entities.Question.filter(
          { subject_id: exam.subject_id, is_active: true, question_type: "mcq" },
          "-created_date",
          200
        );

        if (subjectQuestions.length > 0) {
          // Select questions up to total_marks (or default to 20)
          const count = exam.total_marks || 20;
          const selectedQuestions = subjectQuestions.slice(0, Math.min(count, subjectQuestions.length));
          const questionIds = selectedQuestions.map(q => q.id);

          // Update exam with questions
          await base44.asServiceRole.entities.MockExam.update(exam.id, {
            question_ids: questionIds
          });

          populated++;
          results.push({
            examTitle: exam.title,
            questionsAdded: questionIds.length
          });
        }
      }
    }

    return Response.json({
      success: true,
      message: `Populated empty mock exams with questions`,
      stats: {
        totalExams: allExams.length,
        examsPopulated: populated,
        details: results
      }
    });
  } catch (error) {
    console.error("Populate error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});