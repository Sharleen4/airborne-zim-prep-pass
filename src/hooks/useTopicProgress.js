import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useActiveChild } from "@/lib/ActiveChildContext";
import { filterForActiveChild, isLegacyOwnerChild } from "@/lib/childScope";

// Returns a map of topic_id -> TopicProgress record for the active child + subject.
// On multi-child plans, each child has their own progress.
export function useTopicProgress(studentEmail, subjectId) {
  const { activeChildId, childProfiles } = useActiveChild();
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentEmail || !subjectId) { setLoading(false); return; }
    base44.entities.TopicProgress.filter({ student_email: studentEmail, subject_id: subjectId })
      .then((records) => {
        const scoped = filterForActiveChild(records, activeChildId, childProfiles);
        const map = {};
        scoped.forEach((r) => { map[r.topic_id] = r; });
        setProgressMap(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [studentEmail, subjectId, activeChildId, childProfiles?.length]);

  // Only stamp child_id on new records. Legacy records (no child_id) belong to
  // the oldest child — updating them in place keeps that ownership stable.
  const childStamp = activeChildId ? { child_id: activeChildId } : {};
  const canOwnLegacy = isLegacyOwnerChild(activeChildId, childProfiles);

  const markStudied = async (topicId) => {
    const existing = progressMap[topicId];
    const today = new Date().toISOString().split("T")[0];
    // Treat as "existing" only if the record actually belongs to this child
    // (or it's legacy and we're the oldest child).
    const owns = existing && (existing.child_id === activeChildId || (!existing.child_id && canOwnLegacy));
    if (owns) {
      const updated = await base44.entities.TopicProgress.update(existing.id, {
        status: "studied",
        studied_date: today,
      });
      setProgressMap((m) => ({ ...m, [topicId]: updated }));
    } else {
      const created = await base44.entities.TopicProgress.create({
        student_email: studentEmail,
        topic_id: topicId,
        subject_id: subjectId,
        status: "studied",
        studied_date: today,
        ...childStamp,
      });
      setProgressMap((m) => ({ ...m, [topicId]: created }));
    }
  };

  const setNeedsRevision = async (topicId, score) => {
    const existing = progressMap[topicId];
    const owns = existing && (existing.child_id === activeChildId || (!existing.child_id && canOwnLegacy));
    if (owns) {
      const updated = await base44.entities.TopicProgress.update(existing.id, {
        status: "needs_revision",
        last_score: score,
      });
      setProgressMap((m) => ({ ...m, [topicId]: updated }));
    } else {
      const created = await base44.entities.TopicProgress.create({
        student_email: studentEmail,
        topic_id: topicId,
        subject_id: subjectId,
        status: "needs_revision",
        last_score: score,
        ...childStamp,
      });
      setProgressMap((m) => ({ ...m, [topicId]: created }));
    }
  };

  return { progressMap, loading, markStudied, setNeedsRevision };
}