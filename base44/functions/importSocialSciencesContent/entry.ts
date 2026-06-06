import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { grade, subjectName, content } = await req.json();

    if (!grade || !subjectName || !content) {
      return Response.json({ error: 'Missing grade, subjectName, or content' }, { status: 400 });
    }

    // 1. Get or create subject
    const subjects = await base44.asServiceRole.entities.Subject.filter({ name: subjectName, grade });
    let subject = subjects.length > 0 ? subjects[0] : null;

    if (!subject) {
      subject = await base44.asServiceRole.entities.Subject.create({
        name: subjectName,
        grade,
        icon: '📚',
        description: `${subjectName} for ${grade}`,
        is_active: true,
      });
    }

    // 2. Parse content into TOPIC and UNIT sections
    const topics = [];
    const topicRegex = /TOPIC\s+(\d+):\s*(.+?)(?=TOPIC\s+\d+:|NEXT CHAPTER|$)/gs;
    let topicMatch;

    while ((topicMatch = topicRegex.exec(content)) !== null) {
      const topicNumber = topicMatch[1];
      const topicText = topicMatch[2].trim();
      const topicTitleMatch = topicText.match(/^(.+?)(?:\n|$)/);
      const topicTitle = topicTitleMatch ? topicTitleMatch[1].trim() : `Topic ${topicNumber}`;

      const units = [];
      const unitRegex = /UNIT\s+(\d+):\s*(.+?)(?=UNIT\s+\d+:|End of Topic|NEXT CHAPTER|TOPIC|$)/gs;
      let unitMatch;

      while ((unitMatch = unitRegex.exec(topicText)) !== null) {
        units.push({
          number: unitMatch[1],
          content: unitMatch[2].trim(),
        });
      }

      topics.push({
        number: topicNumber,
        title: topicTitle,
        units,
      });
    }

    // 3. Create Topic entities and Notes
    let topicsCreated = 0;
    let notesCreated = 0;

    for (const topic of topics) {
      // Create Topic
      const existingTopics = await base44.asServiceRole.entities.Topic.filter({
        name: topic.title,
        subject_id: subject.id,
      });

      let topicEntity = existingTopics.length > 0 ? existingTopics[0] : null;

      if (!topicEntity) {
        topicEntity = await base44.asServiceRole.entities.Topic.create({
          name: topic.title,
          subject_id: subject.id,
          order: parseInt(topic.number),
          learning_objectives: `Topics and units related to ${topic.title}`,
          is_active: true,
        });
        topicsCreated++;
      }

      // Create Notes for each Unit
      for (const unit of topic.units) {
        // Add delay between LLM calls to avoid timeouts
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          // Use LLM to structure the unit content
          const structuredData = await base44.asServiceRole.integrations.Core.InvokeLLM({
            model: 'gemini_3_flash',
            prompt: `Extract and structure this educational content into JSON with fields: overview, key_definitions, key_concepts, zimbabwe_examples, important_facts, common_mistakes, summary, exam_tips. Return ONLY valid JSON.

Content:
${unit.content.slice(0, 2000)}`,
            response_json_schema: {
              type: 'object',
              properties: {
                overview: { type: 'string' },
                key_definitions: { type: 'string' },
                key_concepts: { type: 'string' },
                zimbabwe_examples: { type: 'string' },
                important_facts: { type: 'string' },
                common_mistakes: { type: 'string' },
                summary: { type: 'string' },
                exam_tips: { type: 'string' },
              },
            },
          });

          // Create Note entity
          await base44.asServiceRole.entities.Note.create({
            topic_id: topicEntity.id,
            subject_id: subject.id,
            overview: structuredData.overview || '',
            key_definitions: structuredData.key_definitions || '',
            key_concepts: structuredData.key_concepts || '',
            zimbabwe_examples: structuredData.zimbabwe_examples || '',
            important_facts: structuredData.important_facts || '',
            common_mistakes: structuredData.common_mistakes || '',
            summary: structuredData.summary || '',
            exam_tips: structuredData.exam_tips || '',
            is_ai_generated: true,
            is_active: false,
          });

          notesCreated++;
        } catch (unitError) {
          console.error(`Failed to process unit ${unit.number}:`, unitError.message);
          // Continue with next unit instead of failing entire import
        }
      }
    }

    return Response.json({
      success: true,
      subject_id: subject.id,
      subject_name: subject.name,
      topics_created: topicsCreated,
      notes_created: notesCreated,
      message: `✅ Imported ${subjectName}: ${topicsCreated} topics, ${notesCreated} notes (all as drafts). Review in Content Review tab.`,
    });
  } catch (error) {
    return Response.json(
      { error: error.message || 'Import failed' },
      { status: 500 }
    );
  }
});