import { Sparkles, PlayCircle, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

export default function PracticeTestSelector({ tests, onSelectTest, onGenerateNew, generating, topic }) {
  return (
    <div className="min-h-screen bg-background font-jakarta">
      <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white px-6 pt-12 pb-10">
        <h1 className="text-xl font-bold">Practice: {topic?.name}</h1>
        <p className="text-white/70 text-sm mt-1">Choose a test to start practising</p>
      </div>

      <div className="px-6 py-6 space-y-4">
        {tests.length > 0 && (
          <div className="space-y-3">
            {tests.map((test, i) => (
              <motion.button
                key={test.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelectTest(test)}
                className="w-full bg-card border border-border rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-orange-400 hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <span className="font-bold text-orange-500 text-sm">{test.test_number || i + 1}</span>
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{test.name}</p>
                    <p className="text-xs text-muted-foreground">{test.question_ids?.length || 10} questions</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-orange-500 border border-orange-300 bg-orange-50 px-2.5 py-1 rounded-xl flex items-center gap-1">
                    <PlayCircle className="w-3 h-3" /> Start
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {tests.length === 0 && (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="font-bold text-lg text-foreground mb-2">No practice tests yet</h2>
            <p className="text-muted-foreground text-sm mb-2">Generate your first test to start practising.</p>
          </div>
        )}

        <button
          onClick={onGenerateNew}
          disabled={generating}
          className="w-full bg-orange-500 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
        >
          {generating ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating Test {tests.length + 1}...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate Test {tests.length + 1}</>
          )}
        </button>
      </div>
    </div>
  );
}