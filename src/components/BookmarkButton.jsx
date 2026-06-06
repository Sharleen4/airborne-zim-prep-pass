import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { offlineDB } from "@/lib/offlineDB";

export default function BookmarkButton({ itemType, questionId, topicId, subjectId, questionText, notePreview }) {
  const { user } = useAuth();
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState(null);
  const [showReason, setShowReason] = useState(false);
  const [reason, setReason] = useState("struggling");

  useEffect(() => {
    if (!user) return;
    checkBookmarked();
  }, [user, questionId, topicId]);

  const checkBookmarked = async () => {
    if (!user) return;
    try {
      // Check cache first
      const cached = await offlineDB.getAll(offlineDB.STORES.bookmarks);
      const match = cached.find(b =>
        b.student_email === user.email &&
        b.item_type === itemType &&
        (itemType === "question" ? b.question_id === questionId : b.topic_id === topicId)
      );
      if (match) {
        setBookmarked(true);
        setBookmarkId(match.id);
        setReason(match.reason || "struggling");
        return;
      }
      // Fall back to network if not in cache
      if (navigator.onLine) {
        const query = itemType === "question"
          ? { student_email: user.email, item_type: "question", question_id: questionId }
          : { student_email: user.email, item_type: "note", topic_id: topicId };
        const existing = await base44.entities.Bookmark.filter(query);
        if (existing.length > 0) {
          setBookmarked(true);
          setBookmarkId(existing[0].id);
          setReason(existing[0].reason || "struggling");
          await offlineDB.putOne(offlineDB.STORES.bookmarks, existing[0]);
        }
      }
    } catch {}
  };

  const toggleBookmark = async (e) => {
    e.stopPropagation();
    if (!user) return;

    if (bookmarked && bookmarkId) {
      setBookmarked(false);
      setBookmarkId(null);
      setShowReason(false);
      await offlineDB.deleteOne(offlineDB.STORES.bookmarks, bookmarkId).catch(() => {});
      if (navigator.onLine) base44.entities.Bookmark.delete(bookmarkId).catch(() => {});
    } else {
      setShowReason(true);
    }
  };

  const saveBookmark = async () => {
    if (!user) return;
    try {
      const data = {
        student_email: user.email,
        item_type: itemType,
        topic_id: topicId,
        subject_id: subjectId,
        reason,
      };

      if (itemType === "question") {
        data.question_id = questionId;
        data.question_text = questionText;
      } else {
        data.note_preview = notePreview || "Note";
      }

      const saved = await base44.entities.Bookmark.create(data);
      await offlineDB.putOne(offlineDB.STORES.bookmarks, saved).catch(() => {});
      setBookmarked(true);
      setBookmarkId(saved.id);
      setShowReason(false);
    } catch {
      alert("Failed to save bookmark");
    }
  };

  return (
    <>
      <button
        onClick={toggleBookmark}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
          bookmarked
            ? "bg-purple-100 text-purple-700 border border-purple-300"
            : "border border-muted-foreground/30 text-muted-foreground hover:bg-secondary"
        }`}
        title={bookmarked ? "Remove bookmark" : "Add to bookmarks"}
      >
        <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? "fill-current" : ""}`} />
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </button>

      {showReason && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom" style={{ paddingBottom: `max(1.5rem, env(safe-area-inset-bottom))` }}>
            <h3 className="font-bold text-lg text-foreground">Why are you bookmarking this?</h3>
            <div className="space-y-2">
              {[
                { value: "struggling", label: "I'm struggling with this", emoji: "😓" },
                { value: "review_later", label: "Review later", emoji: "🔄" },
                { value: "important", label: "Important to remember", emoji: "⭐" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setReason(opt.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    reason === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <span className="text-lg">{opt.emoji}</span>
                  <span className="font-medium text-foreground">{opt.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={saveBookmark}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl"
            >
              Save Bookmark
            </button>
            <button
              onClick={() => setShowReason(false)}
              className="w-full text-muted-foreground font-semibold py-3 rounded-xl hover:bg-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}