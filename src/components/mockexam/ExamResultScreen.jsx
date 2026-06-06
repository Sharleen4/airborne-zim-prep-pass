import { useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, BookOpen } from "lucide-react";
import ExamReviewScreen from "./ExamReviewScreen";

export default function ExamResultScreen({ results, examQuestions, onTryAnother }) {
  const [showReview, setShowReview] = useState(false);
  const pct = results.percentage;

  if (showReview) {
    return (
      <ExamReviewScreen
        examQuestions={examQuestions || []}
        answerDetails={results.answerDetails || []}
        onBack={() => setShowReview(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background font-jakarta pb-24">
      <div className="bg-gradient-to-br from-primary to-violet-700 text-white px-6 pt-12 pb-10 text-center">
        <h1 className="text-2xl font-bold mb-1">Exam Complete!</h1>
        <p className="text-white/70">See how you did</p>
      </div>
      <div className="px-6 py-6 space-y-4">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border text-center">
          <div className="text-5xl mb-3">{pct >= 80 ? "🏆" : pct >= 60 ? "👍" : "💪"}</div>
          <p className="text-4xl font-bold text-foreground">{results.score}/{results.total}</p>
          <p className="text-2xl font-semibold text-primary mt-1">{pct}%</p>
          <p className="text-muted-foreground mt-2">
            {pct >= 80 ? "Outstanding performance!" : pct >= 60 ? "Good job! Keep improving." : "Keep practising — you've got this!"}
          </p>
        </div>
        {pct < 70 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
            <p className="font-semibold text-orange-600 mb-1">📚 Recommendation</p>
            <p className="text-sm text-orange-500">Review your notes and practise more questions on weak areas before your next attempt.</p>
          </div>
        )}
        <div className="space-y-3">
          <button onClick={() => setShowReview(true)} className="w-full bg-accent text-accent-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
            <BookOpen className="w-4 h-4" /> Review Answers
          </button>
          <button onClick={onTryAnother} className="w-full border-2 border-foreground text-foreground font-semibold py-3 rounded-xl flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Try Another Exam
          </button>
          <Link to="/home" className="block w-full bg-primary text-white font-semibold py-3 rounded-xl text-center">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
