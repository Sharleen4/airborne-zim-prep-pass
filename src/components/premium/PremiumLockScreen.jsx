import { Link } from "react-router-dom";
import { Lock, Star, Sparkles, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

// Full-screen "Premium topic" gate shown when a free-plan user opens a locked topic.
export default function PremiumLockScreen({ topicName, subjectId, backTo }) {
  return (
    <div className="min-h-screen bg-background font-jakarta">
      <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white px-6 pt-12 pb-10">
        <Link to={backTo || (subjectId ? `/subject/${subjectId}` : "/home")} className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-white/70 text-xs uppercase tracking-wide font-bold">Premium topic</p>
            <h1 className="text-xl font-bold leading-tight">{topicName || "This topic"}</h1>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl p-6 shadow-md border border-border space-y-4"
        >
          <div className="flex items-center justify-center gap-2 text-amber-500">
            <Sparkles className="w-5 h-5" />
            <Star className="w-6 h-6 fill-amber-500" />
            <Sparkles className="w-5 h-5" />
          </div>

          <div className="text-center">
            <h2 className="font-extrabold text-lg text-foreground">Unlock the full curriculum</h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              This topic is part of the Premium plan. Subscribe to unlock all subjects, all topics,
              full practice tests and personalised AI tutoring.
            </p>
          </div>

          <ul className="space-y-2 text-sm text-foreground bg-secondary/40 rounded-xl p-3">
            <li className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> All grade-level subjects & topics</li>
            <li className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> Unlimited practice tests</li>
            <li className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> AI tutor explanations</li>
            <li className="flex items-start gap-2"><span className="text-green-600 font-bold">✓</span> Mock exams & progress tracking</li>
          </ul>

          <Link
            to="/payment"
            className="block w-full bg-primary text-white font-bold py-3.5 rounded-xl text-center text-sm"
          >
            View Premium plans
          </Link>
          <Link
            to={backTo || (subjectId ? `/subject/${subjectId}` : "/home")}
            className="block w-full text-center text-sm font-semibold text-muted-foreground py-2"
          >
            Browse free topics instead
          </Link>
        </motion.div>
      </div>
    </div>
  );
}