import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useActiveChild } from "@/lib/ActiveChildContext";
import { ArrowLeft, Plus, Trash2, User, CreditCard, CheckCircle, Clock, X, Pencil, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AssignHomeworkModal from "@/components/homework/AssignHomeworkModal";
import NotificationCenter from "@/components/parent/NotificationCenter";
import TrialBanner from "@/components/parent/TrialBanner";
import SchoolSection from "@/components/parent/SchoolSection";
import ChildProgressDashboard from "@/components/parent/ChildProgressDashboard";
import CreateStudyPlanModal from "@/components/studyplan/CreateStudyPlanModal";

const AVATARS = ["🧒", "👦", "👧", "🧒‍♂️", "🧒‍♀️", "😊", "🌟", "🎓", "📚", "🦁", "🐯", "🐬"];
const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const { reload: reloadActiveChild } = useActiveChild();
  const [children, setChildren] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [subStatus, setSubStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChild, setEditingChild] = useState(null);
  const [form, setForm] = useState({ child_name: "", grade: "Grade 7", avatar_emoji: "🧒" });
  const [saving, setSaving] = useState(false);
  const [homework, setHomework] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [parentProfile, setParentProfile] = useState(null);
  const [studyPlans, setStudyPlans] = useState([]);
  const [editingPlan, setEditingPlan] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [preselectedChild, setPreselectedChild] = useState(null);

  useEffect(() => {
    if (!user?.email) return;
    Promise.all([
      base44.entities.ChildProfile.filter({ parent_email: user.email }),
      base44.entities.Subscription.filter({ user_email: user.email }),
      base44.functions.invoke("checkSubscription", {}),
      base44.entities.HomeworkAssignment.filter({ parent_email: user.email }, "-created_date", 50),
      base44.entities.Subject.list(),
      base44.entities.ParentProfile.filter({ user_email: user.email }),
      base44.entities.StudyPlan.filter({ parent_email: user.email, status: "active" }, "-created_date", 50),
    ]).then(([kids, subs, statusRes, hw, subs2, parentProfiles, plans]) => {
      setChildren(kids.filter(k => k.is_active !== false));
      const activeSub = subs.find(s => s.status === "active") || subs[0] || null;
      setSubscription(activeSub);
      setSubStatus(statusRes.data);
      setHomework(hw);
      setSubjects(subs2);
      setParentProfile(parentProfiles[0] || null);
      setStudyPlans(plans || []);
      setLoading(false);
    });
  }, [user]);

  const resetForm = () => setForm({ child_name: "", grade: "Grade 7", avatar_emoji: "🧒" });

  const handleSave = async () => {
    if (!form.child_name.trim()) return;
    setSaving(true);
    if (editingChild) {
      await base44.entities.ChildProfile.update(editingChild.id, form);
      setChildren(prev => prev.map(c => c.id === editingChild.id ? { ...c, ...form } : c));
      setEditingChild(null);
    } else {
      const created = await base44.entities.ChildProfile.create({
        ...form,
        parent_email: user.email,
        is_active: true,
      });
      setChildren(prev => [...prev, created]);
    }
    // Refresh global active-child context so the child selector everywhere updates.
    try { await reloadActiveChild?.(); } catch {}
    resetForm();
    setShowAddForm(false);
    setSaving(false);
  };

  const handleDeleteRefresh = reloadActiveChild;

  const handleEdit = (child) => {
    setEditingChild(child);
    setForm({ child_name: child.child_name, grade: child.grade, avatar_emoji: child.avatar_emoji || "🧒" });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this child profile?")) return;
    await base44.entities.ChildProfile.update(id, { is_active: false });
    setChildren(prev => prev.filter(c => c.id !== id));
    try { await handleDeleteRefresh?.(); } catch {}
  };

  const subStatusColor = {
    active: "text-green-700 dark:text-green-300 bg-green-500/10 border-green-500/30",
    pending: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30",
    expired: "text-red-700 dark:text-red-300 bg-red-500/10 border-red-500/30",
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-jakarta pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-violet-700 text-white px-6 pt-12 pb-10">
        <Link to="/profile" className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="text-2xl font-extrabold">Parent Dashboard</h1>
        <p className="text-white/70 text-sm mt-1">Manage your children's profiles and subscription.</p>
      </div>

      <div className="px-6 -mt-4 space-y-4 pt-2">

        {/* Trial / Expiry Banner */}
        <TrialBanner subStatus={subStatus} isExpired={subStatus && !subStatus.active && !subStatus.isTrial} />

        {/* Subscription Card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Subscription</p>
              <p className="text-xs text-muted-foreground">Controls access for all child profiles</p>
            </div>
          </div>

          {subscription ? (
            <div className={`rounded-xl border px-4 py-3 space-y-2 ${subStatusColor[subscription.status] || subStatusColor.pending}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm capitalize">
                  {subscription.status === "active" ? <CheckCircle className="inline w-4 h-4 mr-1" /> : <Clock className="inline w-4 h-4 mr-1" />}
                  {subscription.plan?.replace("_", " ")} Plan — {subscription.status}
                </span>
              </div>
              {subscription.start_date && (
                <p className="text-xs">
                  Active: {new Date(subscription.start_date).toLocaleDateString()} → {new Date(subscription.end_date).toLocaleDateString()}
                </p>
              )}
              {subscription.amount_paid && (
                <p className="text-xs font-semibold">Paid: ${subscription.amount_paid}</p>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-700 dark:text-amber-300 text-sm">
              No active subscription. Subscribe to unlock access for your children.
            </div>
          )}

          <Link
            to="/payment"
            className="mt-3 w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-primary/90 transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            {subscription?.status === "active" ? "Manage Subscription" : "Subscribe Now"}
          </Link>
        </div>

        {/* Unified "My Progress" — one card per child merging the child profile
            with Performance, Homework, and Study Plan. */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" /> My Children ({children.length})
            </h2>
            {!showAddForm && (
              <button
                onClick={() => { resetForm(); setEditingChild(null); setShowAddForm(true); }}
                className="flex items-center gap-1.5 text-sm font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-xl hover:bg-primary/5"
              >
                <Plus className="w-4 h-4" /> Add Child
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground -mt-1">Tap a child to view progress, homework and study plan.</p>

          {/* Add/Edit Form */}
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl border border-primary/30 shadow-sm p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-sm text-foreground">{editingChild ? "Edit Profile" : "Add Child"}</p>
                <button onClick={() => { setShowAddForm(false); setEditingChild(null); resetForm(); }}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Avatar picker */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Avatar</p>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map(a => (
                    <button
                      key={a}
                      onClick={() => setForm(f => ({ ...f, avatar_emoji: a }))}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${form.avatar_emoji === a ? "bg-primary/15 border-2 border-primary scale-110" : "bg-secondary border border-border"}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Child's Name *</p>
                <input
                  value={form.child_name}
                  onChange={e => setForm(f => ({ ...f, child_name: e.target.value }))}
                  placeholder="e.g. Tendai"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground"
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Grade</p>
                <div className="grid grid-cols-4 gap-2">
                  {GRADES.map(g => (
                    <button
                      key={g}
                      onClick={() => setForm(f => ({ ...f, grade: g }))}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-colors ${form.grade === g ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-secondary"}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !form.child_name.trim()}
                className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                {editingChild ? "Save Changes" : "Add Child"}
              </button>
            </motion.div>
          )}

          {children.length === 0 && !showAddForm ? (
            <div className="text-center py-10 bg-card rounded-2xl border border-border text-muted-foreground">
              <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
              <p className="font-semibold text-sm">No child profiles yet</p>
              <p className="text-xs mt-1">Add your child to track their progress</p>
            </div>
          ) : (
            <div className="space-y-3">
              {children.map(child => (
                <ChildProgressDashboard
                  key={child.id}
                  child={child}
                  childProfiles={children}
                  subjects={subjects}
                  homework={homework}
                  studyPlans={studyPlans}
                  subStatus={subStatus}
                  onEditChild={handleEdit}
                  onDeleteChild={(c) => handleDelete(c.id)}
                  onAssignHomework={(c) => { setPreselectedChild(c); setShowAssignModal(true); }}
                  onCreateStudyPlan={(c) => { setPreselectedChild(c); setEditingPlan(null); setShowPlanModal(true); }}
                  onEditStudyPlan={(plan) => { setEditingPlan(plan); setPreselectedChild(null); setShowPlanModal(true); }}
                  onDeleteStudyPlan={async (plan) => {
                    if (!confirm(`Delete "${plan.name}"?`)) return;
                    await base44.entities.StudyPlan.update(plan.id, { status: "archived" });
                    setStudyPlans(prev => prev.filter(p => p.id !== plan.id));
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* School Section — only renders if the parent has children linked to a school */}
        <SchoolSection parentEmail={user.email} children={children} />

        {/* Notification Center */}
        {parentProfile && <NotificationCenter parentId={parentProfile.id} />}

        {/* Info note */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-xs text-blue-700 dark:text-blue-400">
          <p className="font-semibold mb-1">ℹ️ How it works</p>
          <p>One subscription covers access for all your child profiles. Subscribe once and all children on this account get full access to study materials, practice questions, and mock exams.</p>
        </div>

      </div>

      <AnimatePresence>
        {showAssignModal && (
          <AssignHomeworkModal
            parentEmail={user.email}
            children={children}
            preselectedChildId={preselectedChild?.id}
            onClose={() => { setShowAssignModal(false); setPreselectedChild(null); }}
            onAssigned={(hw) => setHomework(prev => [hw, ...prev])}
          />
        )}
        {showPlanModal && (
          <CreateStudyPlanModal
            parentEmail={user.email}
            children={children}
            existing={editingPlan}
            preselectedChildId={preselectedChild?.id}
            onClose={() => { setShowPlanModal(false); setEditingPlan(null); setPreselectedChild(null); }}
            onSaved={(saved) => {
              setStudyPlans(prev => {
                const exists = prev.find(p => p.id === saved.id);
                return exists ? prev.map(p => p.id === saved.id ? saved : p) : [saved, ...prev];
              });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}