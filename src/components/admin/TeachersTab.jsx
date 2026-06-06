import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, DollarSign, CheckCircle, Clock, Copy, RefreshCw } from "lucide-react";

const EARNING_PER_SUB = 2;

export default function TeachersTab() {
  const [users, setUsers] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [copied, setCopied] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      base44.entities.User.list("-created_date", 200),
      base44.entities.TeacherEarning.list("-created_date", 500),
    ]).then(([u, e]) => {
      setUsers(u);
      setEarnings(e);
      setLoading(false);
    });
  }, []);

  const teachers = users.filter(u => u.role === "teacher");

  const makeTeacher = async (u) => {
    setUpdatingId(u.id);
    // Generate referral code if they don't have one
    const namePrefix = (u.full_name || "TCH").replace(/\s+/g, "").substring(0, 4).toUpperCase();
    const randomPart = Math.floor(10000 + Math.random() * 90000);
    const referral_code = u.referral_code || `${namePrefix}${randomPart}`;
    await base44.entities.User.update(u.id, { role: "teacher", referral_code });
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: "teacher", referral_code } : x));
    setUpdatingId(null);
  };

  const removeTeacher = async (u) => {
    if (!confirm(`Remove teacher status from ${u.full_name || u.email}?`)) return;
    setUpdatingId(u.id);
    await base44.entities.User.update(u.id, { role: "user" });
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, role: "user" } : x));
    setUpdatingId(null);
  };

  const markPaid = async (earning) => {
    setPayingId(earning.id);
    await base44.entities.TeacherEarning.update(earning.id, { payout_status: "paid" });
    setEarnings(prev => prev.map(e => e.id === earning.id ? { ...e, payout_status: "paid" } : e));
    setPayingId(null);
  };

  const copyLink = (code) => {
    const link = `${window.location.origin}/?tref=${code}`;
    navigator.clipboard.writeText(link);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const getTeacherEarnings = (email) => earnings.filter(e => e.teacher_email === email);
  const getTeacherTotal = (email) => getTeacherEarnings(email).reduce((s, e) => s + (e.amount_earned || 0), 0);
  const getTeacherPending = (email) => getTeacherEarnings(email).filter(e => e.payout_status === "pending").reduce((s, e) => s + (e.amount_earned || 0), 0);

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const totalEarnings = earnings.reduce((s, e) => s + (e.amount_earned || 0), 0);
  const totalPending  = earnings.filter(e => e.payout_status === "pending").reduce((s, e) => s + (e.amount_earned || 0), 0);

  return (
    <div className="space-y-5 pb-10">
      <div>
        <h2 className="text-lg font-bold text-foreground">Teacher Referral Partners</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Assign teacher roles, manage referral codes, and approve payouts.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <Users className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-extrabold text-foreground">{teachers.length}</p>
          <p className="text-xs text-muted-foreground">Teachers</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <DollarSign className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
          <p className="text-xl font-extrabold text-emerald-600">${totalEarnings.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total Earned</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 text-center">
          <Clock className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-xl font-extrabold text-amber-600">${totalPending.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Pending Payout</p>
        </div>
      </div>

      {/* Teachers list */}
      <div>
        <h3 className="font-bold text-sm text-foreground mb-2">Current Teachers ({teachers.length})</h3>
        {teachers.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No teachers yet. Promote users below.</p>
        ) : (
          <div className="space-y-3">
            {teachers.map(t => {
              const total   = getTeacherTotal(t.email);
              const pending = getTeacherPending(t.email);
              const refs    = getTeacherEarnings(t.email);
              const link    = t.referral_code ? `${window.location.origin}/?tref=${t.referral_code}` : null;
              return (
                <div key={t.id} className="bg-card border border-border rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center font-bold text-emerald-700 flex-shrink-0">
                      {(t.full_name || t.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{t.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.email}</p>
                    </div>
                    <button
                      onClick={() => removeTeacher(t)}
                      disabled={updatingId === t.id}
                      className="text-xs font-semibold border border-destructive/40 text-destructive px-2 py-1 rounded-lg hover:bg-destructive/5 disabled:opacity-40"
                    >
                      {updatingId === t.id ? "..." : "Remove"}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-secondary/50 rounded-xl py-1.5">
                      <p className="font-bold text-foreground">{refs.length}</p>
                      <p className="text-muted-foreground">Referrals</p>
                    </div>
                    <div className="bg-secondary/50 rounded-xl py-1.5">
                      <p className="font-bold text-emerald-600">${total.toFixed(2)}</p>
                      <p className="text-muted-foreground">Earned</p>
                    </div>
                    <div className="bg-secondary/50 rounded-xl py-1.5">
                      <p className="font-bold text-amber-600">${pending.toFixed(2)}</p>
                      <p className="text-muted-foreground">Pending</p>
                    </div>
                  </div>

                  {t.referral_code && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-secondary rounded-lg px-2 py-1.5 text-xs font-mono text-muted-foreground truncate">{link}</div>
                      <button
                        onClick={() => copyLink(t.referral_code)}
                        className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-primary border border-primary/30 px-2 py-1.5 rounded-lg hover:bg-primary/5"
                      >
                        {copied === t.referral_code ? <><CheckCircle className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                  )}

                  {/* Unpaid earnings */}
                  {refs.filter(e => e.payout_status === "pending").length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Pending Payouts</p>
                      {refs.filter(e => e.payout_status === "pending").map(e => (
                        <div key={e.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
                          <p className="text-xs text-amber-700 flex-1 truncate">{e.referred_user_email}</p>
                          <p className="text-xs font-bold text-amber-700">${e.amount_earned}</p>
                          <button
                            onClick={() => markPaid(e)}
                            disabled={payingId === e.id}
                            className="text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-lg disabled:opacity-40"
                          >
                            {payingId === e.id ? "..." : "Mark Paid"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Promote user to teacher */}
      <div>
        <h3 className="font-bold text-sm text-foreground mb-2">Promote User to Teacher</h3>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground mb-2"
        />
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {users.filter(u => u.role !== "teacher" && u.role !== "admin" && (
            !search.trim() ||
            (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
            (u.full_name || "").toLowerCase().includes(search.toLowerCase())
          )).map(u => (
            <div key={u.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground text-sm flex-shrink-0">
                {(u.full_name || u.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-foreground truncate">{u.full_name || "—"}</p>
                <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
              </div>
              <button
                onClick={() => makeTeacher(u)}
                disabled={updatingId === u.id}
                className="text-xs font-semibold bg-emerald-500 text-white px-3 py-1.5 rounded-xl disabled:opacity-40 flex-shrink-0"
              >
                {updatingId === u.id ? "..." : "Make Teacher"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}