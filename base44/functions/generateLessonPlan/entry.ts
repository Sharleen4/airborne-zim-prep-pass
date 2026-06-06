import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Subject-specific section blueprints (Heritage-Based Curriculum)
const SUBJECT_TEMPLATES = {
  mathematics: {
    sections: [
      "lesson_information", "learning_objectives", "prior_knowledge_activity",
      "introduction", "concept_explanation", "worked_example_1", "worked_example_2",
      "guided_practice", "group_activity", "class_exercise",
      "assessment_questions", "summary", "homework"
    ],
    visuals: ["Number lines", "Fraction models", "Shapes", "Measurement diagrams", "Graphs", "Geometry illustrations"],
    rules: "Use step-by-step explanations, worked examples with full calculations, problem-solving activities, individual practice, and age-appropriate language. Include visual aids suggestions."
  },
  english: {
    sections: [
      "lesson_information", "learning_objectives", "warm_up_activity",
      "introduction", "reading_activity", "vocabulary_development",
      "guided_discussion", "language_practice", "writing_activity",
      "group_work", "assessment_activity", "summary", "homework"
    ],
    visuals: ["Story illustrations", "Character illustrations", "Grammar charts", "Vocabulary flashcards", "Reading passages"],
    rules: "Promote reading, speaking, listening and writing. Build vocabulary, include comprehension activities, and maximise learner participation."
  },
  science: {
    sections: [
      "lesson_information", "learning_objectives", "prior_knowledge_activity",
      "introduction", "concept_explanation", "demonstration_activity",
      "observation_activity", "investigation_activity", "group_discussion",
      "assessment", "conclusion", "homework"
    ],
    visuals: ["Scientific diagrams", "Plant diagrams", "Animal diagrams", "Water cycle diagrams", "Human body diagrams", "Weather diagrams"],
    rules: "Promote observation, inquiry, experimentation and critical thinking. Include practical demonstrations and scientific vocabulary."
  },
  agriculture: {
    sections: [
      "lesson_information", "learning_objectives", "introduction",
      "demonstration", "practical_activity", "group_work",
      "observation_activity", "reflection_activity", "assessment",
      "conclusion", "homework"
    ],
    visuals: ["Crop illustrations", "Farming techniques", "Livestock diagrams", "Agricultural tools", "Garden layouts"],
    rules: "Emphasize practical, field-based learning with real-life examples and project-based tasks. Encourage observation."
  },
  social_science: {
    sections: [
      "lesson_information", "learning_objectives", "introduction",
      "content_exploration", "guided_discussion", "group_research_activity",
      "presentation_activity", "reflection_activity", "assessment",
      "conclusion", "homework"
    ],
    visuals: ["Maps", "Historical illustrations", "Community diagrams", "Environmental diagrams", "Cultural images"],
    rules: "Promote discussion, collaboration, research, critical thinking and communication skills."
  },
  heritage_studies: {
    sections: [
      "lesson_information", "learning_objectives", "introduction",
      "storytelling_activity", "discussion_activity", "cultural_exploration",
      "group_work", "reflection", "assessment", "conclusion", "homework"
    ],
    visuals: ["Cultural artifacts", "Traditional practices", "National symbols", "Historical events"],
    rules: "Promote cultural understanding, values education, citizenship and heritage appreciation."
  }
};

// Numeracy skills mapping — used to make Mathematics lessons explicit about
// the underlying skills a topic actually exercises. Lets Zama AI later track
// progress by skill (Addition, Multiplication, etc.) instead of by topic only.
const NUMERACY_TOPIC_SKILLS = [
  { match: ["fraction"], skills: ["Addition", "Subtraction", "Multiplication", "Division"] },
  { match: ["money", "currency"], skills: ["Addition", "Subtraction", "Multiplication", "Division"] },
  { match: ["time"], skills: ["Addition", "Subtraction"] },
  { match: ["area"], skills: ["Multiplication"] },
  { match: ["perimeter"], skills: ["Addition"] },
  { match: ["volume", "capacity"], skills: ["Multiplication", "Division"] },
  { match: ["percentage", "percent"], skills: ["Fractions", "Multiplication", "Division"] },
  { match: ["graph", "chart", "pictograph", "bar graph"], skills: ["Data Interpretation"] },
  { match: ["rate", "speed"], skills: ["Multiplication", "Division"] },
];

