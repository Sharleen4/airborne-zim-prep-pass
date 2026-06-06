import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { offlineDB } from "@/lib/offlineDB";
import { ArrowLeft, ArrowRight, RotateCcw, BookOpen, HelpCircle, WifiOff, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Single flip card ─────────────────────────────────────────────────────
function FlipCard({ front, back, hint }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => setFlipped(false), [front]); // reset on card change

  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={{ perspective: "1200px", minHeight: "260px" }}
      onClick={() => setFlipped(f => !f)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d", position: "relative", width: "100%", minHeight: "260px" }}
      >
        {/* Front */}
        <div
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-card border-2 border-primary/30 rounded-3xl p-6 shadow-lg"
        >
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-4">Tap to reveal</p>
          <p className="text-lg font-bold text-foreground text-center leading-snug">{front}</p>
          {hint && <p className="text-xs text-muted-foreground mt-4 italic text-center">{hint}</p>}
        </div>

        {/* Back */}
        <div
          style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-primary rounded-3xl p-6 shadow-lg"
        >
          <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-4">Answer</p>
          <p className="text-base font-semibold text-white text-center leading-relaxed">{back}</p>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────
export default function FlashcardsPage() {
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("definitions"); // "definitions" | "questions"
  const [showPicker, setShowPicker] = useState(true);

  // Load subjects & topics from cache
  useEffect(() => {
    async function load() {
      const [allSubjects, allTopics] = await Promise.all([
        offlineDB.getAll(offlineDB.STORES.subjects),
        offlineDB.getAll(offlineDB.STORES.topics),
      ]);
      setSubjects(allSubjects.filter(s => s.is_active !== false));
      setTopics(allTopics.filter(t => t.is_active !== false));
      setLoading(false);
    }
    load();
  }, []);

  const filteredTopics = selectedSubjectId
    ? topics.filter(t => t.subject_id === selectedSubjectId)
    : topics;

  const buildCards = useCallback(async (topicId, cardMode) => {
    setLoading(true);
    setCards([]);
    setIndex(0);

    const [allNotes, allQuestions] = await Promise.all([
      offlineDB.getAll(offlineDB.STORES.notes),
      offlineDB.getAll(offlineDB.STORES.questions),
    ]);

    let built = [];

    if (cardMode === "definitions") {
      // Pull key_definitions from notes for the selected topic(s)
      const relevantNotes = topicId
        ? allNotes.filter(n => n.topic_id === topicId && n.is_active !== false)
        : allNotes.filter(n => {
            const t = topics.find(x => x.id === n.topic_id);
            return (!selectedSubjectId || t?.subject_id === selectedSubjectId) && n.is_active !== false;
          });

      for (const note of relevantNotes) {
        const topic = topics.find(t => t.id === note.topic_id);
        if (!note.key_definitions) continue;

        // Try to parse structured definitions (lines like "Term: Definition" or "Term — Definition")
        const lines = note.key_definitions.split(/\n/).map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
          const match = line.match(/^(.+?)[\s]*[:\-–—]+[\s]*(.+)$/);
          if (match) {
            built.push({ front: match[1].trim(), back: match[2].trim(), hint: topic?.name });
          } else if (line.length > 10) {
            // Treat the whole line as a "What is this?" card
            built.push({ front: `What does this mean? "${line.slice(0, 60)}..."`, back: line, hint: topic?.name });
          }
        }
      }
    } else {
      // Build Q&A cards from questions
      const relevantQs = topicId
        ? allQuestions.filter(q => q.topic_id === topicId && q.is_active !== false)
        : allQuestions.filter(q => {
            const t = topics.find(x => x.id === q.topic_id);
            return (!selectedSubjectId || t?.subject_id === selectedSubjectId) && q.is_active !== false;
          });

      for (const q of relevantQs) {
        if (!q.question_text || !q.correct_answer) continue;
        const topic = topics.find(t => t.id === q.topic_id);
        // Find the correct option text
        const correctOption = (q.options || []).find(o => o.label === q.correct_answer);
        const answerText = correctOption
          ? `${q.correct_answer}. ${correctOption.text}`
          : q.correct_answer;
        built.push({
          front: q.question_text,
          back: answerText + (q.explanation ? `\n\n💡 ${q.explanation}` : ""),
          hint: topic?.name,
        });
      }
    }

    // Shuffle
    built = built.sort(() => Math.random() - 0.5).slice(0, 50);
    setCards(built);
    setLoading(false);
    setShowPicker(false);
  }, [topics, selectedSubjectId]);

  const handleStart = () => {
    buildCards(selectedTopicId, mode);
  };

  const next = () => setIndex(i => Math.min(i + 1, cards.length - 1));
  const prev = () => setIndex(i => Math.max(i - 1, 0));
  const restart = () => { setIndex(0); buildCards(selectedTopicId, mode); };

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const selectedTopic = topics.find(t => t.id === selectedTopicId);

  if (loading && subjects.length === 0) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-jakarta pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-primary text-white px-6 pt-12 pb-8">
        <Link to="/home" className="inline-flex items-center gap-2 text-white/80 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">🃏</div>
          <div>
            <h1 className="text-xl font-extrabold">Flashcards</h1>
            <p className="text-white/70 text-xs flex items-center gap-1 mt-0.5">
              <WifiOff className="w-3 h-3" /> Works fully offline
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">

        {/* Picker */}
        {(showPicker || cards.length === 0) ? (
          <div className="space-y-4">
            {subjects.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border">
                <WifiOff className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">No content cached yet</p>
                <p className="text-sm mt-1">Go online and browse subjects to cache them for offline use.</p>
              </div>
            ) : (
              <>
                {/* Mode toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode("definitions")}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-semibold text-sm transition-colors ${mode === "definitions" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    <BookOpen className="w-4 h-4" /> Definitions
                  </button>
                  <button
                    onClick={() => setMode("questions")}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 font-semibold text-sm transition-colors ${mode === "questions" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                  >
                    <HelpCircle className="w-4 h-4" /> Q&A
                  </button>
                </div>

                {/* Subject */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Subject (optional)</label>
                  <div className="relative">
                    <select
                      value={selectedSubjectId}
                      onChange={e => { setSelectedSubjectId(e.target.value); setSelectedTopicId(""); }}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground appearance-none"
                    >
                      <option value="">All subjects</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Topic */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Topic (optional)</label>
                  <div className="relative">
                    <select
                      value={selectedTopicId}
                      onChange={e => setSelectedTopicId(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-card text-foreground appearance-none"
                    >
                      <option value="">All topics{selectedSubjectId ? ` in ${selectedSubject?.name}` : ""}</option>
                      {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="w-full bg-primary text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : "Start Flashcards 🃏"
                  }
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <button onClick={() => setShowPicker(true)} className="text-primary font-semibold">← Change deck</button>
              <span>{index + 1} / {cards.length}</span>
            </div>
            <div className="bg-muted rounded-full h-1.5 mb-2">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${((index + 1) / cards.length) * 100}%` }}
              />
            </div>

            {/* Deck label */}
            <p className="text-xs text-center text-muted-foreground mb-2">
              {selectedTopic?.name || selectedSubject?.name || "All Topics"} · {mode === "definitions" ? "Definitions" : "Q&A"}
            </p>

            {/* Card */}
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : cards.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground bg-card rounded-2xl border border-border">
                <p className="font-semibold">No cards found</p>
                <p className="text-sm mt-1">Try a different topic or mode, or browse online to cache more content.</p>
                <button onClick={() => setShowPicker(true)} className="mt-4 text-primary font-semibold text-sm">← Go back</button>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.2 }}
                >
                  <FlipCard
                    front={cards[index].front}
                    back={cards[index].back}
                    hint={cards[index].hint}
                  />
                </motion.div>
              </AnimatePresence>
            )}

            {/* Navigation */}
            {cards.length > 0 && (
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={prev}
                  disabled={index === 0}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-border py-3 rounded-2xl font-semibold text-sm text-foreground disabled:opacity-30"
                >
                  <ArrowLeft className="w-4 h-4" /> Prev
                </button>
                <button
                  onClick={restart}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl border-2 border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                  title="Shuffle & restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                {index < cards.length - 1 ? (
                  <button
                    onClick={next}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-2xl font-semibold text-sm"
                  >
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={restart}
                    className="flex-1 flex items-center justify-center gap-2 bg-accent text-white py-3 rounded-2xl font-semibold text-sm"
                  >
                    <RotateCcw className="w-4 h-4" /> Restart
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
