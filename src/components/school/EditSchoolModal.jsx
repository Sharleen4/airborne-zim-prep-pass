import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, X, Building2, Upload, Trash2 } from "lucide-react";

export default function EditSchoolModal({ school, onClose, onSaved }) {
  const [name, setName] = useState(school.name || "");
  const [city, setCity] = useState(school.city || "");
  const [phone, setPhone] = useState(school.contact_phone || "");
  const [contactPerson, setContactPerson] = useState(school.contact_person_name || "");
  const [jobTitle, setJobTitle] = useState(school.contact_person_job_title || "");
  const [totalStudents, setTotalStudents] = useState(school.total_students ?? "");
  const [address, setAddress] = useState(school.address || "");
  const [motto, setMotto] = useState(school.motto || "");
  const [logoUrl, setLogoUrl] = useState(school.logo_url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, etc.)");
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
      setLogoUrl(file_url);
    } catch (err) {
      setError(err.message || "Could not upload logo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isValid = name.trim() && phone.trim() && contactPerson.trim() && jobTitle.trim() && totalStudents !== "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setSaving(true);
    setError("");
    try {
      await base44.entities.School.update(school.id, {
        name: name.trim(),
        city: city.trim(),
        contact_phone: phone.trim(),
        contact_person_name: contactPerson.trim(),
        contact_person_job_title: jobTitle.trim(),
        total_students: Number(totalStudents) || 0,
        address: address.trim(),
        motto: motto.trim(),
        logo_url: logoUrl || "",
      });
      onSaved?.();
    } catch (err) {
      setError(err.message || "Could not update school");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-foreground">Edit School Details</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {/* Logo upload */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">School logo</label>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-xl border border-border bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="School logo" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 text-muted-foreground/50" />
                )}
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs px-3 py-2 rounded-xl disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? "Uploading..." : logoUrl ? "Replace logo" : "Upload logo"}
                </button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl("")}
                    className="inline-flex items-center justify-center gap-1 text-destructive text-[11px] font-semibold hover:bg-destructive/10 px-2 py-1 rounded-lg"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG or SVG. Max 5MB.</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">School name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Contact phone number *</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Contact person *</label>
              <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">Job title *</label>
              <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Total students *</label>
            <Input type="number" min="0" value={totalStudents} onChange={(e) => setTotalStudents(e.target.value)} required />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">City / Town</label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1 block">Motto</label>
            <Textarea value={motto} onChange={(e) => setMotto(e.target.value)} rows={2} />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-secondary text-foreground font-semibold py-3 rounded-xl text-sm">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !isValid}
              className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}