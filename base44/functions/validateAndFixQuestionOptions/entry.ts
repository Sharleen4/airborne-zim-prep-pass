import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all MCQ questions
    const allQuestions = await base44.asServiceRole.entities.Question.filter(
      { question_type: "mcq", is_active: true },
      "-created_date",
      500
    );

    let fixed = 0, invalid = [];

    for (const q of allQuestions) {
      // Check if options is valid
      const opts = q.options;
      
      if (!opts || !Array.isArray(opts) || opts.length === 0) {
        invalid.push({ id: q.id, text: q.question_text, issue: "No options" });
        continue;
      }

      // Check if options have label and text properties
      const isValid = opts.every(opt => opt.label && opt.text);
      
      if (!isValid) {
        invalid.push({ id: q.id, text: q.question_text, issue: "Malformed options" });
        
        // Try to fix by reconstructing options
        const labels = ["A", "B", "C", "D"];
        const fixedOptions = opts.map((opt, i) => ({
          label: opt.label || labels[i] || String.fromCharCode(65 + i),
          text: opt.text || opt || ""
        })).filter(opt => opt.text);
        
        if (fixedOptions.length >= 2) {
          await base44.asServiceRole.entities.Question.update(q.id, {
            options: fixedOptions
          });
          fixed++;
        }
      }
    }

    return Response.json({
      success: true,
      message: `Validated questions`,
      stats: {
        totalChecked: allQuestions.length,
        fixed,
        invalid: invalid.length > 0 ? invalid : null
      }
    });
  } catch (error) {
    console.error("Validation error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});