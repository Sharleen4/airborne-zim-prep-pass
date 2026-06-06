import { Download, Sparkles, ChevronRight, FileText, Share2 } from "lucide-react";
import BottomSheetSelect from "@/components/BottomSheetSelect";
import ShareModal from "@/components/ShareModal";
import SyncStatusBar from "@/components/SyncStatusBar";
import { useRef } from "react";
import { useTabState } from "@/hooks/useTabState";

export default function ExamListScreen({
  subjects, exams, completedExamIds, selectedSubjectId, setSelectedSubjectId,
  generating, startingExam, cachingExams, cachedExamCount,
  onGenerate, onStartExam, onCacheExams,
  showShareModal, setShowShareModal
}) {
  const { scrollContainerRef } = useTabState('exam');

  return (
    <div className="min-h-screen bg-background font-jakarta">
      <SyncStatusBar />
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} appUrl={window.location.origin} />

      {/* Fixed header */}
      <div className="bg-gradient-to-br from-primary to-violet-700 text-white px-6 pt-12 pb-16">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Mock Exams</h1>
            <p className="text-white/70 mt-1">Simulate real ZIMSEC exam conditions</p>
          </div>
          <button onClick={() => setShowShareModal(true)} className="bg-white text-primary px-3 py-2 rounded-lg font-semibold text-xs flex items-center gap-1 hover:bg-white/90 transition-colors flex-shrink-0">
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>
      </div>

      <div ref={scrollContainerRef} className="overflow-y-auto pb-24">
        <div className="px-6 -mt-6 pb-6 space-y-4">
          {/* Save Offline button */}
          <button
            onClick={onCacheExams}
            disabled={cachingExams}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm transition-all ${
              cachedExamCount > 0
                ? "bg-green-500/10 text-green-600 border border-green-500/30"
                : "bg-card text-primary border border-primary/30 shadow-sm"
            }`}
          >
            {cachingExams ? (
              <><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />Saving exams offline...</>
            ) : cachedExamCount > 0 ? (
              <>✓ {cachedExamCount} exam{cachedExamCount !== 1 ? "s" : ""} saved offline</>
            ) : (
              <><Download className="w-4 h-4" />Save Exams Offline</>
            )}
          </button>

          {/* Generate New Exam */}
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
            <p className="font-semibold text-foreground mb-3">Generate New Mock Exam</p>
            <BottomSheetSelect
              value={selectedSubjectId}
              onChange={setSelectedSubjectId}
              placeholder="Select a subject..."
              options={subjects.map(s => ({ value: s.id, label: `${s.name} — ${s.grade}` }))}
            />
            <button
              onClick={onGenerate}
              disabled={!selectedSubjectId || generating}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {generating
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating...</>
                : <><Sparkles className="w-4 h-4" />Generate & Start</>}
            </button>
          </div>

          {/* Existing Exams */}
          {exams.length > 0 && (
            <div>
              <p className="font-semibold text-foreground mb-3">Available Exams</p>
              <div className="space-y-3">
                {exams.map(exam => {
                  const done = completedExamIds.has(exam.id);
                  return (
                    <div key={exam.id} className={`rounded-2xl shadow-sm border flex items-center gap-4 p-4 hover:shadow-md transition-all ${done ? "bg-green-500/8 border-green-500/30" : "bg-card border-border"}`}>
                      <button
                        onClick={() => onStartExam(exam)}
                        disabled={startingExam}
                        className="flex items-center gap-4 flex-1 text-left disabled:opacity-60"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${done ? "bg-green-500/20 text-green-600" : "bg-primary/10 text-primary"}`}>
                          {exam.exam_number ? `#${exam.exam_number}` : <FileText className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground text-sm">{exam.title}</p>
                            {done && <span className="text-xs bg-green-500/15 text-green-600 font-semibold px-2 py-0.5 rounded-full">✓ Done</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">{exam.grade} · {exam.duration_minutes} min · {exam.total_marks} marks</p>
                        </div>
                        {startingExam
                          ? <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                          : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
