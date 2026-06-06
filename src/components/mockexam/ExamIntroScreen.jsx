import { FileText, WifiOff } from "lucide-react";

export default function ExamIntroScreen({ selectedExam, examQuestions, onStart, onCancel }) {
  return (
    <div className="min-h-screen bg-background font-jakarta flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <FileText className="w-10 h-10 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">{selectedExam.title}</h1>
      <p className="text-muted-foreground mt-2">{selectedExam.grade}</p>

      <div className="mt-6 bg-card rounded-2xl p-4 border border-border w-full max-w-sm space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Questions</span>
          <span className="font-semibold">{examQuestions.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Time Limit</span>
          <span className="font-semibold">{selectedExam.duration_minutes} minutes</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Marks</span>
          <span className="font-semibold">{selectedExam.total_marks}</span>
        </div>
      </div>

      {selectedExam.instructions && (
        <p className="text-sm text-muted-foreground mt-4 max-w-sm">{selectedExam.instructions}</p>
      )}

      {examQuestions.length === 0 ? (
        <div className="mt-6 w-full max-w-sm bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4 text-center">
          <WifiOff className="w-6 h-6 text-orange-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-orange-600">Questions not available</p>
          <p className="text-xs text-orange-500 mt-1">
            {navigator.onLine
              ? "This exam has no questions linked yet. Please contact your admin."
              : "No cached questions found. Connect to the internet and try again."}
          </p>
          <button onClick={onCancel} className="mt-3 text-sm font-semibold text-orange-500 underline">Go back</button>
        </div>
      ) : (
        <button onClick={onStart} className="mt-6 w-full max-w-sm bg-primary text-white font-bold py-4 rounded-2xl text-lg">
          Start Exam ({examQuestions.length} questions)
        </button>
      )}
      <button onClick={onCancel} className="mt-3 text-muted-foreground text-sm">Cancel</button>
    </div>
  );
}