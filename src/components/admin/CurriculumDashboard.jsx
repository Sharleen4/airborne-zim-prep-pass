import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Upload, BookOpen, GraduationCap, Target, TrendingUp, Loader2, Compass } from "lucide-react";
import CurriculumBrowser from "./CurriculumBrowser";

export default function CurriculumDashboard() {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.CurriculumTopic.list("-view_count", 5000)
      .then(setTopics)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const totalSubjects = new Set(topics.map(t => t.subject)).size;
  const totalGrades = new Set(topics.map(t => t.grade)).size;
  const totalTopics = topics.length;
  const totalObjectives = topics.reduce((s, t) => s + (t.learning_objectives?.length || 0), 0);
  const mostViewed = [...topics].sort((a, b) => (b.view_count || 0) - (a.view_count || 0)).slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">Curriculum Management</h2>
        <div className="flex gap-2">
          <Link to="/curriculum-explorer" className="text-xs font-semibold px-3 py-2 rounded-xl border border-border bg-card flex items-center gap-1 hover:bg-secondary">
            <Compass className="w-3 h-3" /> Explorer
          </Link>
          <Link to="/curriculum-upload" className="text-xs font-semibold px-3 py-2 rounded-xl bg-primary text-white flex items-center gap-1">
            <Upload className="w-3 h-3" /> Upload CSV
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Subjects" value={totalSubjects} icon={<BookOpen className="w-4 h-4" />} color="bg-violet-500/10 text-violet-600" />
        <StatCard label="Grades" value={totalGrades} icon={<GraduationCap className="w-4 h-4" />} color="bg-emerald-500/10 text-emerald-600" />
        <StatCard label="Topics" value={totalTopics} icon={<BookOpen className="w-4 h-4" />} color="bg-amber-500/10 text-amber-600" />
        <StatCard label="Objectives" value={totalObjectives} icon={<Target className="w-4 h-4" />} color="bg-rose-500/10 text-rose-600" />
      </div>

      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-primary" />
          <p className="font-bold text-sm">Most Viewed Topics</p>
        </div>
        {mostViewed.length === 0 ? (
          <p className="text-sm text-muted-foreground">No topics yet. Upload a curriculum CSV to get started.</p>
        ) : (
          <div className="space-y-2">
            {mostViewed.map(t => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded-xl bg-secondary/40">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{t.topic}{t.subtopic ? ` — ${t.subtopic}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{t.subject} · {t.grade}</p>
                </div>
                <span className="text-xs font-bold text-primary flex-shrink-0">{t.view_count || 0} views</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <CurriculumBrowser topics={topics} onTopicsChange={setTopics} />
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-3">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
      <p className="text-2xl font-extrabold text-foreground mt-2">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}