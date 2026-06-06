import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, CalendarClock } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import CreateStudyPlanModal from "./CreateStudyPlanModal";
import StudyPlanCard from "./StudyPlanCard";

// Section rendered on the Parent Dashboard for managing study plans.
export default function StudyPlanSection({ parentEmail, children }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (!parentEmail) return;
    base44.entities.StudyPlan.filter({ parent_email: parentEmail, status: "active" }, "-created_date", 50)
      .then(res => { setPlans(res || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [parentEmail]);

  const handleSaved = (saved) => {
    setPlans(prev => {
      const exists = prev.find(p => p.id === saved.id);
      if (exists) return prev.map(p => p.id === saved.id ? saved : p);
      return [saved, ...prev];
    });
  };

  const handleDelete = async (plan) => {
    if (!confirm(`Delete "${plan.name}"?`)) return;
    await base44.entities.StudyPlan.update(plan.id, { status: "archived" });
    setPlans(prev => prev.filter(p => p.id !== plan.id));
  };

  const handleEdit = (plan) => { setEditing(plan); setShowModal(true); };
  const handleNew = () => { setEditing(null); setShowModal(true); };
  const handleClose = () => { setShowModal(false); setEditing(null); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-primary" /> Study Plans ({plans.length})
        </h2>
        <button
          onClick={handleNew}
          disabled={children.length === 0}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-xl hover:bg-primary/5 disabled:opacity-40"
        >
          <Plus className="w-4 h-4" /> Create Plan
        </button>
      </div>

      {loading ? (
        <div className="text-center py-6 text-muted-foreground text-sm">Loading...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-8 bg-card rounded-2xl border border-border text-muted-foreground">
          <CalendarClock className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-semibold text-sm">No study plans yet</p>
          <p className="text-xs mt-1">Create a weekly schedule with goals for each session</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => (
            <StudyPlanCard
              key={plan.id}
              plan={plan}
              childName={children.find(c => c.id === plan.child_id)?.child_name}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <CreateStudyPlanModal
            parentEmail={parentEmail}
            children={children}
            existing={editing}
            onClose={handleClose}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}