// Core numeracy skills taught across Grades 4–7 (all ticked in the user's table).
const CORE_NUMERACY_SKILLS = [
  "Addition", "Subtraction", "Multiplication", "Division",
  "Estimation", "Comparison", "Ordering", "Measurement",
  "Conversion", "Fractions", "Data Interpretation", "Problem Solving",
];

function detectNumeracySkills(topic, subtopic) {
  const hay = `${topic || ""} ${subtopic || ""}`.toLowerCase();
  const found = new Set();
  for (const row of NUMERACY_TOPIC_SKILLS) {
    if (row.match.some(k => hay.includes(k))) row.skills.forEach(s => found.add(s));
  }
  return [...found];
}

function resolveTemplate(subject) {
  const key = String(subject || "").toLowerCase().trim();
  if (key.includes("math")) return { key: "mathematics", ...SUBJECT_TEMPLATES.mathematics };
  if (key.includes("english") || key.includes("language")) return { key: "english", ...SUBJECT_TEMPLATES.english };
  if (key.includes("science") && !key.includes("social")) return { key: "science", ...SUBJECT_TEMPLATES.science };
  if (key.includes("agric")) return { key: "agriculture", ...SUBJECT_TEMPLATES.agriculture };
  if (key.includes("heritage")) return { key: "heritage_studies", ...SUBJECT_TEMPLATES.heritage_studies };
  if (key.includes("social") || key.includes("history") || key.includes("geography") || key.includes("civic")) {
    return { key: "social_science", ...SUBJECT_TEMPLATES.social_science };
  }
  // Default to social science structure for unknown subjects
  return { key: "social_science", ...SUBJECT_TEMPLATES.social_science };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!["teacher", "admin", "school_admin"].includes(user.role)) {
      return Response.json({ error: 'Forbidden — teachers/admins only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      curriculum_topic_id,
      duration_minutes = 35,
      target_objective = "",
      part_number = 1,
      total_parts = 1,
      numeracy_skills: requestedSkills = [],
    } = body;
    if (!curriculum_topic_id) {
      return Response.json({ error: 'curriculum_topic_id is required' }, { status: 400 });
    }
    const partN = Math.max(1, Math.min(10, Number(part_number) || 1));
    const totalN = Math.max(1, Math.min(10, Number(total_parts) || 1));

    const topic = await base44.asServiceRole.entities.CurriculumTopic.get(curriculum_topic_id).catch(() => null);
    if (!topic) return Response.json({ error: 'Curriculum topic not found' }, { status: 404 });

    // Curriculum is the SOURCE OF TRUTH — refuse if objectives are missing
    if (!topic.learning_objectives?.length) {
      return Response.json({
        error: 'This curriculum topic has no learning objectives. Add objectives before generating a lesson.'
      }, { status: 400 });
    }

    // Increment view count (best-effort)
    base44.asServiceRole.entities.CurriculumTopic.update(curriculum_topic_id, {
      view_count: (topic.view_count || 0) + 1,
    }).catch(() => {});

    const template = resolveTemplate(topic.subject);

    // ── Pull approved Zama AI notes that match this curriculum topic ─────────
    // Match by subject + grade + topic-name similarity. We only use ACTIVE notes
    // (is_active !== false) and either approved or non-PDF (no review_status set).
    let approvedNotes = [];
    try {
      const [allSubjects, allTopics] = await Promise.all([
        base44.asServiceRole.entities.Subject.list("-created_date", 500),
        base44.asServiceRole.entities.Topic.list("-created_date", 2000),
      ]);
      const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
      const subjMatches = allSubjects.filter(s =>
        norm(s.name).includes(norm(topic.subject)) || norm(topic.subject).includes(norm(s.name))
      );
      const subjectIds = new Set(subjMatches.filter(s => !s.grade || s.grade === topic.grade).map(s => s.id));
      const topicTokens = norm(topic.topic).split(" ").filter(Boolean);
      const matchedTopics = allTopics.filter(t => {
        if (!subjectIds.has(t.subject_id)) return false;
        const tn = norm(t.name);
        if (tn === norm(topic.topic)) return true;
        return topicTokens.some(tok => tok.length > 3 && tn.includes(tok));
      });
      if (matchedTopics.length) {
        const noteLists = await Promise.all(matchedTopics.slice(0, 6).map(t =>
          base44.asServiceRole.entities.Note.filter({ topic_id: t.id }).catch(() => [])
        ));
        approvedNotes = noteLists.flat().filter(n =>
          n.is_active !== false && (n.review_status ? n.review_status === "approved" : true)
        ).slice(0, 4);
      }
    } catch {
      // Notes are supplementary — never block lesson generation if lookup fails.
    }

    const ctx = [];
    ctx.push(`Subject: ${topic.subject}`);
    ctx.push(`Grade: ${topic.grade}`);
    ctx.push(`Topic: ${topic.topic}`);
    if (topic.subtopic) ctx.push(`Subtopic: ${topic.subtopic}`);
    if (topic.curriculum_code) ctx.push(`Curriculum Code: ${topic.curriculum_code}`);
    if (topic.term) ctx.push(`Term: ${topic.term}`);
    if (topic.week) ctx.push(`Week: ${topic.week}`);
    // If the teacher chose a specific objective to focus on, narrow the lesson to it
    // but keep the others as supporting context so the lesson still respects the topic.
    const trimmedTarget = (target_objective || "").trim();
    if (trimmedTarget) {
      ctx.push(
`SINGLE-OBJECTIVE LESSON — STRICT:
This lesson covers ONE learning objective ONLY:
- ${trimmedTarget}

MANDATORY RULES:
- The "learning_objectives" field in your output MUST contain EXACTLY this one objective and nothing else.
- The lesson_title MUST clearly reflect this single objective (not the broader topic).
- Do NOT teach, mention, or include content for the other objectives in this topic — they will be taught in separate lessons.
- All activities, examples, definitions, assessment and homework MUST focus only on this one objective.`
      );
    } else {
      ctx.push(`Learning Objectives:\n- ${topic.learning_objectives.join("\n- ")}`);
    }

    // Multi-part lesson series — teacher wants to split this topic/objective across
    // several sequential lessons. We instruct the AI to cover ONLY the slice that
    // belongs to this part so the series flows naturally without repetition.
    if (totalN > 1) {
      const focusLabel = trimmedTarget ? `the focus objective above` : `this topic`;
      ctx.push(
        `LESSON SERIES — MULTI-PART:
This is Part ${partN} of ${totalN} in a lesson series covering ${focusLabel}.
- Split the content into ${totalN} sequential lessons of roughly equal depth.
- In THIS lesson plan, cover ONLY the slice of content that belongs to Part ${partN}.
- Part 1 should introduce foundational ideas; later parts build on earlier parts and go deeper or apply the knowledge.
- Do NOT try to cover the whole topic in this single lesson — assume the other parts will be taught separately.
- Begin with a short recap of the previous part (only if Part ${partN} > 1) and end with a brief teaser for the next part (only if Part ${partN} < ${totalN}).
- The lesson_title MUST clearly include "(Part ${partN} of ${totalN})" at the end.`
      );
    }
    // Mathematics-only: surface the underlying numeracy skills this topic exercises
    // so the lesson plan teaches the SKILL, not just the topic. This also enables
    // skill-level progress tracking downstream (Addition: 85%, Division: 42%, etc.).
    const isMaths = template.key === "mathematics";
    // Teacher's chosen skills (if any) take priority over auto-detected ones.
    const teacherSkills = Array.isArray(requestedSkills)
      ? requestedSkills.filter(s => CORE_NUMERACY_SKILLS.includes(s))
      : [];
    const detectedSkills = isMaths ? detectNumeracySkills(topic.topic, topic.subtopic) : [];
    const focusSkills = teacherSkills.length ? teacherSkills : detectedSkills;
    if (isMaths) {
      ctx.push(
`NUMERACY SKILLS FRAMEWORK (Mathematics — Grades 4–7):
The 12 core numeracy skills taught across Grades 4–7 are: ${CORE_NUMERACY_SKILLS.join(", ")}.
${teacherSkills.length
  ? `THE TEACHER HAS EXPLICITLY CHOSEN these underlying skills as the focus of this lesson: ${teacherSkills.join(", ")}. The lesson MUST be built around practising these skill(s) using the topic "${topic.topic}${topic.subtopic ? " — " + topic.subtopic : ""}" as the context.`
  : (detectedSkills.length
    ? `This topic ("${topic.topic}${topic.subtopic ? " — " + topic.subtopic : ""}") primarily exercises these underlying skills: ${detectedSkills.join(", ")}.`
    : `Identify which of the 12 core skills this topic exercises and list them in "numeracy_skills".`)}

MANDATORY:
- The "numeracy_skills" field MUST list the underlying skills this lesson actually practises (use the exact skill names from the list above).${teacherSkills.length ? ` It MUST include the teacher-chosen skills: ${teacherSkills.join(", ")}.` : ""}
- The lesson_title, worked examples, guided practice, class exercise and homework MUST visibly practise ${focusSkills.length ? focusSkills.join(" and ") : "the chosen numeracy skill(s)"} (e.g. if Division is chosen, use division calculations throughout — sharing 24 oranges between 6 learners, splitting \$60 between 4 friends, etc.).
- In "skills" and "teacher_activities", make the underlying numeracy skills EXPLICIT.
- The lesson should strengthen these underlying skills, not just the topic name.

WORKED EXAMPLES (MATHEMATICS — MANDATORY):
- You MUST populate the "worked_examples" array with EXACTLY 3 fully worked examples of increasing difficulty (Easy → Standard → Challenge).
- Every worked example MUST include: title, problem (in plain words with a Zimbabwean context), and steps — an array of 3–6 numbered, action-first steps showing the ACTUAL arithmetic (e.g. "Step 1: Write 24 ÷ 6. Step 2: Think — how many groups of 6 fit in 24? Step 3: 6 × 4 = 24, so the answer is 4.").
- Every worked example MUST end with a clear "answer" field that states the final result with units where relevant (e.g. "4 oranges each", "\$15", "12 cm²").
- Use real Zimbabwean contexts (sadza, mealies, ecocash, bond notes, kombi fare, soccer balls, cattle, school fees, etc.) — never abstract numbers alone.

CLASS EXERCISE (MATHEMATICS — MANDATORY):
- You MUST populate the "class_exercise" object with 4–6 practice problems for learners to solve in class after the worked examples.
- The first problem MUST be Easy, the middle problems Standard, and the last problem a Challenge — mirroring the worked-example difficulty ladder.
- Each problem MUST have: number (1, 2, 3...), problem (plain-language Zimbabwean scenario), difficulty ("Easy" | "Standard" | "Challenge"), and answer (final answer only, used by the teacher to mark).
- Also include a short "instructions" string telling the teacher how to run the exercise (e.g. "Learners work individually for 8 minutes, then swap books with a partner to mark.").`
      );
    }
    if (topic.suggested_activities?.length) ctx.push(`Suggested Activities:\n- ${topic.suggested_activities.join("\n- ")}`);
    if (topic.heritage_based_competencies?.length) ctx.push(`Heritage-Based Competencies:\n- ${topic.heritage_based_competencies.join("\n- ")}`);
    if (topic.assessment_suggestions?.length) ctx.push(`Assessment Suggestions:\n- ${topic.assessment_suggestions.join("\n- ")}`);

    // Inject approved notes (Zama AI's existing content library) as the second source of truth
    if (approvedNotes.length) {
      const noteBlocks = approvedNotes.map((n, i) => {
        const parts = [`--- APPROVED NOTE ${i + 1} ---`];
        if (n.overview) parts.push(`Overview: ${n.overview}`);
        if (n.key_definitions) parts.push(`Key Definitions: ${n.key_definitions}`);
        if (n.key_concepts) parts.push(`Key Concepts: ${n.key_concepts}`);
        if (n.zimbabwe_examples) parts.push(`Zimbabwe Examples: ${n.zimbabwe_examples}`);
        if (n.important_facts) parts.push(`Important Facts: ${n.important_facts}`);
        if (n.common_mistakes) parts.push(`Common Mistakes: ${n.common_mistakes}`);
        if (n.summary) parts.push(`Summary: ${n.summary}`);
        if (n.exam_tips) parts.push(`Exam Tips: ${n.exam_tips}`);
        return parts.join("\n");
      });
      ctx.push(`\nAPPROVED ZAMA AI NOTES (use these as factual content — do not contradict them):\n${noteBlocks.join("\n\n")}`);
    }

    // Age band per grade — drives vocabulary, sentence length, and analogy style
    const AGE_BANDS = {
      "Grade 4": { ages: "8–9 year olds", maxWords: "8–10 words per sentence", reading: "very short, simple sentences. Use only common everyday words a Grade 4 learner already uses at home or on the playground." },
      "Grade 5": { ages: "9–10 year olds", maxWords: "10–12 words per sentence", reading: "short, clear sentences. Introduce one new word at a time and always explain it with a familiar example." },
      "Grade 6": { ages: "10–11 year olds", maxWords: "12–15 words per sentence", reading: "clear, slightly longer sentences. Learners can handle 1–2 new ideas per paragraph if each is explained with an analogy." },
      "Grade 7": { ages: "11–13 year olds", maxWords: "15–18 words per sentence", reading: "clear paragraphs. Learners can follow simple reasoning chains but still need real-life analogies for abstract ideas." },
    };
    const ageBand = AGE_BANDS[topic.grade] || AGE_BANDS["Grade 5"];

    const prompt = `You are a Zimbabwean primary school lesson planning assistant for Zama AI Primary.
Generate a complete Heritage-Based Curriculum lesson plan using ONLY the curriculum information below.

STRICT RULES:
- The curriculum topic is your PRIMARY source of truth.
- The "Approved Zama AI Notes" (if provided) are your SECONDARY source — use their facts, definitions, examples and Zimbabwean context. Do not contradict them.
- Stay strictly within the specified grade level and topic.
- Do NOT introduce concepts outside the listed learning objectives.
- Use Zimbabwean examples (local names, places, currency, culture).
- Apply Heritage-Based Curriculum principles: Knowledge, Skills, Values, Competencies.

AGE-APPROPRIATE LANGUAGE — VERY IMPORTANT:
You are writing for ${topic.grade} learners (${ageBand.ages}).
- Use ${ageBand.reading}
- Keep sentences to about ${ageBand.maxWords}.
- AVOID jargon, technical terms and adult vocabulary. If a technical word MUST be used (e.g. "firewall", "ecosystem", "fraction", "democracy"), you MUST immediately follow it with a simple everyday analogy a child of this age will picture instantly.
  · Example for Grade 5: "A firewall is like a wall or a gate around your yard at home — it blocks strangers from coming in and only lets in people you trust."
  · Example for Grade 4: "A fraction means a piece of something whole. Like when you share one orange between two friends, each friend gets half — that half is a fraction."
  · Example for Grade 6: "An ecosystem is like a village where plants, animals, water and soil all live and depend on each other — just like a Zimbabwean village where farmers, cattle, the river and the mealie field all need each other."
- Use things the learner already knows: home, family, school, playground, food (sadza, mealies, oranges), sports (soccer, netball), money (bond notes, ecocash), animals they see (goats, chickens, cattle), and local places.
- Replace every abstract word with a picture-in-the-head explanation.

SUBJECT: ${topic.subject} (template = ${template.key})
SUBJECT-SPECIFIC RULES: ${template.rules}

CURRICULUM CONTEXT:
${ctx.join("\n")}

LESSON DURATION: ${duration_minutes} minutes

IMPORTANT — write for an inexperienced teacher:
- Many users are student teachers, teachers on attachment, or first-time teachers. Write the lesson so even someone new to the classroom can deliver it confidently.
- The "key_definitions" section MUST list 5–10 important vocabulary terms from this topic. For EACH term provide: (1) a simple definition in everyday words a ${ageBand.ages.split(" ")[0]} year old child would understand, AND (2) a relatable Zimbabwean analogy or example (compare it to something the child already knows — e.g. firewall = a wall around the school yard; password = the secret knock to enter your friend's bedroom).
- The "teacher_guidance" section MUST be practical and concrete — tell the teacher exactly what to say (in simple words), what to draw on the board, what mistakes to expect, and how to check understanding. Suggested phrases the teacher will say to learners must already be in child-friendly language.
- Step-by-step delivery should read like a recipe: short, numbered, action-first, in simple words.
- "common_mistakes" must describe mistakes in plain words and show how to gently re-explain using an everyday picture.

TEACHING NOTES — MANDATORY (this is the biggest section of the lesson):
- The "teaching_notes" object MUST give the teacher DEEP, SUBSTANTIVE content notes about the topic — the kind of background reading a teacher needs to confidently explain a content-rich topic like the water cycle, natural disasters, ecosystems, the digestive system, the rise of the Mutapa state, etc.
- "overview" (3–5 sentences): a clear, factual overview of what this topic actually IS, in plain language. Set the scene.
- "background_content" — an array of 4–8 expanded teaching notes. Each item has a "heading" (e.g. "The Stages of the Water Cycle", "Types of Disasters in Zimbabwe", "How Floods Form") and "explanation" (a thorough 3–6 sentence explanation written in child-friendly English but with all the real facts the teacher needs to teach the concept correctly). Use Zimbabwean context wherever it fits (Cyclone Idai, Lake Kariba, the Zambezi River, droughts in Matabeleland, etc.).
- "key_facts" — 5–8 short factual statements the teacher can confidently state to the class (e.g. "Water that evaporates from the ocean becomes invisible water vapour in the air.", "Cyclone Idai hit eastern Zimbabwe in March 2019 and caused major flooding in Chimanimani.").
- "real_world_examples" — 3–5 Zimbabwean real-world examples that bring the topic to life (e.g. for the water cycle: rain filling the Save river; clothes drying on a line in Bulawayo sun; mist on the Eastern Highlands at dawn).
- "explain_to_children" — 3–5 short, ready-to-deliver mini-explanations the teacher can read aloud almost verbatim, each written in very simple words a ${ageBand.ages.split(" ")[0]}-year-old will grasp instantly. Use everyday pictures (a kettle, a puddle, a tin roof in the rain).
- "extension_knowledge" — 2–4 short notes for the teacher's own background (slightly more advanced facts they should know but not necessarily teach — e.g. "Condensation happens when warm air meets cooler air high in the sky and the water vapour turns back into tiny droplets — that is what forms clouds.").
- The teaching notes MUST be factually correct and substantive — never vague filler. They are the teacher's content reference for the lesson.

Return a JSON object matching the schema. Keep prose sections SHORT (2–3 sentences) and list sections to 3–4 items — the lesson must be substantive but concise so the teacher can read it quickly. Three homework tiers (easy, medium, challenge) are mandatory and must use age-appropriate language. Suggested teaching images must be drawn from this list when applicable: ${template.visuals.join(", ")}.`;

    // Build the schema dynamically — common fields + the subject-specific sections
    // We deliberately keep descriptions SHORT so the LLM doesn't emit verbose output
    // (which previously pushed us past the ~30s gateway timeout → 502 errors).
    const lessonSections = {};
    for (const s of template.sections) {
      if (s === "lesson_information" || s === "learning_objectives") continue;
      // Mathematics: worked examples and class exercise are STRUCTURED objects,
      // not free-text strings, so the teacher always gets steps + answers.
      if (isMaths && (s === "worked_example_1" || s === "worked_example_2")) continue;
      if (isMaths && s === "class_exercise") continue;
      lessonSections[s] = { type: "string" };
    }

    // Mathematics-only structured sections
    const mathsSections = isMaths ? {
      worked_examples: {
        type: "array",
        description: "Mathematics only: 3 fully worked examples (Easy, Standard, Challenge) with step-by-step calculations.",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            difficulty: { type: "string", enum: ["Easy", "Standard", "Challenge"] },
            problem: { type: "string", description: "Plain-language problem statement with a Zimbabwean context." },
            steps: {
              type: "array",
              items: { type: "string" },
              description: "3–6 numbered, action-first steps showing the actual arithmetic (e.g. 'Step 1: Write 24 ÷ 6...')."
            },
            answer: { type: "string", description: "Final answer with units (e.g. '4 oranges each', '\$15', '12 cm²')." }
          },
          required: ["title", "difficulty", "problem", "steps", "answer"]
        }
      },
      class_exercise: {
        type: "object",
        description: "Mathematics only: scaffolded in-class practice the teacher runs immediately after the worked examples.",
        properties: {
          instructions: { type: "string", description: "Short note telling the teacher how to run the exercise." },
          problems: {
            type: "array",
            description: "4–6 problems of increasing difficulty (Easy → Standard → Challenge).",
            items: {
              type: "object",
              properties: {
                number: { type: "number" },
                problem: { type: "string" },
                difficulty: { type: "string", enum: ["Easy", "Standard", "Challenge"] },
                answer: { type: "string", description: "Final answer only — used by the teacher to mark." }
              },
              required: ["number", "problem", "difficulty", "answer"]
            }
          }
        },
        required: ["instructions", "problems"]
      }
    } : {};

    const schema = {
      type: "object",
      properties: {
        // Universal block
        lesson_title: { type: "string" },
        duration: { type: "string" },
        learning_objectives: { type: "array", items: { type: "string" } },
        competencies: { type: "array", items: { type: "string" } },
        knowledge: { type: "array", items: { type: "string" }, description: "Knowledge learners will gain" },
        skills: { type: "array", items: { type: "string" }, description: "Skills learners will practise" },
        numeracy_skills: { type: "array", items: { type: "string" }, description: "Mathematics only: underlying numeracy skills this lesson exercises (e.g. Addition, Division, Estimation)." },
        values: { type: "array", items: { type: "string" }, description: "Heritage-Based values promoted" },
        // NEW — Definitions of key terms so an inexperienced teacher can confidently explain vocabulary
        key_definitions: {
          type: "array",
          description: "5–10 key terms learners must understand, each with a simple, age-appropriate definition and a short Zimbabwean example.",
          items: {
            type: "object",
            properties: {
              term: { type: "string" },
              definition: { type: "string", description: "Simple definition in plain English (1–2 sentences) suitable for the grade level." },
              example: { type: "string", description: "Short Zimbabwean example sentence or scenario showing the term in context." }
            },
            required: ["term", "definition"]
          }
        },
        resources_needed: { type: "array", items: { type: "string" } },
        teacher_activities: { type: "array", items: { type: "string" } },
        learner_activities: { type: "array", items: { type: "string" } },
        assessment_strategy: { type: "string" },
        // NEW — Substantive teaching notes / background content so the teacher can
        // deeply understand topics like the water cycle, disasters, ecosystems, etc.
        teaching_notes: {
          type: "object",
          description: "Deep, factual teaching notes about the topic — the teacher's content reference for the lesson. Always written in child-friendly English but with the real facts the teacher needs.",
          properties: {
            overview: { type: "string", description: "3–5 sentence factual overview of what this topic is." },
            background_content: {
              type: "array",
              description: "4–8 expanded teaching notes, each with a heading and a thorough 3–6 sentence explanation.",
              items: {
                type: "object",
                properties: {
                  heading: { type: "string" },
                  explanation: { type: "string" }
                },
                required: ["heading", "explanation"]
              }
            },
            key_facts: {
              type: "array",
              items: { type: "string" },
              description: "5–8 short factual statements the teacher can confidently state to the class."
            },
            real_world_examples: {
              type: "array",
              items: { type: "string" },
              description: "3–5 Zimbabwean real-world examples that bring the topic to life."
            },
            explain_to_children: {
              type: "array",
              items: { type: "string" },
              description: "3–5 ready-to-deliver mini-explanations written in very simple words the teacher can read aloud."
            },
            extension_knowledge: {
              type: "array",
              items: { type: "string" },
              description: "2–4 slightly more advanced background facts for the teacher's own knowledge."
            }
          },
          required: ["overview", "background_content", "key_facts", "real_world_examples", "explain_to_children"]
        },
        // NEW — Step-by-step teacher guidance for student teachers, attaches, and first-time teachers
        teacher_guidance: {
          type: "object",
          description: "Practical how-to-teach guidance written for an inexperienced teacher, student teacher, or teacher on attachment. Plain, encouraging language.",
          properties: {
            how_to_introduce: { type: "string", description: "2–4 sentences: exactly how to open the lesson, what to say, what to write on the board, what question to ask first." },
            step_by_step_delivery: {
              type: "array",
              items: { type: "string" },
              description: "5–8 numbered teaching steps in chronological order. Each step starts with an action verb and is short and concrete (e.g. 'Write the word \"fraction\" on the board and ask learners to clap each syllable')."
            },
            board_layout: { type: "string", description: "What the chalkboard should look like by the end of the lesson — describe in plain words." },
            common_mistakes: {
              type: "array",
              items: { type: "string" },
              description: "3–5 mistakes learners commonly make on this topic, each with how to gently correct them."
            },
            checking_understanding: {
              type: "array",
              items: { type: "string" },
              description: "3–5 quick questions or signals the teacher can use to check that learners understood before moving on."
            },
            differentiation_tips: {
              type: "array",
              items: { type: "string" },
              description: "2–3 simple tips for helping slower learners and stretching faster learners during the lesson."
            },
            classroom_language: {
              type: "array",
              items: { type: "string" },
              description: "4–6 ready-to-say phrases the teacher can use in class (e.g. 'Turn to your neighbour and share one example of...')"
            }
          },
          required: ["how_to_introduce", "step_by_step_delivery", "common_mistakes", "checking_understanding"]
        },
        // Subject-specific sections
        ...lessonSections,
        ...mathsSections,
        // Universal extras
        suggested_teaching_images: { type: "array", items: { type: "string" } },
        suggested_teaching_resources: { type: "array", items: { type: "string" } },
        homework_easy: { type: "string" },
        homework_medium: { type: "string" },
        homework_challenge: { type: "string" },
      },
      // Keep the required list LEAN to reduce model latency (large `required` arrays
      // make the LLM emit far more tokens and pushed us past the ~30s gateway timeout
      // → 502 errors). The model still fills in optional sections when it has content.
      required: [
        "lesson_title", "duration", "learning_objectives",
        "key_definitions", "teaching_notes", "teacher_activities", "learner_activities",
        "assessment_strategy", "teacher_guidance",
        "homework_easy", "homework_medium", "homework_challenge",
        ...(isMaths ? ["worked_examples", "class_exercise"] : []),
      ],
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
      // Mathematics lessons need reliable multi-step arithmetic in worked examples,
      // so we use a stronger model for Maths only. Other subjects use the default.
      ...(isMaths ? { model: "claude_sonnet_4_6" } : {}),
    });

    // Some models wrap the JSON in a `response` envelope — unwrap if needed.
    const lessonPlan = (result && typeof result === "object" && result.response && !result.lesson_title)
      ? result.response
      : result;

    return Response.json({
      lesson_plan: lessonPlan,
      topic,
      template_key: template.key,
      section_order: template.sections,
      notes_used: approvedNotes.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});