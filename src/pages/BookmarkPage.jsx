import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useTabState } from "@/hooks/useTabState";
import { useOffline } from "@/lib/useOffline";
import { offlineDB } from "@/lib/offlineDB";
import { Bookmark, Trash2, BookOpen, HelpCircle, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BottomNav } from "./Home";
import SyncStatusBar from "@/components/SyncStatusBar";

export default function BookmarkPage() {
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const { scrollContainerRef } = useTabState('bookmark');
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [topics, setTopics] = useState({});

  useEffect(() => {
    if (!user) return;
    async function load() {
      // Load topics from cache immediately
      const cachedTopics = await offlineDB.getAll(offlineDB.STORES.topics);
      const topicMap = {};
      cachedTopics.forEach(t => topicMap[t.id] = t.name);
      setTopics(topicMap);

      // Load bookmarks from cache
      const cachedBookmarks = await offlineDB.getAll(offlineDB.STORES.bookmarks).catch(() => []);
      const userBookmarks = cachedBookmarks.filter(b => b.student_email === user.email)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      setBookmarks(userBookmarks);
      setLoading(false);

      // Refresh from network in background if online
      if (navigator.onLine) {
        try {
          const [bms, tps] = await Promise.all([
            base44.entities.Bookmark.filter({ student_email: user.email }, "-created_date", 100),
            base44.entities.Topic.list(),
          ]);
          // Cache bookmarks
          for (const b of bms) await offlineDB.putOne(offlineDB.STORES.bookmarks, b);
          setBookmarks(bms);
          const freshTopicMap = {};
          tps.forEach(t => freshTopicMap[t.id] = t.name);
          setTopics(freshTopicMap);
        } catch {}
      }
    }
    load();
  }, [user]);

  const deleteBookmark = async (id) => {
    setBookmarks(b => b.filter(x => x.id !== id));
    await offlineDB.deleteOne(offlineDB.STORES.bookmarks, id).catch(() => {});
    if (navigator.onLine) {
      base44.entities.Bookmark.delete(id).catch(() => {});
    }
  };

  const filtered = bookmarks.filter(b => {
    if (filter === "all") return true;
    return b.item_type === filter;
  });

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-jakarta pb-24">
      <SyncStatusBar />
      
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white px-6 pt-12 pb-10">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bookmark className="w-6 h-6" /> Bookmarks & Revision
        </h1>
        <p className="text-white/70 mt-1">Questions and notes you're reviewing</p>
        {isOffline && (
          <div className="mt-3 flex items-center gap-2 bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-xs font-medium">
            <WifiOff className="w-3.5 h-3.5" /> Offline — showing cached bookmarks
          </div>
        )}
      </div>

      <div ref={scrollContainerRef} className="overflow-y-auto" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="px-6 py-4 space-y-4">
          {/* Filter Tabs */}
          <div className="flex gap-2 sticky top-0 bg-background py-2 z-20">
            {[
              { value: "all", label: "All", count: bookmarks.length },
              { value: "question", label: "Questions", count: bookmarks.filter(b => b.item_type === "question").length },
              { value: "note", label: "Notes", count: bookmarks.filter(b => b.item_type === "note").length },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                  filter === f.value
                    ? "bg-primary text-white"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {f.label} {f.count > 0 && `(${f.count})`}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="bg-card rounded-2xl p-12 text-center border border-border">
              <Bookmark className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-semibold text-foreground">No bookmarks yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tap the bookmark icon on questions and notes to save them here for later review
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filtered.map((bm, idx) => (
                  <motion.div
                    key={bm.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link
                      to={bm.item_type === "question" ? `/practice/${bm.topic_id}` : `/notes/${bm.topic_id}`}
                      className="bg-card rounded-2xl p-4 border border-border hover:border-primary/30 hover:shadow-md transition-all block group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          bm.item_type === "question" ? "bg-orange-500/15" : "bg-blue-500/15"
                        }`}>
                          {bm.item_type === "question" ? (
                            <HelpCircle className="w-5 h-5 text-orange-600" />
                          ) : (
                            <BookOpen className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-sm text-foreground line-clamp-2">
                              {bm.question_text || bm.note_preview || "Bookmarked item"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="px-2 py-0.5 rounded-full bg-secondary">
                              {topics[bm.topic_id] || "Topic"}
                            </span>
                            {bm.reason && (
                              <span className="px-2 py-0.5 rounded-full bg-secondary capitalize">
                                {bm.reason.replace("_", " ")}
                              </span>
                            )}
                          </div>
                          {bm.notes && (
                            <p className="text-xs text-muted-foreground mt-2 italic">{bm.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            deleteBookmark(bm.id);
                          }}
                          className="flex-shrink-0 text-muted-foreground hover:text-destructive transition-colors mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <BottomNav active="bookmark" />
    </div>
  );
}