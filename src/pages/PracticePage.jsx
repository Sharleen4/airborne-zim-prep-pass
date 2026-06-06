import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Sparkles, CheckCircle, XCircle, ChevronRight, RotateCcw, Flag, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SyncStatusBar from "@/components/SyncStatusBar";
import { getCachedQuestions } from "@/lib/offlineCache";
import { offlineDB } from "@/lib/offlineDB";
import { queueResult, queueTopicProgress } from "@/lib/syncManager";
import { useOffline } from "@/lib/useOffline";
import ReportQuestionModal from "@/components/ReportQuestionModal";
import BookmarkButton from "@/components/BookmarkButton";
import { recordQuestionAnswer, getDueQuestions } from "@/lib/spacedRepetition";
import { loadStats, saveStats, XP_PER_QUESTION_CORRECT, XP_PER_QUESTION_WRONG } from "@/lib/gamification";
import { celebrateCorrect, celebrateBig, checkLevelUp } from "@/lib/celebrate";
import PracticeTestSelector from "@/components/practice/PracticeTestSelector";
import DailyPracticePicker from "@/components/practice/DailyPracticePicker";
import OfflineFallbackScreen from "@/components/OfflineFallbackScreen";
import { usePlan } from "@/lib/usePlan";
import PremiumLockScreen from "@/components/premium/PremiumLockScreen";
import { recordQuestionForGoal } from "@/lib/dailyGoal";
import { useActiveChild } from "@/lib/ActiveChildContext";

function shuffleOptions(question) {
  const labels = ["A", "B", "C", "D"];
  const correctText = question.options.find(o => o.label === question.correct_answer)?.text;
  const shuffled = [...question.options].sort(() => Math.random() - 0.5);
  const remapped = shuffled.map((opt, i) => ({ label: labels[i], text: opt.text }));
  const newCorrect = remapped.find(o => o.text === correctText)?.label || question.correct_answer;
  return { ...question, options: remapped, correct_answer: newCorrect };
}

