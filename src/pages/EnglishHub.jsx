import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, Flame, Trophy, Star } from "lucide-react";
import SkillCard from "@/components/english/SkillCard";
import EnglishProgressBar from "@/components/english/EnglishProgressBar";

const SKILLS = [
  { key: "comprehension", title: "Comprehension", description: "Read passages & answer questions", icon: "📖", color: "bg-blue-100 text-blue-600" },
  { key: "composition", title: "Composition", description: "Write guided stories step by step", icon: "✍️", color: "bg-purple-100 text-purple-600" },
  { key: "grammar", title: "Grammar", description: "Nouns, verbs, tenses & punctuation", icon: "📝", color: "bg-green-100 text-green-600" },
  { key: "vocabulary", title: "Vocabulary", description: "Learn new words with flashcards", icon: "🔤", color: "bg-amber-100 text-amber-600" },
  { key: "synonyms", title: "Synonyms & Antonyms", description: "Match words with similar/opposite meaning", icon: "🔁", color: "bg-pink-100 text-pink-600" },
  { key: "similes", title: "Similes", description: "Spot 'as ... as' and 'like ...' phrases", icon: "🌟", color: "bg-yellow-100 text-yellow-600" },
  { key: "summary", title: "Summary Writing", description: "Pick the key points from a passage", icon: "📋", color: "bg-teal-100 text-teal-600" },
  { key: "letter_writing", title: "Letter Writing", description: "Arrange letter parts in order", icon: "✉️", color: "bg-indigo-100 text-indigo-600" },
  { key: "poetry", title: "Poetry", description: "Read short poems & answer questions", icon: "🎭", color: "bg-rose-100 text-rose-600" },
  { key: "sentence_construction", title: "Sentence Building", description: "Drag words to build correct sentences", icon: "🧩", color: "bg-cyan-100 text-cyan-600" },
];

export default function EnglishHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [grade, setGrade] = useState("Grade 7");
  const [counts, setCounts] = useState({});
  const [progress, setProgress] = useState({ xp: 0, streak: 0, badges: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Pull learning cards counts per skill for the chosen grade (lightweight)
      const cards = await base44.entities.LearningCard.filter({ grade, is_active: true }).catch(() => []);
      const map = {};
      cards.forEach(c => { map[c.skill] = (map[c.skill] || 0) + 1; });
      setCounts(map);

      // Pull this user's English progress
      const myProgress = await base44.entities.EnglishProgress.filter({ student_email: user.email }).catch(() => []);
      const xp = myProgress.reduce((s, p) => s + (p.xp_earned || 0), 0);
      const streak = Math.max(0, ...myProgress.map(p => p.streak_days || 0));
      const badges = new Set(myProgress.flatMap(p => p.badges || [])).size;
      setProgress({ xp, streak, badges });
      setLoading(false);
    };
    load();
  }, [user, grade]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-500 to-primary text-white px-5 pt-safe pb-5 rounded-b-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/80 text-sm mb-3">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-extrabold">English</h1>
        <p className="text-white/80 text-sm mt-0.5">Practice short, fun lessons every day.</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-white/15 rounded-xl py-2 text-center">
            <Flame className="w-4 h-4 mx-auto mb-0.5" />
            <p className="text-lg font-extrabold leading-none">{progress.streak}</p>
            <p className="text-[10px] text-white/80 mt-0.5">day streak</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2 text-center">
            <Star className="w-4 h-4 mx-auto mb-0.5" />
            <p className="text-lg font-extrabold leading-none">{progress.xp}</p>
            <p className="text-[10px] text-white/80 mt-0.5">XP</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2 text-center">
            <Trophy className="w-4 h-4 mx-auto mb-0.5" />
            <p className="text-lg font-extrabold leading-none">{progress.badges}</p>
            <p className="text-[10px] text-white/80 mt-0.5">badges</p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5">
        {/* Grade picker */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["Grade 4", "Grade 5", "Grade 6", "Grade 7"].map(g => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border whitespace-nowrap transition-colors ${
                grade === g ? "bg-primary text-white border-primary" : "border-border text-muted-foreground"
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        {/* Daily goal */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <p className="text-sm font-bold text-foreground">🎯 Today's Goal</p>
          <EnglishProgressBar label="Complete 5 cards" value={Math.min(5, progress.xp % 25 / 5)} max={5} color="bg-primary" />
          <p className="text-xs text-muted-foreground">Earn 25 XP today to keep your streak alive!</p>
        </div>

        {/* Skills grid */}
        <div>
          <p className="text-sm font-bold text-foreground mb-2">Pick a skill</p>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SKILLS.map(s => (
                <SkillCard
                  key={s.key}
                  icon={s.icon}
                  title={s.title}
                  description={s.description}
                  color={s.color}
                  count={counts[s.key] || 0}
                  to={`/english/skill/${s.key}?grade=${encodeURIComponent(grade)}`}
                />
              ))}
            </div>
          )}
        </div>

        <p className="text-[11px] text-center text-muted-foreground pt-2">
          Lessons are stored offline and reused — no extra data is used per question.
        </p>
      </div>
    </div>
  );
}