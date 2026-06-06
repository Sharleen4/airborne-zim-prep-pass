import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  const { questionId } = await req.json();
  if (!questionId) {
    return Response.json({ error: 'questionId required' }, { status: 400 });
  }

  const question = await base44.asServiceRole.entities.Question.filter({ id: questionId });
  if (!question || question.length === 0) {
    return Response.json({ error: 'Question not found' }, { status: 404 });
  }

  const q = question[0];

  // Build question context
  const optionsText = (q.options || [])
    .map(o => `${o.label}. ${o.text}`)
    .join('\n');

  const prompt = `Analyze this educational question for a Grade 7 Zimbabwe ZIMSEC exam:

Question: ${q.question_text}
${q.comprehension_passage ? `Passage: ${q.comprehension_passage}` : ''}
Options:
${optionsText}
Correct Answer: ${q.correct_answer}
Current Explanation: ${q.explanation || '(none)'}
Current Bloom Level: ${q.bloom_level || '(not set)'}
Difficulty: ${q.difficulty || 'Standard'}

Provide a structured analysis with:

1. **Bloom's Taxonomy Assessment**: What cognitive level does this question target? (Remember, Understand, Apply, Analyse, Evaluate, Create) Suggest if it could be improved to target a higher or more appropriate level.

2. **Explanation Quality**: Is there an explanation? If missing, generate a clear 1-2 sentence explanation. If present, rate its clarity. Suggest improvements if needed.

3. **Ambiguity Check**: Are there any words that could be misinterpreted? Are all options clearly different? Would students understand what the question is asking? Flag any potential confusion.

4. **Overall Quality Score**: Rate 1-5 and summarize key strengths and improvement areas.

Return ONLY valid JSON (no markdown, no code blocks):
{
  "blooms_assessment": {
    "current_level": "string",
    "suggested_level": "string",
    "reasoning": "string",
    "suggestion": "string"
  },
  "explanation": {
    "has_explanation": boolean,
    "quality": "string",
    "generated_explanation": "string or null",
    "improvement_suggestion": "string"
  },
  "ambiguity": {
    "is_ambiguous": boolean,
    "issues": ["string"],
    "clarity_score": number
  },
  "overall_quality": {
    "score": number,
    "strengths": ["string"],
    "improvements": ["string"]
  }
}`;

  const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    model: 'gemini_3_flash',
    response_json_schema: {
      type: 'object',
      properties: {
        blooms_assessment: {
          type: 'object',
          properties: {
            current_level: { type: 'string' },
            suggested_level: { type: 'string' },
            reasoning: { type: 'string' },
            suggestion: { type: 'string' }
          }
        },
        explanation: {
          type: 'object',
          properties: {
            has_explanation: { type: 'boolean' },
            quality: { type: 'string' },
            generated_explanation: { type: ['string', 'null'] },
            improvement_suggestion: { type: 'string' }
          }
        },
        ambiguity: {
          type: 'object',
          properties: {
            is_ambiguous: { type: 'boolean' },
            issues: { type: 'array', items: { type: 'string' } },
            clarity_score: { type: 'number' }
          }
        },
        overall_quality: {
          type: 'object',
          properties: {
            score: { type: 'number' },
            strengths: { type: 'array', items: { type: 'string' } },
            improvements: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    }
  });

  return Response.json({
    question_id: questionId,
    question_text: q.question_text,
    analysis
  });
});