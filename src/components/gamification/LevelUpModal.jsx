import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { celebrateBig } from "@/lib/celebrate";
import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";

/**
 * Global level-up modal. Listens for the "zama_level_up" custom event
 * dispatched by lib/celebrate.js → checkLevelUp().
 */
export default function LevelUpModal() {
  const [level, setLevel] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      setLevel(e.detail);
      // Big confetti burst on level up
      celebrateBig();
    };
    window.addEventListener("zama_level_up", handler);
    return () => window.removeEventListener("zama_level_up", handler);
  }, []);

  const close = () => setLevel(null);

  return (
    <AnimatePresence>
      {level && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 220 }}
            className="bg-card rounded-3xl p-8 max-w-sm w-full text-center relative shadow-2xl border-2 border-yellow-400/40"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/70"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
              className="text-7xl mb-3"
            >
              {level.emoji}
            </motion.div>

            <p className="text-xs font-bold uppercase tracking-widest text-yellow-500 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Level Up! <Sparkles className="w-3.5 h-3.5" />
            </p>
            <h2 className="text-3xl font-extrabold text-foreground mt-2">
              Level {level.level}
            </h2>
            <p className="text-lg font-bold text-primary mt-1">{level.title}</p>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              Amazing work! You've reached a new level. Keep going to unlock even more rewards. 🎉
            </p>

            <div className="mt-6 space-y-2">
              <Link
                to="/gamification"
                onClick={close}
                className="block w-full bg-primary text-white font-bold py-3 rounded-xl text-sm hover:bg-primary/90"
              >
                See my progress
              </Link>
              <button
                onClick={close}
                className="block w-full text-muted-foreground font-semibold py-2 text-sm hover:text-foreground"
              >
                Keep going
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}