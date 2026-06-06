import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useActiveChild } from "@/lib/ActiveChildContext";
import { filterForActiveChild } from "@/lib/childScope";
import { WifiOff } from "lucide-react";
import { useOffline } from "@/lib/useOffline";
import { getCachedMockExams, getCachedExamQuestions, cacheAllMockExams, getCachedSubjects } from "@/lib/offlineCache";
import { queueResult } from "@/lib/syncManager";
import { loadStats, saveStats, XP_PER_MOCK_EXAM } from "@/lib/gamification";
import SyncStatusBar from "@/components/SyncStatusBar";
import ExamListScreen from "@/components/mockexam/ExamListScreen";
import ExamIntroScreen from "@/components/mockexam/ExamIntroScreen";
import ExamActiveScreen from "@/components/mockexam/ExamActiveScreen";
import ExamResultScreen from "@/components/mockexam/ExamResultScreen";
import PremiumGate from "@/components/premium/PremiumGate";

function shuffleOptions(question) {
  const labels = ["A", "B", "C", "D"];
  const correctText = question.options?.find(o => o.label === question.correct_answer)?.text;
  const shuffled = [...(question.options || [])].sort(() => Math.random() - 0.5);
  const remapped = shuffled.map((opt, i) => ({ label: labels[i], text: opt.text }));
  const newCorrect = remapped.find(o => o.text === correctText)?.label || question.correct_answer;
  return { ...question, options: remapped, correct_answer: newCorrect };
}

export default function MockExamPage() {
  return (
    <PremiumGate
      featureName="Mock Exams"
      featureMessage="Complete full ZIMSEC-style exams and receive instant marking. Upgrade for only $7 for the entire year."
    >
      <MockExamPageInner />
    </PremiumGate>
  );
}