export default function PracticePage() {
  const { topicId } = useParams();
  const [topic, setTopic] = useState(null);
  const [practiceTests, setPracticeTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null); // null = show selector
  const [questions, setQuestions] = useState([]);
  const [allCachedQuestions, setAllCachedQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [reportingQuestion, setReportingQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [answers, setAnswers] = useState([]);
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const { isFree, loading: planLoading } = usePlan();
  const { activeChildId } = useActiveChild();

  useEffect(() => {
    if (!user) return;
    if (!topicId) { setLoading(false); return; }

    let cancelled = false;

    async function load() {
      setLoadFailed(false);

      // 1) CACHE-FIRST: read DIRECTLY from IndexedDB (no network!) so the user can start practising instantly.
      const [cachedTopics, allCached, cachedTests] = await Promise.all([
        offlineDB.getAll(offlineDB.STORES.topics).catch(() => []),
        offlineDB.getAll(offlineDB.STORES.questions).catch(() => []),
        offlineDB.getAll(offlineDB.STORES.practiceTests).catch(() => []),
      ]);
      const cachedQs = allCached.filter(q =>
        q.topic_id === topicId &&
        q.is_active !== false &&
        ["mcq", "comprehension", "true_false"].includes(q.question_type)
      );

      if (cancelled) return;

      const cachedTopic = cachedTopics.find(t => t.id === topicId) || null;
      if (cachedTopic) setTopic(cachedTopic);

      const seen = new Set();
      const uniqueCachedQs = cachedQs.filter(q => { if (seen.has(q.id)) return false; seen.add(q.id); return true; });
      if (uniqueCachedQs.length > 0) setAllCachedQuestions(uniqueCachedQs);

      const topicTests = cachedTests
        .filter(t => t.topic_id === topicId)
        .sort((a, b) => (a.test_number || 0) - (b.test_number || 0));
      if (topicTests.length > 0) setPracticeTests(topicTests);

      // If we have a cached topic, show the UI right away — tests/questions
      // refresh silently in the background.
      if (cachedTopic) {
        setLoading(false);
      }

      // 2) BACKGROUND REFRESH: silently update from network when online.
      if (!navigator.onLine) {
        if (!cachedTopic) { setLoadFailed(true); setLoading(false); }
        return;
      }

      try {
        const [freshTopics, freshQs, freshTests] = await Promise.all([
          base44.entities.Topic.list(),
          base44.entities.Question.filter({ topic_id: topicId, is_active: true }, "created_date", 200),
          base44.entities.PracticeTest.filter({ topic_id: topicId }, "test_number", 50),
        ]);

        if (cancelled) return;

        const freshTopic = freshTopics.find(t => t.id === topicId) || null;
        if (freshTopic) {
          setTopic(freshTopic);
          await offlineDB.putOne(offlineDB.STORES.topics, freshTopic);
        }

        if (!freshTopic && !cachedTopic) {
          setLoadFailed(true);
          setLoading(false);
          return;
        }

        const seen2 = new Set();
        const allQs = (freshQs || []).filter(q => { if (seen2.has(q.id)) return false; seen2.add(q.id); return true; });
        if (!cancelled) setAllCachedQuestions(allQs);

        // Persist fresh questions to cache for instant next-load
        if (allQs.length > 0) {
          offlineDB.putMany(offlineDB.STORES.questions, allQs).catch(() => {});
        }

        // Ensure at least 2 curated tests exist
        const curatedTests = (freshTests || []).filter(t => t.type === "curated" || !t.type);
        const missingCount = Math.max(0, 2 - curatedTests.length);

        let finalTests = freshTests || [];
        if (missingCount > 0 && allQs.length >= 5) {
          const existingQIds = new Set(curatedTests.flatMap(t => t.question_ids || []));
          const pool = [...allQs].sort(() => Math.random() - 0.5);
          const toCreate = [];

          for (let i = 0; i < missingCount; i++) {
            const testNumber = curatedTests.length + i + 1;
            const fresh = pool.filter(q => !existingQIds.has(q.id));
            const picked = (fresh.length >= 10 ? fresh : pool).slice(0, Math.min(10, pool.length));
            picked.forEach(q => existingQIds.add(q.id));
            toCreate.push({ name: `Test ${testNumber}`, test_number: testNumber, question_ids: picked.map(q => q.id) });
          }

          const created = await Promise.all(toCreate.map(t =>
            base44.entities.PracticeTest.create({
              topic_id: topicId,
              subject_id: (freshTopic || cachedTopic)?.subject_id || "",
              name: t.name,
              test_number: t.test_number,
              question_ids: t.question_ids,
              type: "curated",
            })
          ));
          finalTests = [...finalTests, ...created];
        }
        if (!cancelled) setPracticeTests(finalTests);

        // Persist tests to cache for instant next-load
        if (finalTests.length > 0) {
          offlineDB.putMany(offlineDB.STORES.practiceTests, finalTests).catch(() => {});
        }
      } catch {
        // Network failed — keep whatever cache we have.
        if (!cachedTopic && !cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();

    return () => { cancelled = true; };
  }, [topicId, user]);

  const generateNewTest = async () => {
    if (isOffline) return;
    setGenerating(true);

    const testNumber = practiceTests.length + 1;

    // Get existing question IDs used in previous tests to avoid duplicates
    const usedIds = new Set(practiceTests.flatMap(t => t.question_ids || []));
    let pool = allCachedQuestions.filter(q => !usedIds.has(q.id));

    // If not enough fresh questions, fetch more from API or allow repeats
    if (pool.length < 10) {
      try {
        const existingQs = await base44.entities.Question.filter(
          { topic_id: topicId, is_active: true }, "created_date", 200
        );
        const seen = new Set();
        const unique = existingQs.filter(q => { if (seen.has(q.id)) return false; seen.add(q.id); return true; });
        setAllCachedQuestions(unique);

        const freshPool = unique.filter(q => !usedIds.has(q.id));
        if (freshPool.length >= 10) {
          pool = freshPool;
        } else {
          // Fall back: generate new questions via AI
          pool = await generateAiQuestions(unique);
        }
      } catch {}
    }

    // If still not enough, use all questions (with repeats allowed)
    if (pool.length < 10) {
      pool = allCachedQuestions.length > 0 ? allCachedQuestions : pool;
    }

    // Pick 10 random questions
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected10 = shuffled.slice(0, 10);
    const questionIds = selected10.map(q => q.id);

    // Save as a new PracticeTest entity
    const newTest = await base44.entities.PracticeTest.create({
      topic_id: topicId,
      subject_id: topic?.subject_id || "",
      name: `AI Test ${testNumber}`,
      test_number: testNumber,
      question_ids: questionIds,
      type: "ai_generated",
    });

    setPracticeTests(prev => [...prev, newTest]);
    setGenerating(false);

    // Auto-start the new test
    startTest(newTest, selected10);
  };

  const generateAiQuestions = async (existingQs) => {
    const existingTexts = new Set(
      existingQs.map(q => q.question_text?.toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim())
    );
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        model: "gemini_3_flash",
        prompt: `You are a ZIMSEC exam question setter for Grade 7 Zimbabwe students.
Generate 10 MCQ practice questions for Topic: ${topic?.name}
Rules: Simple English for 12-year-olds, Zimbabwe-based examples, spread correct answers evenly across A/B/C/D, 1-2 sentence explanations.
Return as JSON array.`,
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

      // Filter duplicates first, then save all questions in parallel for speed
      const toSave = [];
      for (const q of result.questions || []) {
        const normalizedText = q.question_text?.toLowerCase().replace(/\s+/g, " ").replace(/[^\w\s]/g, "").trim();
        if (existingTexts.has(normalizedText)) continue;
        existingTexts.add(normalizedText);
        toSave.push(q);
      }
      const created = await Promise.all(toSave.map(q =>
        base44.entities.Question.create({
          topic_id: topicId,
          subject_id: topic?.subject_id || "",
          question_text: q.question_text,
          comprehension_passage: q.comprehension_passage || "",
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty || "Standard",
          question_type: q.comprehension_passage ? "comprehension" : "mcq",
          marks: 1,
          is_active: true
        })
      ));
      return created;
    } catch {
      return [];
    }
  };

  const startTest = async (test, preloadedQuestions = null) => {
    let testQuestions = preloadedQuestions;

    if (!testQuestions) {
      // Fetch the questions by their IDs
      if (allCachedQuestions.length > 0) {
        const idSet = new Set(test.question_ids || []);
        testQuestions = allCachedQuestions.filter(q => idSet.has(q.id));
      }
      if (!testQuestions || testQuestions.length === 0) {
        try {
          const fetched = await base44.entities.Question.filter({ topic_id: topicId, is_active: true }, "created_date", 200);
          const idSet = new Set(test.question_ids || []);
          testQuestions = fetched.filter(q => idSet.has(q.id));
        } catch {}
      }
    }

    setSelectedTest(test);
    setQuestions((testQuestions || []).map(shuffleOptions));
    setCurrent(0);
    setSelected(null);
    setSubmitted(false);
    setScore(0);
    setDone(false);
    setAiExplanation(null);
    setAnswers([]);
  };

  const handleSubmit = () => {
    if (!selected) return;
    const q = questions[current];
    const isCorrect = selected === q.correct_answer;
    if (user?.email) {
      recordQuestionAnswer(user.email, q, isCorrect);
      recordQuestionForGoal(user.email, activeChildId);
      const stats = loadStats(user.email);
      stats.questionsAnswered = (stats.questionsAnswered || 0) + 1;
      if (isCorrect) {
        stats.questionsCorrect = (stats.questionsCorrect || 0) + 1;
        stats.totalXp = (stats.totalXp || 0) + XP_PER_QUESTION_CORRECT;
      } else {
        stats.totalXp = (stats.totalXp || 0) + XP_PER_QUESTION_WRONG;
      }
      saveStats(user.email, stats);
      window.dispatchEvent(new Event("zama_xp_updated"));
      // Quick-win visual + level-up detection
      if (isCorrect) celebrateCorrect();
      checkLevelUp(user.email);
    }
    // Build the updated answers array synchronously so finishSession can use it
    setAnswers(a => {
      const updated = [...a];
      const wasCorrect = updated[current]?.is_correct;
      if (updated[current]) {
        if (wasCorrect && !isCorrect) setScore(s => s - 1);
        else if (!wasCorrect && isCorrect) setScore(s => s + 1);
      } else {
        if (isCorrect) setScore(s => s + 1);
      }
      updated[current] = { question_id: q.id, selected_answer: selected, is_correct: isCorrect };
      return updated;
    });
    setSubmitted(true);
  };

  const getAiExplanation = async () => {
    if (isOffline) return;
    const q = questions[current];
    setLoadingExplanation(true);
    const res = await base44.integrations.Core.InvokeLLM({
      model: "gemini_3_flash",
      prompt: `You are a kind, patient teacher helping a Grade 7 pupil in Zimbabwe.
Question: ${q.question_text}
Pupil's Answer: ${selected}
Correct Answer: ${q.correct_answer}
Write simply for a 12-year-old. Short sentences only.
Provide: why_wrong_or_right, simple_explanation, memory_tip, encouragement`,
      response_json_schema: {
        type: "object",
        properties: {
          why_wrong_or_right: { type: "string" },
          simple_explanation: { type: "string" },
          memory_tip: { type: "string" },
          encouragement: { type: "string" }
        }
      }
    });
    setAiExplanation(res);
    setLoadingExplanation(false);
  };

  const next = () => {
    if (current + 1 >= questions.length) {
      // Compute final score directly from answers to avoid stale state race condition
      const finalAnswers = [...answers];
      if (selected && !finalAnswers[current]) {
        const q = questions[current];
        finalAnswers[current] = { question_id: q.id, selected_answer: selected, is_correct: selected === q.correct_answer };
      }
      const finalScore = finalAnswers.filter(a => a?.is_correct).length;
      finishSession(finalScore, finalAnswers);
    } else {
      setCurrent(c => c + 1);
      setSelected(answers[current + 1]?.selected_answer || null);
      setSubmitted(!!answers[current + 1]);
      setAiExplanation(null);
    }
  };

  const prev = () => {
    if (current === 0) return;
    const prevIndex = current - 1;
    setCurrent(prevIndex);
    setSelected(answers[prevIndex]?.selected_answer || null);
    setSubmitted(!!answers[prevIndex]);
    setAiExplanation(null);
  };

  const finishSession = async (finalScore, finalAnswers) => {
    // Use passed values to avoid stale state race condition
    const resolvedScore = finalScore !== undefined ? finalScore : score;
    const resolvedAnswers = finalAnswers !== undefined ? finalAnswers : answers;
    const percentage = Math.round((resolvedScore / questions.length) * 100);
    if (user?.email && percentage === 100) {
      const stats = loadStats(user.email);
      stats.hasPerfectScore = true;
      saveStats(user.email, stats);
      window.dispatchEvent(new Event("zama_xp_updated"));
    }
    // Celebrate good results with a big confetti burst
    if (percentage >= 60) celebrateBig();
    const resultData = {
      student_email: user.email,
      child_id: activeChildId || undefined,
      topic_id: topicId,
      subject_id: topic?.subject_id || "",
      session_type: "practice",
      score: resolvedScore,
      total: questions.length,
      percentage,
      answers: resolvedAnswers
    };
    if (isOffline) {
      await queueResult(resultData);
    } else {
      const savedResult = await base44.entities.StudentResult.create(resultData);
      await offlineDB.putOne(offlineDB.STORES.studentResults, savedResult || resultData);
    }
    if (percentage < 50) {
      const progressData = {
        student_email: user.email,
        child_id: activeChildId || undefined,
        topic_id: topicId,
        subject_id: topic?.subject_id || "",
        status: "needs_revision",
        last_score: percentage,
      };
      if (isOffline) {
        await queueTopicProgress(progressData);
      } else {
        const existing = await base44.entities.TopicProgress.filter({ student_email: user.email, topic_id: topicId });
        // Only update a record this child owns; otherwise create a new one for this child.
        const owned = existing.find(e => activeChildId ? e.child_id === activeChildId : !e.child_id);
        if (owned) {
          await base44.entities.TopicProgress.update(owned.id, { status: "needs_revision", last_score: percentage });
        } else {
          await base44.entities.TopicProgress.create(progressData);
        }
      }
    }
    setDone(true);
  };

  const retakeTest = () => {
    setCurrent(0); setSelected(null); setSubmitted(false);
    setScore(0); setDone(false); setAiExplanation(null); setAnswers([]);
    setQuestions(questions.map(shuffleOptions));
  };

  const backToSelector = () => {
    setSelectedTest(null);
    setDone(false);
    setCurrent(0); setSelected(null); setSubmitted(false);
    setScore(0); setAiExplanation(null); setAnswers([]);
  };

  if (loading || planLoading) return <LoadingScreen />;

  if (loadFailed) {
    return (
      <OfflineFallbackScreen
        title="Couldn't load practice"
        message="We couldn't load this practice topic. You may be offline, or this topic hasn't been saved for offline use yet."
        onRetry={() => { setLoading(true); setLoadFailed(false); window.location.reload(); }}
      />
    );
  }

  // No specific topic — show the subject → topic picker so the user can choose what to practice.
  if (!topicId) return <DailyPracticePicker />;

  // Gate: free-plan users only get free topics.
  if (isFree && topic && !topic.is_free) {
    return <PremiumLockScreen topicName={topic.name} subjectId={topic.subject_id} />;
  }

  // Show test selector if no test is selected
  if (!selectedTest) {
    return (
      <>
        <SyncStatusBar />
        <div className="min-h-screen bg-background font-jakarta">
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white px-6 pt-12 pb-10">
            <Link to={`/subject/${topic?.subject_id}`} className="inline-flex items-center gap-2 text-white/80 text-sm mb-4">
              <ArrowLeft className="w-4 h-4" /> Back
            </Link>
            <h1 className="text-xl font-bold">Practice: {topic?.name}</h1>
            <p className="text-white/70 text-sm mt-1">Choose a test to start practising</p>
          </div>
          <div className="px-6 py-6 space-y-4">

            {/* All tests as uniform tiles */}
            {practiceTests.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {practiceTests.map((test, i) => (
                  <motion.button
                    key={test.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => startTest(test)}
                    className="bg-card border-2 border-border rounded-2xl p-4 flex flex-col items-start gap-2 shadow-sm hover:border-orange-400 hover:shadow-md transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                      <span className="font-bold text-orange-500 text-sm">{test.test_number || i + 1}</span>
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">{test.name}</p>
                      <p className="text-xs text-muted-foreground">{test.question_ids?.length || 10} questions</p>
                    </div>
                    <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-300 bg-orange-500/10 border border-orange-500/25 px-2 py-0.5 rounded-full">
                      Start →
                    </span>
                  </motion.button>
                ))}
              </div>
            )}

            {practiceTests.length === 0 && !generating && (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-orange-500" />
                </div>
                <h2 className="font-bold text-lg text-foreground mb-2">No practice tests yet</h2>
                <p className="text-muted-foreground text-sm">Generate your first test below.</p>
              </div>
            )}

            <button
              onClick={generateNewTest}
              disabled={generating || isOffline}
              className="w-full bg-orange-500 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {generating ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate More Tests</>
              )}
            </button>
            {isOffline && (
              <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                <WifiOff className="w-3 h-3" /> Go online to generate new tests
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  if (done) return (
    <ResultScreen
      score={score}
      total={questions.length}
      testName={selectedTest?.name}
      topicId={topicId}
      subjectId={topic?.subject_id}
      onRetake={retakeTest}
      onBackToTests={backToSelector}
    />
  );

  const q = questions[current];
  if (!q) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-background font-jakarta">
      <SyncStatusBar />
      <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white px-6 pt-12 pb-10">
        <div className="flex items-center justify-between mb-4">
          <button onClick={backToSelector} className="inline-flex items-center gap-2 text-white/80 text-sm">
            <ArrowLeft className="w-4 h-4" /> All Tests
          </button>
          <span className="text-white/80 text-sm font-semibold">{selectedTest?.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">{topic?.name}</h1>
          <div className="flex items-center gap-3">
            {current > 0 && (
              <button onClick={prev} className="text-white/80 hover:text-white text-sm flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" /> Prev
              </button>
            )}
            <span className="text-white/80 text-sm">{current + 1}/{questions.length}</span>
          </div>
        </div>
        <div className="mt-3 bg-white/20 rounded-full h-2">
          <div className="bg-white rounded-full h-2 transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>
      </div>

      <div className="px-6 py-4 pb-24 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {q.comprehension_passage && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">📖 Read the passage</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{q.comprehension_passage}</p>
              </div>
            )}
            <div className="bg-card rounded-2xl p-5 shadow-sm border border-border">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  q.difficulty === "Easy"
                    ? "bg-green-500/10 text-green-700 dark:text-green-300"
                    : q.difficulty === "Advanced"
                      ? "bg-red-500/10 text-red-700 dark:text-red-300"
                      : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                }`}>
                  {q.difficulty || "Standard"}
                </span>
                <span className="text-xs text-muted-foreground">Question {current + 1}</span>
              </div>
              <p className="font-semibold text-foreground text-base leading-relaxed">{q.question_text}</p>
              {q.image_url && <img src={q.image_url} alt="Question" className="mt-3 w-full max-h-48 object-cover rounded-xl border border-border" />}
              <div className="mt-3 flex items-center gap-2">
                <BookmarkButton
                  itemType="question"
                  questionId={q.id}
                  topicId={topicId}
                  subjectId={topic?.subject_id}
                  questionText={q.question_text}
                />
                <button
                  onClick={() => setReportingQuestion(q)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground border border-muted-foreground/30 px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <Flag className="w-3 h-3" /> Report
                </button>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {(q.options || []).map((opt) => {
                let style = "bg-card border-border";
                if (submitted) {
                  if (opt.label === q.correct_answer) style = "bg-green-500/10 border-green-500";
                  else if (opt.label === selected) style = "bg-red-500/10 border-red-500";
                } else if (selected === opt.label) {
                  style = "bg-primary/10 border-primary";
                }
                return (
                  <button
                    key={opt.label}
                    onClick={() => !submitted && setSelected(opt.label)}
                    className={`w-full text-left rounded-2xl p-4 border-2 transition-all flex items-center gap-3 ${style}`}
                  >
                    <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">{opt.label}</span>
                    <span className="text-sm font-medium text-foreground">{opt.text}</span>
                    {submitted && opt.label === q.correct_answer && <CheckCircle className="w-4 h-4 text-green-600 ml-auto flex-shrink-0" />}
                    {submitted && opt.label === selected && opt.label !== q.correct_answer && <XCircle className="w-4 h-4 text-red-500 ml-auto flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {submitted && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mt-4">
                <div className={`rounded-2xl p-4 ${selected === q.correct_answer ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
                  <p className="font-semibold text-sm mb-1">
                    {selected === q.correct_answer ? "✅ Correct!" : "❌ Incorrect"}
                  </p>
                  <p className="text-sm text-foreground/80">{q.explanation}</p>
                </div>

                {!isOffline && !aiExplanation && (
                  <button
                    onClick={getAiExplanation}
                    disabled={loadingExplanation}
                    className="w-full border-2 border-primary text-primary font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
                  >
                    {loadingExplanation
                      ? <><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />Getting AI explanation...</>
                      : <><Sparkles className="w-4 h-4" />AI Tutor Explain</>}
                  </button>
                )}

                {aiExplanation && (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">AI Tutor</p>
                    <p className="text-sm text-foreground"><strong>Why:</strong> {aiExplanation.why_wrong_or_right}</p>
                    <p className="text-sm text-foreground"><strong>Remember:</strong> {aiExplanation.memory_tip}</p>
                    <p className="text-sm text-primary font-medium">{aiExplanation.encouragement}</p>
                  </div>
                )}

                <button
                  onClick={next}
                  className="w-full bg-primary text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                  {current + 1 >= questions.length ? "Finish & See Results" : "Next Question"}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {!submitted && (
              <button
                onClick={handleSubmit}
                disabled={!selected}
                className="w-full mt-4 bg-orange-500 text-white font-semibold py-3 rounded-xl disabled:opacity-40"
              >
                Submit Answer
              </button>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {reportingQuestion && (
        <ReportQuestionModal
          question={reportingQuestion}
          topicId={topicId}
          userEmail={user?.email}
          onClose={() => setReportingQuestion(null)}
        />
      )}
    </div>
  );
}

function ResultScreen({ score, total, testName, topicId, subjectId, onRetake, onBackToTests }) {
  const pct = Math.round((score / total) * 100);
  const emoji = pct >= 80 ? "🎉" : pct >= 60 ? "👍" : "💪";
  const msg = pct >= 80 ? "Excellent work!" : pct >= 60 ? "Good effort!" : "Keep practising!";
  return (
    <div className="min-h-screen bg-background font-jakarta flex flex-col items-center justify-center px-6 py-12 text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6 w-full max-w-sm">
        <div className="text-6xl">{emoji}</div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">{testName}</p>
          <h1 className="text-3xl font-bold text-foreground">{score}/{total}</h1>
          <p className="text-xl font-semibold text-primary mt-1">{pct}%</p>
          <p className="text-muted-foreground mt-2">{msg}</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border w-full">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Score</span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="bg-muted rounded-full h-3">
            <div className="bg-primary rounded-full h-3 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="space-y-3 w-full">
          <button onClick={onRetake} className="w-full border-2 border-foreground text-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Retake This Test
          </button>
          <button onClick={onBackToTests} className="w-full bg-orange-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" /> Choose Another Test
          </button>
          <Link to={`/subject/${subjectId}`} className="block w-full bg-primary text-white font-semibold py-3 rounded-xl">
            Back to Topics
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
