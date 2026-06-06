import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, CheckCircle2, AlertCircle, Users, GraduationCap } from "lucide-react";

const GRADES = ["Grade 4", "Grade 5", "Grade 6", "Grade 7"];

export default function ClassJoinPage() {
  const { user, isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [cls, setCls] = useState(null);
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [children, setChildren] = useState([]);
  const [existingRequest, setExistingRequest] = useState(null);

  // Form state
  const [childId, setChildId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [grade, setGrade] = useState("");
  const [verified, setVerified] = useState(false);
  const [schoolVerified, setSchoolVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = (params.get("code") || "").trim().toUpperCase();
    setCode(c);
    if (!c) {
      setLoading(false);
      setError("This invitation link is missing a code.");
      return;
    }
    base44.entities.SchoolClass.filter({ invite_code: c, is_active: true }, "-created_date", 1)
      .then(list => {
        const found = list[0];
        if (!found) {
          setError("Invitation link is invalid or has expired.");
          return;
        }
        if (found.invite_active === false) {
          setError("This invitation link has been disabled by the teacher.");
          return;
        }
        setCls(found);
        setGrade(found.grade);
        // Fetch school name so the parent can confirm it before joining.
        if (found.school_id) {
          base44.entities.School.get(found.school_id)
            .then(s => setSchool(s))
            .catch(() => setSchool(null));
        }
      })
      .catch(e => setError(e.message || "Could not load invitation."))
      .finally(() => setLoading(false));
  }, []);

  // Load the parent's children + any existing request for this class
  useEffect(() => {
    if (!user || !cls) return;
    Promise.all([
      base44.entities.ChildProfile.filter({ parent_email: user.email, is_active: true }, "-created_date", 50),
      base44.entities.ClassJoinRequest.filter({ class_id: cls.id, parent_email: user.email }, "-created_date", 1),
    ]).then(([kids, requests]) => {
      setChildren(kids);
      if (requests[0] && requests[0].status === "pending") setExistingRequest(requests[0]);
      if (kids.length === 1) {
        setChildId(kids[0].id);
        setStudentName(kids[0].child_name || "");
        setGrade(kids[0].grade || cls.grade);
      }
    });
  }, [user, cls]);

  const handleChildPick = (id) => {
    setChildId(id);
    const k = children.find(c => c.id === id);
    if (k) {
      setStudentName(k.child_name || "");
      setGrade(k.grade || cls?.grade || "");
    }
  };

  const submit = async () => {
    setError("");
    if (!studentName.trim()) { setError("Please enter the student's full name."); return; }
    if (!grade) { setError("Please choose a grade."); return; }
    if (!verified) { setError("Please confirm the grade matches the class."); return; }
    if (!schoolVerified) { setError("Please confirm the school name is correct."); return; }
    setSubmitting(true);
    try {
      await base44.entities.ClassJoinRequest.create({
        class_id: cls.id,
        class_name: cls.name,
        school_id: cls.school_id,
        teacher_email: cls.teacher_email,
        invite_code: code,
        parent_email: user.email,
        parent_name: user.full_name || "",
        child_id: childId || undefined,
        student_name: studentName.trim(),
        student_email: user.email, // child uses parent's account by default
        grade,
        grade_verified: verified,
        status: "pending",
        description: `${studentName.trim()} → ${cls.name} (${grade})`,
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.message || "Could not submit your request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || isLoadingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-jakarta">
      <div className="bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 text-white px-5 pt-10 pb-6">
        <p className="text-white/70 text-xs">Class invitation</p>
        <h1 className="text-2xl font-extrabold mt-0.5">{cls?.name || "Join a class"}</h1>
        {cls && <p className="text-white/80 text-sm mt-1">{cls.grade} · Teacher invitation</p>}
        {school && <p className="text-white/90 text-sm mt-0.5 font-semibold">🏫 {school.name}</p>}
      </div>

      <div className="px-5 py-5 max-w-lg mx-auto space-y-4">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" /> <span>{error}</span>
          </div>
        )}

        {!cls ? null : !isAuthenticated ? (
          <div className="bg-card border border-border rounded-2xl p-5 text-center space-y-3">
            <Users className="w-10 h-10 mx-auto text-primary" />
            <p className="font-bold text-foreground">Sign in to join</p>
            <p className="text-sm text-muted-foreground">
              Sign in as the parent so we can link this request to your account.
            </p>
            <button
              onClick={() => navigateToLogin(window.location.href)}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm"
            >
              Sign in to continue
            </button>
          </div>
        ) : submitted ? (
          <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
            <p className="font-bold text-foreground">Request sent!</p>
            <p className="text-sm text-muted-foreground">
              The teacher will review your request. Once approved, {studentName} will see this class's exercises and reports.
            </p>
            <button onClick={() => navigate("/home")} className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm">
              Back to home
            </button>
          </div>
        ) : existingRequest ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-center space-y-2">
            <p className="font-bold text-amber-700">Request already pending</p>
            <p className="text-sm text-amber-700/80">
              You've already submitted a request for {existingRequest.student_name}. The teacher will review it soon.
            </p>
            <Link to="/home" className="inline-block mt-2 text-sm font-semibold text-amber-800 underline">Back to home</Link>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <p className="font-bold text-foreground">Add your child to {cls.name}</p>
            </div>

            {children.length > 0 && (
              <div>
                <label className="text-xs font-bold text-foreground block mb-1">Choose your child</label>
                <select
                  value={childId}
                  onChange={e => handleChildPick(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
                >
                  <option value="">Enter manually…</option>
                  {children.map(k => (
                    <option key={k.id} value={k.id}>{k.child_name} · {k.grade}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Student full name</label>
              <input
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                placeholder="e.g. Tendai Moyo"
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">Grade</label>
              <select
                value={grade}
                onChange={e => setGrade(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground"
              >
                <option value="">Choose grade…</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              {grade && cls.grade && grade !== cls.grade && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Heads up — this class is for {cls.grade}.
                </p>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Please confirm</p>

              <label className={`flex items-start gap-3 text-sm rounded-xl border-2 p-3 cursor-pointer transition-colors ${verified ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-secondary/40 hover:bg-secondary"}`}>
                <input
                  type="checkbox"
                  checked={verified}
                  onChange={e => setVerified(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-emerald-600 flex-shrink-0 cursor-pointer"
                />
                <span className="text-foreground">
                  I confirm my child's grade is <strong>{cls.grade}</strong> and matches this class.
                </span>
              </label>

              <label className={`flex items-start gap-3 text-sm rounded-xl border-2 p-3 cursor-pointer transition-colors ${schoolVerified ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-secondary/40 hover:bg-secondary"}`}>
                <input
                  type="checkbox"
                  checked={schoolVerified}
                  onChange={e => setSchoolVerified(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-emerald-600 flex-shrink-0 cursor-pointer"
                />
                <span className="text-foreground">
                  I confirm my child attends <strong>{school?.name || "this school"}</strong>.
                </span>
              </label>
            </div>

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? "Submitting…" : "Send request to teacher"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}