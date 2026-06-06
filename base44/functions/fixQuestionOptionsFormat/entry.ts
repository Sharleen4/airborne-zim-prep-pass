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

    let fixed = 0, errors = [];

    for (const q of allQuestions) {
      const opts = q.options;
      
      if (!opts || !Array.isArray(opts) || opts.length < 2) {
        continue;
      }

      // Ensure all options have proper label and text format
      const fixedOptions = [];
      const labels = ["A", "B", "C", "D"];
      
      for (let i = 0; i < opts.length && i < 4; i++) {
        const opt = opts[i];
        let label = opt.label || labels[i];
        let text = "";
        
        // Extract text from various formats
        if (typeof opt === "string") {
          text = opt;
        } else if (opt.text) {
          text = String(opt.text);
        } else if (opt.content) {
          text = String(opt.content);
        }
        
        if (text && text.trim()) {
          fixedOptions.push({
            label: String(label),
            text: String(text).trim()
          });
        }
      }

      // Only update if we have at least 2 valid options
      if (fixedOptions.length >= 2 && fixedOptions.length !== opts.length) {
        await base44.asServiceRole.entities.Question.update(q.id, {
          options: fixedOptions
        });
        fixed++;
      }
    }

    return Response.json({
      success: true,
      message: `Fixed question options format`,
      stats: {
        totalChecked: allQuestions.length,
        fixed
      }
    });
  } catch (error) {
    console.error("Fix error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});