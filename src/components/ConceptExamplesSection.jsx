import { useState } from "react";
import { ChevronDown, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ConceptExamplesSection({ examples }) {
  const [expandedConcept, setExpandedConcept] = useState(null);
  const [revealedSolutions, setRevealedSolutions] = useState(new Set());

  if (!examples || examples.length === 0) return null;

  const toggleSolution = (conceptIdx, exampleIdx) => {
    const key = `${conceptIdx}-${exampleIdx}`;
    setRevealedSolutions(prev => {
      const updated = new Set(prev);
      if (updated.has(key)) updated.delete(key);
      else updated.add(key);
      return updated;
    });
  };

  const difficultyColor = (diff) => {
    if (diff === "Easy") return "bg-green-100 text-green-700 border border-green-300";
    if (diff === "Medium" || diff === "Standard") return "bg-amber-100 text-amber-700 border border-amber-300";
    return "bg-red-100 text-red-700 border border-red-300";
  };

  const difficultyIcon = (diff) => {
    if (diff === "Easy") return "🟢";
    if (diff === "Medium" || diff === "Standard") return "🟡";
    return "🔴";
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-border">
      <div className="font-semibold text-foreground mb-3 flex items-center gap-2">
        📝 Practice Examples (Easy → Hard)
      </div>

      <div className="space-y-3">
        {examples.map((concept, conceptIdx) => (
          <div key={conceptIdx} className="border border-border rounded-xl overflow-hidden">
            {/* Concept Header */}
            <button
              onClick={() => setExpandedConcept(expandedConcept === conceptIdx ? null : conceptIdx)}
              className="w-full flex items-center justify-between p-3 bg-secondary/50 hover:bg-secondary transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{concept.concept}</span>
                <div className="flex gap-1">
                  {(concept.examples || []).map((ex, i) => (
                    <span key={i} className="text-[10px]">{difficultyIcon(ex.difficulty)}</span>
                  ))}
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${
                  expandedConcept === conceptIdx ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Examples */}
            <AnimatePresence>
              {expandedConcept === conceptIdx && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="divide-y divide-border"
                >
                  {(concept.examples || []).map((example, exIdx) => {
                    const solutionKey = `${conceptIdx}-${exIdx}`;
                    const isRevealed = revealedSolutions.has(solutionKey);

                    return (
                      <div key={exIdx} className="p-3 bg-white space-y-2">
                        {/* Difficulty Badge */}
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${difficultyColor(example.difficulty)}`}>
                            {difficultyIcon(example.difficulty)} {example.difficulty}
                          </span>
                        </div>

                        {/* Problem */}
                        <div className="bg-secondary/30 rounded-lg p-2.5 border border-border">
                          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-1">Problem</p>
                          <p className="text-sm text-foreground font-medium whitespace-pre-line">{example.problem}</p>
                        </div>

                        {/* Solution Toggle */}
                        <button
                          onClick={() => toggleSolution(conceptIdx, exIdx)}
                          className={`w-full text-xs font-semibold px-2.5 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                            isRevealed
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "border border-primary/30 text-primary hover:bg-primary/5"
                          }`}
                        >
                          {isRevealed ? <><CheckCircle className="w-3 h-3" /> Hide Solution</> : "👁 Show Solution"}
                        </button>

                        {/* Solution */}
                        <AnimatePresence>
                          {isRevealed && (
                            <motion.div
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              className="bg-green-50 border border-green-200 rounded-lg p-3"
                            >
                              <p className="text-xs font-semibold text-green-800 mb-1.5 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Step-by-Step Solution
                              </p>
                              <p className="text-sm text-green-800 whitespace-pre-line leading-relaxed">{example.solution}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}