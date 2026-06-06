import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Sparkles, BookOpen, Zap, ChevronRight, Lightbulb, AlertTriangle, CheckCircle, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import SyncStatusBar from "@/components/SyncStatusBar";
import ConceptExamplesSection from "@/components/ConceptExamplesSection";
import BookmarkButton from "@/components/BookmarkButton";
import { offlineDB } from "@/lib/offlineDB";
import { useOffline } from "@/lib/useOffline";
import { loadStats, saveStats, XP_PER_LESSON_COMPLETE } from "@/lib/gamification";
import { useAuth } from "@/lib/AuthContext";
import { usePlan } from "@/lib/usePlan";
import PremiumLockScreen from "@/components/premium/PremiumLockScreen";

export default function NotesPage() {
  const { topicId } = useParams();
  const { isFree, loading: planLoading } = usePlan();
  const [topic, setTopic] = useState(null);
  const [note, setNote] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);


  const { isOffline } = useOffline();
  const { user } = useAuth();

  // Award XP once per topic per session for viewing notes
  useEffect(() => {
    if (!user?.email || !topicId) return;
    const key = `xp_lesson_${user.email}_${topicId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const stats = loadStats(user.email);
    stats.lessonsCompleted = (stats.lessonsCompleted || 0) + 1;
    stats.totalXp = (stats.totalXp || 0) + XP_PER_LESSON_COMPLETE;
    saveStats(user.email, stats);
    window.dispatchEvent(new Event("zama_xp_updated"));
  }, [user, topicId]);

  useEffect(() => {
    async function load() {
      // Load from cache IMMEDIATELY to unblock UI
      const allTopics = await offlineDB.getAll(offlineDB.STORES.topics);
      const cachedTopic = allTopics.find(t => t.id === topicId);
      setTopic(cachedTopic || null);

      const allNotes = await offlineDB.getAll(offlineDB.STORES.notes);
      const cachedNote = allNotes.find(n => n.topic_id === topicId) || null;
      setNote(cachedNote);
      setLoading(false);

      // Then refresh from network in background (only if online)
      if (navigator.onLine) {
        try {
          const [freshTopic, freshNote] = await Promise.all([
            base44.entities.Topic.list().then(t => t.find(x => x.id === topicId)),
            base44.entities.Note.filter({ topic_id: topicId, is_active: true }).then(n => n[0] || null)
          ]);
          if (freshTopic) { setTopic(freshTopic); await offlineDB.putOne(offlineDB.STORES.topics, freshTopic); }
          if (freshNote) {
            setNote(freshNote);
            await offlineDB.putOne(offlineDB.STORES.notes, freshNote);

            // If note exists but has no image, generate one silently and save it
            if (!freshNote.image_url && freshTopic) {
              base44.integrations.Core.GenerateImage({
                prompt: `A bright, colourful, child-friendly educational illustration for a Grade 7 Zimbabwe school textbook. Topic: "${freshTopic.name}". Cartoon-style, cheerful, Zimbabwe children or local scenes. No text, no violence, safe for children aged 12-13.`
              }).then(async (img) => {
                if (!img?.url) return;
                const updated = await base44.entities.Note.update(freshNote.id, { image_url: img.url });
                setNote(updated);
                await offlineDB.putOne(offlineDB.STORES.notes, updated);
              }).catch(() => {});
            }
          }
        } catch {}
      }
    }
    load();
  }, [topicId]);

  const generateNotes = async () => {
    if (!topic) return;
    setGenerating(true);

    // Generate illustration in parallel with notes
    const imagePromise = base44.integrations.Core.GenerateImage({
      prompt: `A bright, colourful, child-friendly educational illustration for a Grade 7 Zimbabwe school textbook. Topic: "${topic.name}". The image should be cartoon-style, cheerful, and show Zimbabwe children or local scenes related to the topic. No text, no violence, no adult content. Safe for children aged 12-13.`
    }).then(r => r.url).catch(() => null);

    const result = await base44.integrations.Core.InvokeLLM({
      model: "gemini_3_flash",
      prompt: `You are a friendly, encouraging teacher writing revision notes for a Grade 7 pupil in Zimbabwe aged 12-13.

Topic: ${topic.name}
Learning Objectives: ${topic.learning_objectives || "General understanding"}

STRICT RULES — follow every one:
1. Write like you are talking directly to a 12-year-old. Use VERY simple, everyday words only.
2. BANNED words: commutative, associative, distributive, rational, denominator, numerator, coefficient, variable, equation, theorem, hypothesis. Show the idea with examples instead.
3. Short sentences ONLY. Maximum 15 words per sentence.
4. EVERY example MUST use Zimbabwe real-life context: sadza, mealie meal, Harare, school fees, bus fare, farm, maize, cattle, Victoria Falls, river, market, ZIMSEC exam, soccer, braai, etc.
5. No long paragraphs anywhere. Keep sections short and scannable.

CONCEPT EXAMPLES — CRITICAL REQUIREMENTS:
- Provide EXACTLY 3 main concepts for this topic.
- For EACH concept provide EXACTLY 3 worked examples:
  • difficulty: "Easy" — simple one-step problem, Zimbabwe setting
  • difficulty: "Standard" — two-step problem, Zimbabwe setting  
  • difficulty: "Advanced" — multi-step or real-world problem, Zimbabwe setting
- In EVERY "solution" field show ALL working steps like this:
  "Step 1: [what you do]. Step 2: [next step]. Step 3: [next step]. Answer = [final answer with unit]"
- Every problem must feel like something a Zimbabwean child would actually encounter.

Output ONLY valid JSON with these exact keys:
- overview: 2-3 simple sentences about what this topic is. Zimbabwe context. No technical words.
- key_definitions: the 4-5 most important words with simple meanings. Use real Zimbabwe objects as examples.
- key_concepts: the 3 main ideas explained simply, step by step. Show WHAT TO DO with a mini Zimbabwe example for each.
- concept_examples: array of 3 concept objects. Each: { "concept": "simple name", "examples": [ {difficulty, problem, solution}, {difficulty, problem, solution}, {difficulty, problem, solution} ] }
- zimbabwe_examples: 3-4 sentences showing where this topic appears in real Zimbabwe life (school, farm, market, home).
- important_facts: exactly 4 bullet points of the most important things to remember. Simple words only.
- common_mistakes: 3 common errors pupils make with a short fix for each. Show a wrong example and the correct one.
- summary: exactly 5 short bullet points summarising the whole topic. Simple words.
- exam_tips: 4 practical tips to score marks in the ZIMSEC exam for this topic.`,
      response_json_schema: {
        type: "object",
        properties: {
          overview: { type: "string" },
          key_definitions: { type: "string" },
          key_concepts: { type: "string" },
          concept_examples: {
            type: "array",
            items: {
              type: "object",
              properties: {
                concept: { type: "string" },
                examples: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      difficulty: { type: "string", enum: ["Easy", "Standard", "Advanced"] },
                      problem: { type: "string" },
                      solution: { type: "string" }
                    }
                  }
                }
              }
            }
          },
          zimbabwe_examples: { type: "string" },
          important_facts: { type: "string" },
          common_mistakes: { type: "string" },
          summary: { type: "string" },
          exam_tips: { type: "string" }
        }
      }
    });

    const imageUrl = await imagePromise;

    const saved = await base44.entities.Note.create({
      topic_id: topicId,
      subject_id: topic.subject_id,
      image_url: imageUrl || "",
      overview: result.overview,
      key_definitions: result.key_definitions,
      key_concepts: result.key_concepts,
      concept_examples: result.concept_examples || [],
      zimbabwe_examples: result.zimbabwe_examples,
      important_facts: result.important_facts,
      common_mistakes: result.common_mistakes,
      summary: result.summary,
      exam_tips: result.exam_tips,
      is_ai_generated: true
    });
    await offlineDB.putOne(offlineDB.STORES.notes, saved);
    setNote(saved);
    setGenerating(false);
  };

  if (loading || planLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  // Gate: free-plan users only get free topics.
  if (isFree && topic && !topic.is_free) {
    return <PremiumLockScreen topicName={topic.name} subjectId={topic.subject_id} />;
  }

  return (
    <div className="min-h-screen bg-background font-jakarta pb-24">
      <SyncStatusBar />
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-violet-700 text-white px-6 pt-12 pb-10">
        <Link to={`/subject/${topic?.subject_id}`} className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{topic?.name}</h1>
            <p className="text-white/70 text-sm">Revision Notes</p>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-4 space-y-4 pb-10">
        {!note ? (
          <div className="bg-card rounded-2xl p-8 shadow-sm border border-border text-center mt-2">
            {isOffline ? (
              <>
                <WifiOff className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
                <h2 className="font-bold text-lg text-foreground mb-2">Notes not cached yet</h2>
                <p className="text-muted-foreground text-sm mb-4">Connect to the internet to generate and save notes for offline use.</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-bold text-lg text-foreground mb-2">No notes yet</h2>
                <p className="text-muted-foreground text-sm mb-6">Generate AI-powered notes for this topic instantly.</p>
                <button
                  onClick={generateNotes}
                  disabled={generating}
                  className="w-full bg-primary text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating notes...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate AI Notes
                    </>
                  )}
                </button>
              </>
            )}
            <Link
              to={`/practice/${topicId}`}
              className="block w-full text-center border-2 border-orange-400 text-orange-500 font-semibold py-3 rounded-xl mt-2"
            >
              Go to Practice Questions
            </Link>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-2">
            {note.is_ai_generated && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card rounded-xl px-3 py-2 border border-border">
                <Sparkles className="w-3 h-3 text-primary" />
                AI-generated notes · {topic?.name}
              </div>
            )}

            {/* Topic illustration — loaded instantly from stored URL */}
            {note.image_url && (
              <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
                <img src={note.image_url} alt={`Illustration for ${topic?.name}`} className="w-full object-cover max-h-52" loading="eager" />
              </div>
            )}

            <div className="flex items-center gap-2 justify-between mb-2">
              <h2 className="font-bold text-lg text-foreground">Revision Notes</h2>
              <BookmarkButton
                itemType="note"
                topicId={topicId}
                subjectId={topic?.subject_id}
                notePreview={note.overview || "Notes"}
              />
            </div>

            {note.overview && <NoteSection icon={<BookOpen className="w-4 h-4 text-primary" />} title="Topic Overview" content={note.overview} color="blue" topicName={topic?.name} />}
            {note.key_definitions && <NoteSection icon="📖" title="Key Definitions" content={note.key_definitions} color="purple" topicName={topic?.name} />}
            {note.key_concepts && <NoteSection icon="💡" title="Key Concepts" content={note.key_concepts} color="yellow" topicName={topic?.name} />}
            {note.concept_examples && <ConceptExamplesSection examples={note.concept_examples} />}
            {note.zimbabwe_examples && <NoteSection icon="🇿🇼" title="Zimbabwe Examples" content={note.zimbabwe_examples} color="green" topicName={topic?.name} />}
            {note.important_facts && <NoteSection icon={<CheckCircle className="w-4 h-4 text-green-600" />} title="Important Facts" content={note.important_facts} color="green" topicName={topic?.name} />}
            {note.common_mistakes && <NoteSection icon={<AlertTriangle className="w-4 h-4 text-orange-500" />} title="Common Mistakes" content={note.common_mistakes} color="orange" topicName={topic?.name} />}
            {note.summary && <NoteSection icon="📋" title="Summary" content={note.summary} color="blue" topicName={topic?.name} />}
            {note.exam_tips && (
              <div className="bg-gradient-to-r from-primary to-violet-700 rounded-2xl p-4 text-white">
                <div className="flex items-center gap-2 mb-2 font-semibold">
                  <Lightbulb className="w-4 h-4" /> Exam Tips
                </div>
                <p className="text-white/90 text-sm whitespace-pre-line">{note.exam_tips}</p>
              </div>
            )}

            <Link
              to={`/practice/${topicId}`}
              className="flex items-center justify-between bg-orange-500 text-white rounded-2xl p-4 font-semibold mt-2"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Practice Questions →
              </div>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function NoteSection({ icon, title, content, color, topicName, onDiagramGenerated }) {
  const colors = {
    blue: "bg-blue-500/8 border-blue-500/20",
    purple: "bg-purple-500/8 border-purple-500/20",
    yellow: "bg-amber-500/8 border-amber-500/20",
    green: "bg-green-500/8 border-green-500/20",
    orange: "bg-orange-500/8 border-orange-500/20",
  };

  const [diagram, setDiagram] = useState(null);
  const [generating, setGenerating] = useState(false);

  const generateDiagram = async () => {
    setGenerating(true);
    try {
      const img = await base44.integrations.Core.GenerateImage({
        prompt: `Create an educational scientific diagram for Grade 7 Zimbabwe students. 
Section: ${title}
Topic: ${topicName}
Content: ${content.slice(0, 150)}

Style: Clear labeled diagram showing the main concepts. Use colors. Simple, child-friendly. No text overlays except labels. Educational and accurate.`
      });
      setDiagram(img.url);
      onDiagramGenerated?.();
    } catch {}
    setGenerating(false);
  };

  return (
    <div className={`rounded-2xl p-4 border ${colors[color] || colors.blue}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          {typeof icon === "string" ? <span>{icon}</span> : icon}
          {title}
        </div>
        {!diagram && (
          <button
            onClick={generateDiagram}
            disabled={generating}
            className="flex items-center gap-1 text-xs text-primary font-semibold border border-primary/30 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {generating ? <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {generating ? "..." : "Diagram"}
          </button>
        )}
      </div>
      <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">{content}</p>
      {diagram && (
        <div className="mt-3 rounded-xl overflow-hidden border border-border">
          <img src={diagram} alt={`${title} diagram`} className="w-full object-cover max-h-48" />
        </div>
      )}
    </div>
  );
}