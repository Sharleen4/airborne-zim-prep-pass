import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SUBJECT_ID = "6a00b051eb63a472758be73f";
const GRADE = "Grade 4";

// Skill-specific guidance for the LLM. Each topic gets a tailored prompt
// so the content really matches the skill (e.g. comprehension passages for Comprehension,
// model letters for Functional Writing, etc.)
const SKILL_GUIDES = {
  "Comprehension": `Focus on TEACHING children how to read and understand short stories.
- Include 2 SAMPLE PASSAGES (medium length: 120-180 words each) about relatable Zimbabwean daily life, nature, culture, or fun adventures (e.g. a kombi ride to Mbare, helping grandma make sadza, a visit to Mukuvisi Woodlands, a cheeky monkey at Victoria Falls).
- Use simple sentences mixed with some varied longer sentences. Humorous but educational tone.
- For each passage, show example questions about: main idea, detail recall, vocabulary in context, inference, and personal opinion.
- Teach skimming, scanning, and how to find answers in the passage.`,

  "Composition": `Teach how to write short, fun compositions and informal letters.
- Show structure: introduction, body (2-3 ideas), conclusion.
- Give 2 SAMPLE COMPOSITIONS (80-120 words) on topics like "My Best Friend", "A Day at the Market", "My Pet Goat".
- Show how to write a simple informal letter to a cousin in Bulawayo.
- Use Zimbabwean settings (school, home, village, town).`,

  "Grammar": `Teach the main parts of speech for Grade 4: nouns, pronouns, verbs, adjectives, adverbs, prepositions, conjunctions, articles, and simple tenses (present, past, future).
- Give simple definitions a child can remember.
- Use lots of example sentences with Zimbabwean names (Tendai, Rumbi, Sipho, Nyasha) and places (Harare, Gweru, Masvingo).
- Show common mistakes 8-year-olds make.`,

  "Vocabulary and Word Study": `Teach synonyms, antonyms, homophones, plurals, prefixes, suffixes, and compound words.
- Give clear tables/lists of word pairs (e.g. big/small, happy/sad, hear/here).
- Use Zimbabwean context where possible.
- Include fun memory tricks.`,

  "Summary Writing": `Teach how to make a long story short.
- Show steps: read carefully, underline main points, drop examples, write in your own words.
- Give 2 worked examples: a short passage, the main points, and a finished short summary (about 40-60 words).`,

  "Listening and Speaking": `Teach phonics (short and long vowel sounds), pronunciation, polite language (please, thank you, may I), greetings, and simple dialogues.
- Use Zimbabwean greetings alongside English (Mhoro/Sawubona → Hello).
- Show how to ask and answer simple questions politely.`,

  "Functional Writing": `Teach simple emails, short notes, invitations, thank-you messages, and shopping lists.
- Show the correct format for each (greeting, body, sign-off).
- Give 2 SAMPLE EMAILS / NOTES with Zimbabwean context (inviting a friend to a birthday in Chitungwiza, thanking aunt for a present).`,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden: admin only' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const step = body.step || "notes";

    const topics = await base44.asServiceRole.entities.Topic.filter({ subject_id: SUBJECT_ID });
    if (!topics.length) return Response.json({ error: "No topics found" }, { status: 400 });

    const STYLE_GUIDE = `WRITING STYLE for 8-year-old Grade 4 Zimbabwean learners:
- Length: medium — not too short, not too long.
- Sentences: mostly simple, but mix in some varied longer ones to grow their skills.
- Content: relatable daily life, nature, Zimbabwean culture, a little fantasy and fun.
- Tone: humorous AND educational, narrative style.
- Vocabulary: simple and age-appropriate, but introduce 2-4 new words per section and explain them.
- Use Zimbabwean names (Tendai, Rumbi, Farai, Sipho, Nyasha, Tafadzwa), places (Harare, Bulawayo, Mutare, Masvingo, Chitungwiza, Victoria Falls), and items (sadza, mealie-meal, kombi, mbira, kraal, mango, guava).`;

    // STEP: notes — generate notes for ONE topic
    if (step === "notes") {
      const topicName = body.topic_name;
      const topic = topics.find(t => t.name === topicName);
      if (!topic) return Response.json({ error: `Topic not found: ${topicName}` }, { status: 400 });

      const existing = await base44.asServiceRole.entities.Note.filter({ topic_id: topic.id });
      if (existing.length > 0 && !body.force) {
        return Response.json({ success: true, step, skipped: "exists", topic: topic.name });
      }

      const guide = SKILL_GUIDES[topic.name] || "";

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: "gemini_3_flash",
        prompt: `Create study notes for Grade 4 English (8-year-old Zimbabwean learners) on the topic "${topic.name}".
Learning objectives: ${topic.learning_objectives}

${STYLE_GUIDE}

SKILL-SPECIFIC INSTRUCTIONS:
${guide}

Return JSON:
- overview: 1-2 short, friendly paragraphs introducing the topic
- key_definitions: markdown bullets of key terms with simple definitions
- key_concepts: markdown explanation with sub-headings (##) and many examples. THIS IS THE MAIN TEACHING SECTION — make it rich and detailed, including any sample passages, letters, or dialogues required by the skill instructions above.
- zimbabwe_examples: markdown with concrete Zimbabwean examples and stories
- important_facts: markdown bullets of facts to remember
- common_mistakes: markdown bullets of common Grade 4 mistakes and how to avoid them
- summary: short markdown bullet point summary
- exam_tips: markdown bullets of test-taking tips`,
        response_json_schema: {
          type: "object",
          properties: {
            overview: { type: "string" }, key_definitions: { type: "string" },
            key_concepts: { type: "string" }, zimbabwe_examples: { type: "string" },
            important_facts: { type: "string" }, common_mistakes: { type: "string" },
            summary: { type: "string" }, exam_tips: { type: "string" }
          }
        }
      });

      if (existing.length > 0 && body.force) {
        await base44.asServiceRole.entities.Note.delete(existing[0].id);
      }

      await base44.asServiceRole.entities.Note.create({
        topic_id: topic.id, subject_id: SUBJECT_ID,
        overview: result.overview || "", key_definitions: result.key_definitions || "",
        key_concepts: result.key_concepts || "", zimbabwe_examples: result.zimbabwe_examples || "",
        important_facts: result.important_facts || "", common_mistakes: result.common_mistakes || "",
        summary: result.summary || "", exam_tips: result.exam_tips || "",
        is_active: true, is_ai_generated: true
      });
      return Response.json({ success: true, step, topic: topic.name });
    }

    // STEP: questions — generate 10 MCQs for ONE topic
    if (step === "questions") {
      const topicName = body.topic_name;
      const topic = topics.find(t => t.name === topicName);
      if (!topic) return Response.json({ error: `Topic not found: ${topicName}` }, { status: 400 });

      const existing = await base44.asServiceRole.entities.Question.filter({ topic_id: topic.id });
      if (existing.length >= 10 && !body.force) {
        return Response.json({ success: true, step, skipped: "has_enough", topic: topic.name, count: existing.length });
      }

      const guide = SKILL_GUIDES[topic.name] || "";
      const isComprehension = topic.name === "Comprehension";

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: "gemini_3_flash",
        prompt: `Generate 10 multiple-choice questions for Grade 4 English (8-year-old Zimbabwean learners) on "${topic.name}".
Learning objectives: ${topic.learning_objectives}

${STYLE_GUIDE}

SKILL-SPECIFIC INSTRUCTIONS:
${guide}

${isComprehension ? `IMPORTANT: For comprehension, create 2 short passages (~120-150 words each). Attach 5 questions to passage 1 and 5 questions to passage 2 using the "comprehension_passage" field. Same passage repeats on its 5 questions.` : ""}

Rules:
- Simple English, ages 8.
- 4 options A/B/C/D for each question.
- Spread correct answers A/B/C/D fairly evenly.
- 1-2 sentence explanation per question.
- Difficulty: mostly "Easy", some "Standard".
- Make at least 2 questions slightly humorous to keep kids engaged.`,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question_text: { type: "string" },
                  comprehension_passage: { type: "string" },
                  options: { type: "array", items: { type: "object", properties: { label: { type: "string" }, text: { type: "string" } } } },
                  correct_answer: { type: "string" },
                  explanation: { type: "string" },
                  difficulty: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Optional clean before insert
      if (existing.length > 0 && body.force) {
        for (const q of existing) await base44.asServiceRole.entities.Question.delete(q.id);
      }

      const qs = [];
      for (const q of (result?.questions || [])) {
        if (!q.question_text || !q.correct_answer) continue;
        qs.push({
          topic_id: topic.id, subject_id: SUBJECT_ID,
          question_text: q.question_text,
          comprehension_passage: q.comprehension_passage || "",
          question_type: isComprehension ? "comprehension" : "mcq",
          options: q.options || [],
          correct_answer: q.correct_answer,
          explanation: q.explanation || "",
          difficulty: q.difficulty === "Easy" ? "Easy" : "Standard",
          marks: 1, is_active: true
        });
      }
      if (qs.length) await base44.asServiceRole.entities.Question.bulkCreate(qs);
      return Response.json({ success: true, step, topic: topic.name, created: qs.length });
    }

    return Response.json({ error: `Unknown step: ${step}. Use "notes" or "questions" with topic_name.` }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});