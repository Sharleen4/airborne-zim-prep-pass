import { Link } from "react-router-dom";
import { ArrowLeft, Trash2, Mail, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import DeleteAccountButton from "@/components/account/DeleteAccountButton";

const SUPPORT_EMAIL = "support@zamaaiprimary.online";

const STEPS = [
  {
    title: "Cancel any active subscription",
    body: "If you're on a paid plan, cancel it first from your Profile page so you aren't billed again before deletion.",
  },
  {
    title: "Back up anything you want to keep",
    body: "Download or screenshot any progress reports, results or notes you'd like to keep — these will be permanently removed.",
  },
  {
    title: "Email us your deletion request",
    body: `Send an email from the address linked to your Zama Ai Primary account to ${SUPPORT_EMAIL} with the subject "Delete my account".`,
  },
  {
    title: "Confirm via email",
    body: "We'll reply with a confirmation email within 2 business days. Once you confirm, your account is queued for deletion.",
  },
  {
    title: "Account permanently deleted",
    body: "Within 7 business days of your confirmation, your Zama Ai Primary account and all related data will be permanently deleted.",
  },
];

const DATA_DELETED = [
  "Your parent account, login and profile",
  "All child profiles linked to your account",
  "Practice results, progress and topic mastery",
  "Bookmarks, homework assignments and submissions",
  "Notification preferences and settings",
];

const DATA_KEPT = [
  "Payment & billing records (kept for 5 years for tax/legal compliance, as required by Zimbabwean law)",
  "Anonymised, aggregated usage statistics (cannot be linked back to you)",
  "Email logs of our correspondence with you (kept for 12 months for support purposes)",
];

export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-background font-jakarta">
      <div className="max-w-2xl mx-auto px-4 py-6 safe-top">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Delete Your Zama Ai Primary Account</h1>
            <p className="text-sm text-muted-foreground">Permanently remove your account and personal data</p>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-6 rounded-2xl border border-amber-300/40 bg-amber-50 dark:bg-amber-500/10 p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold mb-1">This action is permanent</p>
            <p>Once your Zama Ai Primary account is deleted, your child profiles, progress, results and subscription details cannot be recovered.</p>
          </div>
        </div>

        {/* In-app delete — only renders for authenticated users */}
        <DeleteAccountButton />

        {/* Steps — prominently featured */}
        <div className="mt-6 bg-card rounded-2xl border-2 border-primary/20 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-md">Steps</span>
          </div>
          <h2 className="font-bold text-foreground text-lg mt-2 mb-4">How to request account deletion</h2>
          <ol className="space-y-4">
            {STEPS.map((step, i) => (
              <li key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="font-semibold text-foreground text-sm">{step.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20account`}
            className="mt-5 inline-flex items-center justify-center gap-2 bg-destructive text-white font-bold px-5 py-3 rounded-xl text-sm w-full"
          >
            <Mail className="w-4 h-4" />
            Email {SUPPORT_EMAIL}
          </a>
        </div>

        {/* Data deleted */}
        <div className="mt-6 bg-card rounded-2xl border border-border p-5">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            What gets permanently deleted
          </h2>
          <ul className="space-y-2">
            {DATA_DELETED.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-destructive mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Data kept */}
        <div className="mt-6 bg-card rounded-2xl border border-border p-5">
          <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-accent" />
            What we keep (and why)
          </h2>
          <ul className="space-y-2">
            {DATA_KEPT.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-accent mt-1">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Retention period */}
        <div className="mt-6 bg-secondary rounded-2xl p-5">
          <h2 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Retention period
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your personal account data is fully removed within <span className="font-semibold text-foreground">7 business days</span> after you confirm your deletion request. Backups containing your data are automatically purged within <span className="font-semibold text-foreground">30 days</span>. Billing records are retained for <span className="font-semibold text-foreground">5 years</span> as required by Zimbabwean tax and financial regulations.
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6 pb-safe">
          Need help instead? Visit the <Link to="/help" className="text-primary font-semibold">Help page</Link> or read our <Link to="/privacy-policy" className="text-primary font-semibold">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}