import { useState } from "react";
import { X, Copy, Share2, Mail, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";

const PUBLIC_APP_URL = "https://www.zamaaiprimary.online";

export default function ShareModal({ isOpen, onClose, appUrl }) {
  // Always share the public domain, never the base44 preview URL
  appUrl = PUBLIC_APP_URL;
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareSocial = (platform) => {
    const text = "Join Zama Ai Primary - Study smarter for your exams! 📚";
    const encodedUrl = encodeURIComponent(appUrl);
    const encodedText = encodeURIComponent(text);
    let url = "";

    if (platform === "facebook") {
      url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    } else if (platform === "twitter") {
      url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
    } else if (platform === "whatsapp") {
      url = `https://wa.me/263786987358?text=${encodedText}%20${encodedUrl}`;
    }

    window.open(url, "_blank", "width=600,height=400");
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      setMessage("Please enter an email address");
      return;
    }
    setInviting(true);
    setMessage("");

    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      setMessage(`✓ Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setInviting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-50">
      <div className="w-full bg-card rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Share Zama Ai Primary</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Copy Link */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">📋 Copy Link</p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-muted"
              />
              <button
                onClick={handleCopyLink}
                className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-colors"
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3">📱 Share on Social Media</p>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleShareSocial("facebook")}
                className="bg-blue-100 text-blue-700 py-3 rounded-xl font-semibold text-sm hover:bg-blue-200 transition-colors"
              >
                Facebook
              </button>
              <button
                onClick={() => handleShareSocial("twitter")}
                className="bg-sky-100 text-sky-700 py-3 rounded-xl font-semibold text-sm hover:bg-sky-200 transition-colors"
              >
                Twitter
              </button>
              <button
                onClick={() => handleShareSocial("whatsapp")}
                className="bg-green-100 text-green-700 py-3 rounded-xl font-semibold text-sm hover:bg-green-200 transition-colors"
              >
                WhatsApp
              </button>
            </div>
          </div>

          {/* Invite by Email */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Invite via Email
            </p>
            <div className="space-y-2">
              <input
                type="email"
                placeholder="friend@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm disabled:opacity-50"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                disabled={inviting}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="user">As Student</option>
                <option value="admin">As Admin</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail.trim()}
                className="w-full bg-primary text-white py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                {inviting ? "Sending..." : "Send Invite"}
              </button>
              {message && (
                <p className={`text-xs ${message.includes("Error") ? "text-red-600" : "text-green-600"}`}>
                  {message}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full border border-border py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:bg-secondary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}