import { useState } from "react";
import { Link } from "react-router-dom";
import { X, Bell } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ContactReminderBanner({ user, onDismiss }) {
  const [dismissing, setDismissing] = useState(false);

  // Don't show if already has contact number or dismissed
  if (!user || user.contact_number || user.contact_updates_dismissed) return null;

  const handleDismiss = async () => {
    setDismissing(true);
    await base44.auth.updateMe({ contact_updates_dismissed: true });
    onDismiss?.();
  };

  return (
    <div className="bg-violet-500/10 border border-violet-500/30 rounded-2xl px-4 py-3 flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Bell className="w-4 h-4 text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-violet-700">Stay in the loop! 📣 <span className="font-normal text-violet-500">(optional)</span></p>
        <p className="text-xs text-violet-600 mt-0.5">Add your parent's name & WhatsApp number to receive updates on your child's progress and notifications about new notes & features.</p>
        <Link
          to="/profile"
          className="inline-block mt-2 text-xs font-semibold text-white bg-violet-500 px-3 py-1.5 rounded-xl"
        >
          Add Contact Info →
        </Link>
      </div>
      <button
        onClick={handleDismiss}
        disabled={dismissing}
        className="text-violet-400 hover:text-violet-600 flex-shrink-0 transition-colors"
        title="Dismiss reminder"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}