function MockExamPageInner() {
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);
  const [completedExamIds, setCompletedExamIds] = useState(new Set());
  const [selectedExam, setSelectedExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [phase, setPhase] = useState('list');
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [results, setResults] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [cachingExams, setCachingExams] = useState(false);
  const [cachedExamCount, setCachedExamCount] = useState(0);
  const [startingExam, setStartingExam] = useState(false);
  const timerRef = useRef(null);
  const { user } = useAuth();
  const { activeChildId, childProfiles } = useActiveChild();
  const { isOffline } = useOffline();

  useEffect(() => {
    async function load() {
      const [subs, ex] = await Promise.all([getCachedSubjects(), getCachedMockExams()]);
      setSubjects(subs);
      setExams(ex);
      setLoading(false);
      if (navigator.onLine) {
        cacheAllMockExams().catch(() => {});
        if (user?.email) {
          try {
            const res = await base44.entities.StudentResult.filter({ student_email: user.email, session_type: "mock_exam" });
            const scoped = filterForActiveChild(res, activeChildId, childProfiles);
            setCompletedExamIds(new Set(scoped.map(r => r.mock_exam_id).filter(Boolean)));
          } catch {}
        }
      }
    }
    load();
  }, [user, activeChildId, childProfiles?.length]);

  useEffect(() => {
    if (phase === "exam" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { clearInterval(timerRef.current); submitExam(); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const handleCacheExams = async () => {
    setCachingExams(true);
    const count = await cacheAllMockExams();
    setCachedExamCount(count);
    setCachingExams(false);
    const ex = await getCachedMockExams();
    setExams(ex);
  };

  const generateMockExam = async () => {
    const subject = subjects.find(s => s.id === selectedSubjectId);
    if (!subject) return;
    setGenerating(true);
    const topics = await base44.entities.Topic.filter({ subject_id: selectedSubjectId, is_active: true });
    const topicNames = topics.map(t => t.name).join(", ");
    const existingQuestions = await base44.entities.Question.filter(
      { subject_id: selectedSubjectId, is_active: true, question_type: "mcq" }, "-created_date", 100
    );
    const TARGET = 20;
    let selectedQuestions = [];
    let newQuestionsNeeded = TARGET;
    if (existingQuestions.length >= TARGET) {
      selectedQuestions = [...existingQuestions].sort(() => Math.random() - 0.5).slice(0, TARGET);
      newQuestionsNeeded = 0;
    } else if (existingQuestions.length > 0) {
      selectedQuestions = [...existingQuestions].sort(() => Math.random() - 0.5);
      newQuestionsNeeded = TARGET - selectedQuestions.length;
    }
    let allQuestions = [...selectedQuestions];
    if (newQuestionsNeeded > 0) {
      const result = await base44.integrations.Core.InvokeLLM({
        model: "claude_opus_4_6",
        prompt: `You are a ZIMSEC exam paper designer for Grade 7 Zimbabwe students. Create ${newQuestionsNeeded} new MCQ questions for Subject: ${subject.name}, Topics: ${topicNames}. Rules: simple English, Zimbabwe contexts, spread answers across A/B/C/D, 40% Easy, 40% Standard, 20% Advanced. Return JSON with array "questions" each having question_text, options (4 objects with label and text), correct_answer (letter), explanation, difficulty.`,
        response_json_schema: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question_text: { type: "string" },
                  options: { type: "array", items: { type: "object" } },
                  correct_answer: { type: "string" },
                  explanation: { type: "string" },
                  difficulty: { type: "string" }
                }
              }
            }
          }
        }
      });
      for (const q of (result.questions || [])) {
        const saved = await base44.entities.Question.create({
          topic_id: topics[0]?.id || "",
          subject_id: selectedSubjectId,
          question_text: q.question_text,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty || "Standard",
          question_type: "mcq",
          marks: 1,
          is_active: true
        });
        allQuestions.push(saved);
      }
    }
    const exam = await base44.entities.MockExam.create({
      subject_id: selectedSubjectId,
      title: `${subject.name} Mock Exam`,
      grade: subject.grade,
      duration_minutes: 30,
      total_marks: allQuestions.length,
      question_ids: allQuestions.map(q => q.id),
      instructions: "Answer all questions. Choose the best answer for each multiple choice question.",
      is_active: true
    });
    setExams(e => [...e, exam]);
    setGenerating(false);
    startExam(exam, allQuestions.map(shuffleOptions));
  };

  const startExam = async (exam, qs) => {
    setStartingExam(true);
    let questions = qs && qs.length ? qs : [];
    if (!questions.length) {
      const idSet = new Set(exam.question_ids || []);
      if (navigator.onLine && idSet.size > 0) {
        try {
          const allQs = await base44.entities.Question.list("-created_date", 2000);
          questions = allQs.filter(q => idSet.has(q.id));
          if (questions.length > 0) {
            const { offlineDB } = await import("@/lib/offlineDB");
            await offlineDB.putMany(offlineDB.STORES.questions, questions);
          }
        } catch {}
      }
      if (!questions.length) {
        questions = await getCachedExamQuestions(exam);
      }
    }
    setSelectedExam(exam);
    setExamQuestions(questions.map(shuffleOptions));
    setTimeLeft((exam.duration_minutes || 30) * 60);
    setAnswers({});
    setStartingExam(false);
    setPhase("intro");
  };

  const submitExam = async () => {
    clearInterval(timerRef.current);
    let score = 0;
    const answerDetails = examQuestions.map((q, i) => {
      const selected = answers[i];
      const isCorrect = selected === (q.correct_answer || q.answer);
      if (isCorrect) score++;
      return { question_id: q.id || String(i), selected_answer: selected, is_correct: isCorrect };
    });
    const percentage = Math.round((score / examQuestions.length) * 100);
    const resultData = {
      student_email: user.email,
      child_id: activeChildId || undefined,
      subject_id: selectedExam?.subject_id,
      mock_exam_id: selectedExam?.id,
      session_type: "mock_exam",
      score,
      total: examQuestions.length,
      percentage,
      answers: answerDetails,
      weak_topics: percentage < 60 ? ["Needs revision"] : []
    };
    if (isOffline) {
      await queueResult(resultData);
    } else {
      const savedResult = await base44.entities.StudentResult.create(resultData);
      const { offlineDB } = await import("@/lib/offlineDB");
      await offlineDB.putOne(offlineDB.STORES.studentResults, savedResult || resultData);
    }
    setResults({ score, total: examQuestions.length, percentage, answerDetails });
    if (selectedExam?.id) setCompletedExamIds(s => new Set([...s, selectedExam.id]));
    if (user?.email) {
      const gStats = loadStats(user.email);
      gStats.mockExamsCompleted = (gStats.mockExamsCompleted || 0) + 1;
      gStats.totalXp = (gStats.totalXp || 0) + XP_PER_MOCK_EXAM;
      saveStats(user.email, gStats);
      window.dispatchEvent(new Event("zama_xp_updated"));
    }
    setPhase("result");
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <SyncStatusBar />
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (phase === "result" && results) {
    return <ExamResultScreen results={results} examQuestions={examQuestions} onTryAnother={() => { setPhase("list"); setResults(null); }} />;
  }

  if (phase === "exam" && examQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-background font-jakarta flex flex-col items-center justify-center px-6 text-center gap-4">
        <WifiOff className="w-12 h-12 text-orange-400" />
        <h2 className="font-bold text-lg text-foreground">Exam questions not loaded</h2>
        <p className="text-sm text-muted-foreground">Questions could not be loaded. Please try again.</p>
        <button onClick={() => setPhase("list")} className="bg-primary text-white font-semibold px-6 py-3 rounded-xl">Back to Exams</button>
      </div>
    );
  }

  if (phase === "exam") {
    return (
      <ExamActiveScreen
        examQuestions={examQuestions}
        answers={answers}
        setAnswers={setAnswers}
        timeLeft={timeLeft}
        onSubmit={submitExam}
        userEmail={user?.email}
        examTitle={selectedExam?.title}
      />
    );
  }

  if (phase === "intro" && selectedExam) {
    return (
      <ExamIntroScreen
        selectedExam={selectedExam}
        examQuestions={examQuestions}
        onStart={() => setPhase("exam")}
        onCancel={() => setPhase("list")}
      />
    );
  }

  return (
    <ExamListScreen
      subjects={subjects}
      exams={exams}
      completedExamIds={completedExamIds}
      selectedSubjectId={selectedSubjectId}
      setSelectedSubjectId={setSelectedSubjectId}
      generating={generating}
      startingExam={startingExam}
      cachingExams={cachingExams}
      cachedExamCount={cachedExamCount}
      onGenerate={generateMockExam}
      onStartExam={(exam) => startExam(exam, [])}
      onCacheExams={handleCacheExams}
      showShareModal={showShareModal}
      setShowShareModal={setShowShareModal}
    />
  );
}
