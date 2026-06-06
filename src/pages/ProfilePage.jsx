import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useTabState } from "@/hooks/useTabState";
import { base44 } from "@/api/base44Client";
import { User, LogOut, Mail, Shield, Trash2, AlertTriangle, Settings, HelpCircle, Gift, Phone, Save, Pencil } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import ShareModal from "@/components/ShareModal";
import SubscriptionStatusCard from "@/components/SubscriptionStatusCard";
import FontSizePicker from "@/components/FontSizePicker";

export default function ProfilePage() {
  const { user } = useAuth();
  const { scrollContainerRef } = useTabState('profile');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [parentName, setParentName] = useState(user?.parent_name || "");
  const [contactNumber, setContactNumber] = useState(user?.contact_number || "");
  const [savingContact, setSavingContact] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);

  const handleSaveContact = async () => {
    setSavingContact(true);
    await base44.auth.updateMe({ parent_name: parentName, contact_number: contactNumber, contact_updates_dismissed: true });
    setSavingContact(false);
    setContactSaved(true);
    setEditingContact(false);
    setTimeout(() => setContactSaved(false), 3000);
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    try {
      await base44.auth.logout();
    } catch {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-jakarta pb-24">
      <div ref={scrollContainerRef} className="overflow-y-auto" style={{ height: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-violet-700 text-white px-6 pb-10 text-center relative overflow-hidden" style={{ paddingTop: `max(3.5rem, env(safe-area-inset-top))` }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />
        <div className="absolute top-6 right-6 z-20">
          <ThemeToggle />
        </div>
        <div className="relative z-10">
          <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold">{user?.full_name || "Student"}</h1>
          <p className="text-white/70 text-sm mt-1">{user?.email}</p>
          {user?.role === "admin" && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold bg-white/20 px-3 py-1 rounded-full">
              <Shield className="w-3 h-3" /> Admin
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pt-4 space-y-4">
        {/* Subscription Status */}
        <SubscriptionStatusCard user={user} />

        {/* Font Size Picker */}
        <FontSizePicker />

        {/* Info Card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Email</p>
              <p className="text-sm font-semibold text-foreground">{user?.email}</p>
            </div>
          </div>
          <div className="border-t border-border px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Full Name</p>
              <p className="text-sm font-semibold text-foreground">{user?.full_name || "—"}</p>
            </div>
          </div>
          <div className="border-t border-border px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Role</p>
              <p className="text-sm font-semibold text-foreground capitalize">{user?.role || "Student"}</p>
            </div>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between border-b border-border">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />
              <div>
                <p className="font-semibold text-sm text-foreground">Parent Contact Info</p>
                <p className="text-[11px] text-muted-foreground">Optional — recommended</p>
              </div>
            </div>
            {!editingContact && (
              <button onClick={() => setEditingContact(true)} className="text-primary text-xs font-semibold flex items-center gap-1">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>

          {editingContact ? (
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Parent / Guardian Name</label>
                <input
                  value={parentName}
                  onChange={e => setParentName(e.target.value)}
                  placeholder="e.g. Mrs Moyo"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Contact Number (WhatsApp) <span className="font-normal text-muted-foreground/70">— optional</span>
                </label>
                <input
                  type="tel"
                  value={contactNumber}
                  onChange={e => setContactNumber(e.target.value)}
                  placeholder="e.g. +263 77 123 4567"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                />
              </div>
              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl px-3 py-2.5 text-xs text-violet-700 leading-relaxed">
                <p className="font-semibold mb-0.5">📣 Recommended</p>
                <p>Add a number to receive weekly updates on your child's progress and notifications about new notes, features and content. No spam — you can leave this blank.</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveContact}
                  disabled={savingContact || (!parentName.trim() && !contactNumber.trim())}
                  className="flex-1 bg-primary text-white text-sm font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  {savingContact ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
                <button onClick={() => setEditingContact(false)} className="flex-1 border border-border text-sm font-semibold py-2.5 rounded-xl text-muted-foreground">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              <div className="px-5 py-4">
                <p className="text-xs text-muted-foreground font-medium">Parent Name</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{user?.parent_name || <span className="text-muted-foreground italic">Not set</span>}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs text-muted-foreground font-medium">Contact Number</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{user?.contact_number || <span className="text-muted-foreground italic">Not set</span>}</p>
              </div>
              {contactSaved && (
                <div className="px-5 py-3 bg-green-500/10 text-green-600 text-xs font-semibold">✓ Contact info saved!</div>
              )}
            </div>
          )}
        </div>

        {/* Admin Panel Button */}
        {user?.role === "admin" && (
          <Link
            to="/admin"
            className="w-full flex items-center justify-center gap-3 bg-primary text-white font-semibold py-4 rounded-2xl hover:bg-primary/90 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Admin Panel
          </Link>
        )}

        {/* Parent Dashboard */}
        <Link
          to="/parent"
          className="w-full flex items-center justify-center gap-3 bg-card border border-border text-foreground font-semibold py-4 rounded-2xl hover:bg-secondary transition-colors"
        >
          <span className="text-lg">👨‍👩‍👧‍👦</span>
          Parent Dashboard
        </Link>

        {/* Referral Link */}
        <button
          onClick={() => setShowShareModal(true)}
          className="w-full flex items-center justify-center gap-3 bg-yellow-400/10 border border-yellow-400/40 text-yellow-700 font-semibold py-4 rounded-2xl hover:bg-yellow-400/20 transition-colors"
        >
          <Gift className="w-5 h-5" />
          Invite Friends & Earn Premium
        </button>

        {/* Help & Support */}
        <Link
          to="/help"
          className="w-full flex items-center justify-center gap-3 bg-card border border-border text-foreground font-semibold py-4 rounded-2xl hover:bg-secondary transition-colors"
        >
          <HelpCircle className="w-5 h-5 text-primary" />
          Help & Support
        </Link>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 bg-red-50 border border-red-200 text-red-600 font-semibold py-4 rounded-2xl hover:bg-red-100 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full flex items-center justify-center gap-3 text-muted-foreground py-3 rounded-2xl text-sm hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </button>
      </div>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="w-full bg-card rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom" style={{ paddingBottom: `max(1.5rem, env(safe-area-inset-bottom))` }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Delete Account</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-foreground">
              Deleting your account will permanently remove all your progress, results, and data. To confirm, type <strong>DELETE</strong> below.
            </p>
            <input
              type="text"
              placeholder="Type DELETE to confirm"
              value={deleteConfirmText}
              onChange={e => setDeleteConfirmText(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm"
              autoCapitalize="characters"
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                className="py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleting}
                className="py-3 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} appUrl={window.location.origin} />
    </div>
  );
}
