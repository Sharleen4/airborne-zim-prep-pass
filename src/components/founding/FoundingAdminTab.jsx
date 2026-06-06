import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Save, ToggleLeft, ToggleRight, Loader2, CheckCircle } from "lucide-react";

export default function FoundingAdminTab() {
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [totalSlots, setTotalSlots] = useState(100);
  const [foundingSubscriptions, setFoundingSubscriptions] = useState([]);

  useEffect(() => {
    Promise.all([
      base44.entities.FoundingOffer.list(),
      base44.entities.Subscription.filter({ plan: "founding_2026" }),
    ]).then(([offers, subs]) => {
      const o = offers[0];
      setOffer(o || null);
      setTotalSlots(o?.total_slots || 100);
      setFoundingSubscriptions(subs);
      setLoading(false);
    });
  }, []);

  const saveOffer = async () => {
    setSaving(true);
    if (offer) {
      const updated = await base44.entities.FoundingOffer.update(offer.id, { total_slots: Number(totalSlots) });
      setOffer(updated);
    } else {
      const created = await base44.entities.FoundingOffer.create({ total_slots: Number(totalSlots), slots_used: 0, is_active: true, price_usd: 7 });
      setOffer(created);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleActive = async () => {
    if (!offer) return;
    const updated = await base44.entities.FoundingOffer.update(offer.id, { is_active: !offer.is_active });
    setOffer(updated);
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const slotsLeft = offer ? offer.total_slots - offer.slots_used : 100;
  const activeCount = foundingSubscriptions.filter(s => s.status === "active").length;
  const pendingCount = foundingSubscriptions.filter(s => s.status === "pending").length;

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h2 className="text-lg font-bold text-foreground">2026 Founding Students Offer</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Manage the limited founding student offer ($7 / full year).</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <Users className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-xl font-extrabold text-amber-600">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Confirmed</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-xl font-extrabold text-blue-600">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <Users className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-xl font-extrabold text-green-600">{slotsLeft}</p>
          <p className="text-xs text-muted-foreground">Slots Left</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm text-foreground">Offer Status</p>
            <p className="text-xs text-muted-foreground">
              {offer?.is_active ? "Active — visible to students" : "Inactive — hidden from students"}
            </p>
          </div>
          <button onClick={toggleActive} disabled={!offer}>
            {offer?.is_active
              ? <ToggleRight className="w-8 h-8 text-green-600" />
              : <ToggleLeft className="w-8 h-8 text-muted-foreground" />}
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">Total Slots Available</label>
          <p className="text-xs text-muted-foreground">
            Currently {offer?.slots_used || 0} used. Increase this number to allow more founding students.
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              value={totalSlots}
              onChange={e => setTotalSlots(e.target.value)}
              min={offer?.slots_used || 0}
              className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
            />
            <button
              onClick={saveOffer}
              disabled={saving}
              className="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "Saved!" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Founding subscribers */}
      <div>
        <h3 className="font-bold text-sm text-foreground mb-2">Founding Students ({activeCount} confirmed)</h3>
        {foundingSubscriptions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No founding students yet.</p>
        ) : (
          <div className="space-y-2">
            {foundingSubscriptions.map(s => (
              <div key={s.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center font-bold text-amber-700 text-sm flex-shrink-0">
                  🎓
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{s.user_email}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {s.start_date ? `Active until ${s.end_date}` : "Pending payment"}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}