import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const batchSize = body.batchSize || 5;
  const offset = body.offset || 0;

  const allNotes = await base44.asServiceRole.entities.Note.list('-created_date', 500);
  const notesWithoutImage = allNotes.filter(n => !n.image_url);
  const batch = notesWithoutImage.slice(offset, offset + batchSize);

  const allTopics = await base44.asServiceRole.entities.Topic.list();
  const topicMap = Object.fromEntries(allTopics.map(t => [t.id, t]));

  const results = [];

  for (const note of batch) {
    const topic = topicMap[note.topic_id];
    if (!topic) continue;

    try {
      const img = await base44.asServiceRole.integrations.Core.GenerateImage({
        prompt: `A bright, colourful, child-friendly educational illustration for a Zimbabwean primary school textbook (Grade 4-7).

Topic: "${topic.name}".

VERY IMPORTANT — the illustration MUST be African-centred and rooted in Zimbabwean daily life so learners see themselves in it:
- All people must be Black African children and adults with dark/brown skin tones, natural Afro or braided hair, and warm friendly expressions.
- Children should be wearing typical Zimbabwean primary school uniforms (e.g. light blue or green shirt, navy/grey shorts or pinafore) OR everyday African clothing (chitenge/zambia wraps, simple t-shirts, sandals).
- Set the scene in recognisable Zimbabwean environments: rural village with thatched rondavel huts, msasa or baobab trees, granite kopjes (balancing rocks), savanna grassland, maize fields, a busy local market like Mbare Musika, township homes, or a rural primary school with a chalkboard.
- Where relevant, include locally familiar items: sadza and relish, mealie-meal, ox-drawn ploughs, a borehole/water pump, scotch carts, goats, cattle, rondavel huts, Zimbabwe bird, Victoria Falls, Great Zimbabwe ruins.
- Avoid Western/European/American settings, suburban houses with snow, Caucasian characters, or generic stock-illustration scenes.

Style: cheerful flat cartoon illustration, soft warm earthy colours (red soil, ochre, green, golden sunlight), clean simple shapes, no text or words in the image, no logos, no violence, no scary content. Safe and uplifting for children aged 9-13.`
      });

      if (img?.url) {
        await base44.asServiceRole.entities.Note.update(note.id, { image_url: img.url });
        results.push({ noteId: note.id, topic: topic.name, status: 'done' });
      }
    } catch (e) {
      results.push({ noteId: note.id, topic: topic.name, status: 'error', error: e.message });
    }
  }

  return Response.json({
    totalWithoutImage: notesWithoutImage.length,
    processed: results.length,
    nextOffset: offset + batchSize,
    hasMore: offset + batchSize < notesWithoutImage.length,
    results
  });
});