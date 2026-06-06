import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isSchoolAdmin } from "@/lib/schoolRoles";
import { useActiveSchool } from "@/lib/useActiveSchool";
import SchoolAdminLayout from "@/components/school/SchoolAdminLayout";
import SchoolSwitcher from "@/components/school/SchoolSwitcher";
import {
  Building2,
  Upload,
  Trash2,
  LogOut,
  Loader2,
  User as UserIcon,
  Mail,
  Pencil,
  ChevronRight,
} from "lucide-react";

/**
 * Shared profile/settings page used by both school admins and teachers.
 * Shows: account info, school logo (admin can edit), logout, delete account.
 */
export default function SchoolProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const { schools, school, activeSchoolId, setActiveSchoolId, loading, reload: reloadSchools } = useActiveSchool(user);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  // A user can edit school details if their role grants admin access OR
  // their email is listed on the school's admin list (co-admins).
  const isAdminForSchool = !!school && !!user && (
    school.school_admin_email === user.email ||
    (school.co_admin_emails || []).includes(user.email)
  );
  const canEditSchool = (user ? isSchoolAdmin(user) : false) || isAdminForSchool;

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !school) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Logo must be smaller than 5MB.");
      return;
    }
    setError("");
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.School.update(school.id, { logo_url: file_url });
      await reloadSchools();
    } catch (err) {
      setError(err.message || "Could not upload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    if (!school?.logo_url) return;
    if (!confirm("Remove the school logo?")) return;
    setUploading(true);
    try {
      await base44.entities.School.update(school.id, { logo_url: "" });
      await reloadSchools();
    } catch (err) {
      setError(err.message || "Could not remove logo");
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  const content = (
    <div className="space-y-4">
      <SchoolSwitcher schools={schools} activeId={activeSchoolId} onChange={setActiveSchoolId} />
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-2xl p-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Account card */}
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Account</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                {(user.full_name || user.email || "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground truncate">{user.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {user.email}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Role: <span className="font-semibold">{user.role || "user"}</span>
                </p>
              </div>
            </div>
          </div>

          {/* School logo (admin can edit; teacher sees read-only) */}
          {school && (
            <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">School logo</p>
                {canEditSchool && (
                  <Link to="/school-admin" className="text-[11px] font-semibold text-primary inline-flex items-center gap-1">
                    Edit details <Pencil className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 h-20 rounded-xl border border-border bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                  {school.logo_url ? (
                    <img src={school.logo_url} alt="School logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 text-muted-foreground/50" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground truncate">{school.name}</p>
                  {school.city && <p className="text-xs text-muted-foreground truncate">{school.city}</p>}
                  {canEditSchool && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {uploading ? "Uploading..." : school.logo_url ? "Replace" : "Upload logo"}
                      </button>
                      {school.logo_url && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          disabled={uploading}
                          className="inline-flex items-center gap-1 text-destructive text-[11px] font-semibold hover:bg-destructive/10 px-2 py-1.5 rounded-lg"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      )}
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </div>
                  )}
                  {!canEditSchool && !school.logo_url && (
                    <p className="text-[11px] text-muted-foreground mt-1 italic">No logo set by school admin.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
            <Link to="/profile" className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40">
              <div className="flex items-center gap-3">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">My profile &amp; preferences</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
            <Link to="/help" className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40">
              <div className="flex items-center gap-3">
                <span className="text-base">❓</span>
                <span className="text-sm font-semibold text-foreground">Help &amp; support</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Link>
          </div>

          {/* Danger zone */}
          <div className="bg-card rounded-2xl border border-border divide-y divide-border overflow-hidden">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40 text-left"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Log out</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <Link
              to="/delete-account"
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-destructive/5 text-destructive"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-semibold">Delete my account</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-[11px] text-muted-foreground text-center pt-2">
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <span className="mx-1">·</span>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          </p>
        </>
      )}
    </div>
  );

  return (
    <SchoolAdminLayout
      title="School Profile"
      subtitle="School details &amp; settings"
      showBack
      logoUrl={school?.logo_url}
    >
      {content}
    </SchoolAdminLayout>
  );
}