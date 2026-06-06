import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useTabState } from "@/hooks/useTabState";
import { BookOpen, Zap, FileText, TrendingUp, ChevronRight, Star, Share2, Gamepad2, ClipboardList, FileSearch, Download, X, Smartphone, Share, Trophy } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import ThemeToggle from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import ShareModal from "@/components/ShareModal";
import PullToRefresh from "@/components/PullToRefresh";
import { getCachedSubjects, getCachedResults, cacheAllSubjectData } from "@/lib/offlineCache";
import { useAuth } from "@/lib/AuthContext";
import { filterForActiveChild } from "@/lib/childScope";
import { backgroundCacheAll } from "@/lib/backgroundSync";
import GamifiedHomeView from "@/components/gamification/GamifiedHomeView";
import ContactReminderBanner from "@/components/ContactReminderBanner";
import FoundingOfferModal from "@/components/founding/FoundingOfferModal";
import InlineChildSwitcher from "@/components/child/InlineChildSwitcher";
import { useActiveChild } from "@/lib/ActiveChildContext";
import DailyGoalCard from "@/components/home/DailyGoalCard";
import DailyGoalTile from "@/components/home/DailyGoalTile";
import TodayStudyPlanCard from "@/components/studyplan/TodayStudyPlanCard";
import SchoolHomeworkCard from "@/components/home/SchoolHomeworkCard";
import ClassAnnouncementsCard from "@/components/home/ClassAnnouncementsCard";
import TrialExpiredBanner from "@/components/TrialExpiredBanner";

export default function Home() {
  const { user } = useAuth();
  const { activeChild, activeChildId, childProfiles } = useActiveChild();
  const { scrollContainerRef } = useTabState('home');
  const { installPrompt, isInstalled, isIOS, triggerInstall } = useInstallPrompt();
  const [subjects, setSubjects] = useState([]);
  const [recentResult, setRecentResult] = useState(null);
  const [dailyPracticeTopicId, setDailyPracticeTopicId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("zama_view_mode") || "normal");
  const [contactDismissed, setContactDismissed] = useState(false);
  const [showFoundingModal, setShowFoundingModal] = useState(false);

  const canShowDownload = !isInstalled;

  const handleDownloadClick = () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else if (installPrompt) {
      triggerInstall();
    } else {
      // Fallback for desktop / unsupported browsers — show iOS-style guide with generic instructions
      setShowIOSGuide(true);
    }
  };

  const toggleViewMode = () => {
    const next = viewMode === "normal" ? "gamified" : "normal";
    setViewMode(next);
    localStorage.setItem("zama_view_mode", next);
  };

  const load = useCallback(async () => {
    if (!user) return;
    let subs = [];
    try {
      // Always load from cache first for instant display
      const { offlineDB } = await import('@/lib/offlineDB');
      const [cachedSubs, cachedResults] = await Promise.all([
      offlineDB.getAll(offlineDB.STORES.subjects),
      user?.email ? offlineDB.getAll(offlineDB.STORES.studentResults) : Promise.resolve([])]
      );

      subs = cachedSubs.filter((s) => s.is_active !== false);
      setSubjects(subs);
      const userResults = filterForActiveChild(
        cachedResults.filter((r) => r.student_email === user.email),
        activeChildId,
        childProfiles
      ).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      if (userResults.length > 0) setRecentResult(userResults[0]);
      else setRecentResult(null);
      setLoading(false);

      // Then refresh from network silently in background (only if online)
      // Load daily practice topic from TopicProgress (scoped to the active child)
      if (user?.email) {
        try {
          const { offlineDB } = await import('@/lib/offlineDB');
          const allProgress = await offlineDB.getAll(offlineDB.STORES.topicProgress).catch(() => []);
          const userProgress = filterForActiveChild(
            allProgress.filter(p => p.student_email === user.email),
            activeChildId,
            childProfiles
          );
          const needsRevision = userProgress.filter(p => p.status === 'needs_revision');
          if (needsRevision.length > 0) {
            const pick = needsRevision[Math.floor(Math.random() * needsRevision.length)];
            setDailyPracticeTopicId(pick.topic_id);
          } else {
            const studied = userProgress.filter(p => p.status === 'studied');
            if (studied.length > 0) {
              const pick = studied[Math.floor(Math.random() * studied.length)];
              setDailyPracticeTopicId(pick.topic_id);
            }
          }
        } catch {}
      }

      if (navigator.onLine) {
        setTimeout(async () => {
          try {
            const [freshSubs, freshResults] = await Promise.all([
            getCachedSubjects().catch(() => null),
            user?.email ? getCachedResults(user.email).catch(() => null) : Promise.resolve(null)]
            );
            if (freshSubs?.length) setSubjects(freshSubs);
            if (freshResults?.length) {
              const scoped = filterForActiveChild(freshResults, activeChildId, childProfiles);
              setRecentResult(scoped[0] || null);
            }
          } catch {}
        }, 1500);
      }
    } catch (e) {
      console.warn('[Home] Load error:', e);
      setLoading(false);
    }
  }, [user, activeChildId, childProfiles?.length]);

  // Refresh subjects from the network whenever the active child changes,
  // so a freshly-added child sees subjects for their grade immediately.
  useEffect(() => {
    if (!user || !activeChildId) return;
    if (!navigator.onLine) return;
    getCachedSubjects()
      .then(fresh => { if (fresh?.length) setSubjects(fresh.filter(s => s.is_active !== false)); })
      .catch(() => {});
  }, [activeChildId, user]);

  useEffect(() => {
    if (!user) return;
    // Show founding modal once per session after 3s
    if (!sessionStorage.getItem("founding_modal_shown")) {
      setTimeout(() => {
        sessionStorage.setItem("founding_modal_shown", "1");
        setShowFoundingModal(true);
      }, 3000);
    }
    if (navigator.onLine) {
      try {base44.analytics.track({ eventName: "page_view", properties: { page: "home", user_email: user.email } });} catch {}
      // Record login for streak/inactivity tracking
      base44.functions.invoke("onUserLogin", {}).catch(() => {});
      // Record referral if user came via a referral link
      const referrer = localStorage.getItem("zama_referrer");
      if (referrer) {
        localStorage.removeItem("zama_referrer");
        base44.functions.invoke("recordReferral", { referrer_email: referrer }).catch(() => {});
      }
    }
    load();
  }, [user, activeChildId, childProfiles?.length]);

  const trialDaysLeft = window.__trialDaysLeft;

  const greetingTime = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>);


  return (
    <div className="min-h-screen bg-background font-jakarta">
      {showFoundingModal && <FoundingOfferModal onClose={() => setShowFoundingModal(false)} user={user} />}
      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} appUrl={window.location.origin} />
      
      {/* App Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-end">
          <div className="w-full bg-white dark:bg-card rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto" style={{ paddingBottom: `max(1.5rem, env(safe-area-inset-bottom))` }}>
            <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-card z-10">
              <h3 className="font-bold text-lg text-foreground">Add to Home Screen</h3>
              <button onClick={() => setShowIOSGuide(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Android Instructions */}
              <div className="space-y-3">
                <p className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <span className="text-lg">🤖</span> Android & Chrome
                </p>
                <p className="text-xs text-muted-foreground">Follow these steps to install Zamaai on Android:</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-secondary/50 rounded-2xl p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm flex-shrink-0">1</div>
                    <p className="text-sm text-foreground font-medium">Tap the menu button (⋮) in the top right corner</p>
                  </div>
                  <div className="flex items-start gap-3 bg-secondary/50 rounded-2xl p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm flex-shrink-0">2</div>
                    <p className="text-sm text-foreground font-medium">Select "Install app" or "Add to Home Screen"</p>
                  </div>
                  <div className="flex items-start gap-3 bg-secondary/50 rounded-2xl p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm flex-shrink-0">3</div>
                    <p className="text-sm text-foreground font-medium">Confirm — Zamaai will appear on your home screen!</p>
                  </div>
                </div>
              </div>

              {/* iOS Instructions */}
              <div className="space-y-3">
                <p className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <span className="text-lg">🍎</span> iPhone & iPad
                </p>
                <p className="text-xs text-muted-foreground">Follow these steps to install Zamaai on iOS:</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 bg-secondary/50 rounded-2xl p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm flex-shrink-0">1</div>
                    <div className="flex items-center gap-2">
                      <Share className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <p className="text-sm text-foreground font-medium">Tap Share at the bottom</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-secondary/50 rounded-2xl p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm flex-shrink-0">2</div>
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-primary flex-shrink-0" />
                      <p className="text-sm text-foreground font-medium">Scroll & tap "Add to Home Screen"</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-secondary/50 rounded-2xl p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm flex-shrink-0">3</div>
                    <p className="text-sm text-foreground font-medium">Tap "Add" — done!</p>
                  </div>
                </div>
              </div>
            </div>
            
            <button onClick={() => setShowIOSGuide(false)} className="w-full bg-primary text-white font-semibold py-3 rounded-xl">Got it!</button>
          </div>
        </div>
      )}
      {/* Pull-to-refresh wraps the scrollable content below the fixed header */}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-primary via-violet-600 to-violet-800 text-white px-6 pt-10 pb-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-white/60 text-xs font-medium tracking-wide">{greetingTime()} 👋</p>
                <h1 className="text-xl font-extrabold mt-0.5 leading-tight truncate">
                  {activeChild
                    ? `${activeChild.child_name?.split(" ")[0]}${activeChild.grade ? ` · ${activeChild.grade}` : ""}`
                    : (user?.full_name?.split(" ")[0] || "Student")}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white/70 text-xs mt-0.5">Revise and practice for exams</p>
                  <InlineChildSwitcher />
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {recentResult && (
                  <Link
                    to="/progress"
                    className="bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 rounded-full pl-2 pr-2.5 py-1 flex items-center gap-1.5 transition-colors"
                    title="Last session score"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-white/80" />
                    <span className="text-xs font-bold text-white">{recentResult.percentage}%</span>
                  </Link>
                )}
                <ThemeToggle />
              </div>
            </div>


            <div className="flex items-center gap-2">
              <button
                onClick={toggleViewMode}
                className={`flex-1 border px-3 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                  viewMode === "gamified"
                    ? "bg-yellow-400 border-yellow-300 text-yellow-900"
                    : "bg-white/15 hover:bg-white/25 border-white/20 text-white"
                }`}
                title="Toggle Gamified Mode"
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                {viewMode === "gamified" ? "Gamified" : "Normal"}
              </button>
              {canShowDownload && (
                <button
                  onClick={handleDownloadClick}
                  className="flex-1 bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  title="Download App"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download App
                </button>
              )}
              <button
                onClick={() => setShowShareModal(true)}
                className="flex-1 bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3 py-2 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
            </div>
          </div>

        </div>
      </div>

      <PullToRefresh onRefresh={load}>
      <div ref={scrollContainerRef} className="px-5 pt-5 pb-28 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)', WebkitOverflowScrolling: 'touch' }}>

        {viewMode === "gamified" ? (
          <GamifiedHomeView
            user={user}
            subjects={
              activeChild?.grade
                ? subjects.filter(s => s.grade === activeChild.grade)
                : (user?.role === "admin" ? subjects : [])
            }
            recentResult={recentResult}
            trialDaysLeft={trialDaysLeft}
            dailyPracticeTopicId={dailyPracticeTopicId}
          />
        ) : (
          <>
            {/* Contact reminder banner */}
            {!contactDismissed && (
              <ContactReminderBanner user={user} onDismiss={() => setContactDismissed(true)} />
            )}

            {/* Today's study plan sessions (if a parent has created one) */}
            {activeChild && (
              <TodayStudyPlanCard
                parentEmail={user?.email}
                childId={activeChild.id}
                childName={activeChild.child_name}
              />
            )}

            {/* Teacher announcements — only renders if child is linked to a class with posts */}
            {activeChild && (
              <ClassAnnouncementsCard activeChild={activeChild} userEmail={user?.email} />
            )}

            {/* Trial expired banner — shown instead of hard paywall */}
            <TrialExpiredBanner />

            {/* Trial banner */}
            {trialDaysLeft != null &&
              <Link to="/payment" className="block bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-2xl">⏳</span>
                <div className="flex-1">
                  <p className="font-bold text-amber-600 text-sm">Free trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left</p>
                  <p className="text-xs text-amber-500">Subscribe to keep full access after your trial ends.</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-500 flex-shrink-0" />
              </Link>
            }

            {/* Quick Actions — Row 1: 3 tiles */}
            <div className="grid grid-cols-3 gap-3">
              <Link to="/leaderboard" className="bg-card rounded-2xl p-3 shadow-md border border-border flex flex-col gap-2 hover:shadow-lg transition-all hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-xs text-foreground leading-tight">Leaderboard</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Top this week</p>
                </div>
              </Link>
              {activeChild ? (
                <DailyGoalTile
                  userEmail={user?.email}
                  childId={activeChild.id}
                  practiceTopicId={dailyPracticeTopicId}
                />
              ) : (
                <Link to={dailyPracticeTopicId ? `/practice/${dailyPracticeTopicId}` : "/practice"} className="bg-card rounded-2xl p-3 shadow-md border border-border flex flex-col gap-2 hover:shadow-lg transition-all hover:-translate-y-0.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-foreground leading-tight">Daily Practice</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{dailyPracticeTopicId ? "Resume topic" : "Choose topic"}</p>
                  </div>
                </Link>
              )}
              <Link to="/parent" className="bg-card rounded-2xl p-3 shadow-md border border-border flex flex-col gap-2 hover:shadow-lg transition-all hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm text-xl">
                  👨‍👩‍👧‍👦
                </div>
                <div>
                  <p className="font-bold text-xs text-foreground leading-tight">Parent Dashboard</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Manage children</p>
                </div>
              </Link>
            </div>

            {/* Teacher portal tile */}
            {user?.role === "teacher" && (
              <Link to="/teacher-dashboard" className="block bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl px-4 py-3 flex items-center gap-3 text-white shadow-md hover:shadow-lg transition-all">
                <span className="text-2xl">👩‍🏫</span>
                <div className="flex-1">
                  <p className="font-bold text-sm">Teacher Dashboard</p>
                  <p className="text-white/70 text-xs">View your referral link & earnings</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/70 flex-shrink-0" />
              </Link>
            )}

            {/* Quick Actions — Row 2: Homework + Progress */}
            <div className="grid grid-cols-2 gap-3">
              <Link to="/homework" className="bg-gradient-to-br from-violet-500 to-primary rounded-2xl p-4 text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">My Homework</p>
                  <p className="text-white/80 text-xs mt-0.5">School &amp; parent tasks</p>
                </div>
              </Link>
              <Link to="/progress" className="bg-gradient-to-br from-accent to-emerald-500 rounded-2xl p-4 text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 flex flex-col gap-2">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">My Progress</p>
                  <p className="text-white/80 text-xs mt-0.5">Strengths & weak areas</p>
                </div>
              </Link>
            </div>



            {/* Subjects — strictly filtered by the active child's grade.
                Admins see everything when no child is selected. */}
            {(() => {
              const isAdmin = user?.role === "admin";
              const gradeFilter = activeChild?.grade;
              // Non-admins MUST have an active child; otherwise show nothing (prevents grade leakage).
              const visibleSubjects = gradeFilter
                ? subjects.filter(s => s.grade === gradeFilter)
                : (isAdmin ? subjects : []);
              return (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-foreground">
                  {activeChild ? `${activeChild.child_name}'s subjects` : "My Subjects"}
                </h2>
                {visibleSubjects.length > 0 &&
                  <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">
                    {visibleSubjects.length} subject{visibleSubjects.length !== 1 ? "s" : ""}
                  </span>
                }
              </div>
              {visibleSubjects.length === 0 ? (
                <div className="text-center py-14 text-muted-foreground bg-card rounded-2xl border border-border shadow-sm">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-25" />
                  {!activeChild ? (
                    <>
                      <p className="font-semibold">Add a child to see subjects</p>
                      <p className="text-sm mt-1">Set up your child's grade in the Parent Dashboard to load their subjects.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">No subjects for {gradeFilter} yet</p>
                      <p className="text-sm mt-1">Check back soon — we're adding more.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {visibleSubjects.map((subject, i) =>
                    <motion.div key={subject.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Link to={`/subject/${subject.id}`} className="bg-card rounded-2xl px-4 py-3.5 shadow-sm border border-border flex items-center gap-4 hover:shadow-md hover:border-primary/30 transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center text-2xl flex-shrink-0">
                          {subject.icon || "📚"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground leading-snug">{subject.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{subject.grade}</p>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </Link>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
              );
            })()}
          </>
        )}

        {/* Footer links — inside scrollable area so they're reachable above BottomNav */}
        <div className="flex items-center justify-center gap-3 pt-6 pb-2 text-xs text-muted-foreground border-t border-border mt-4 flex-wrap">
          <Link to="/terms" className="hover:text-primary transition-colors">Terms &amp; Conditions</Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/delete-account" className="hover:text-primary transition-colors">Delete Account</Link>
        </div>
      </div>

      </PullToRefresh>
      <BottomNav active="home" />

      {/* Floating WhatsApp button */}
      <a
        href="https://wa.me/263786987358?text=Hi%20Zama%20Ai%20Primary%2C%20I%20need%20help%20with..."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-24 right-5 z-[200] w-14 h-14 bg-green-500 hover:bg-green-600 active:bg-green-700 rounded-full flex items-center justify-center transition-colors"
        style={{ boxShadow: '0 4px 20px rgba(37,211,102,0.6)' }}
        title="Chat with us on WhatsApp"
      >
        <svg viewBox="0 0 32 32" className="w-7 h-7 fill-white" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 .5C7.44.5.5 7.44.5 16c0 2.83.74 5.49 2.04 7.8L.5 31.5l7.94-2.08A15.46 15.46 0 0016 31.5C24.56 31.5 31.5 24.56 31.5 16S24.56.5 16 .5zm0 28.3a13.24 13.24 0 01-6.74-1.84l-.48-.29-4.71 1.23 1.26-4.6-.31-.5A13.3 13.3 0 012.7 16C2.7 9.16 8.16 3.7 16 3.7S29.3 9.16 29.3 16 23.84 28.8 16 28.8zm7.3-9.93c-.4-.2-2.36-1.16-2.73-1.3-.37-.13-.64-.2-.9.2-.27.4-1.03 1.3-1.27 1.57-.23.27-.46.3-.86.1-.4-.2-1.68-.62-3.2-1.97-1.18-1.05-1.98-2.35-2.21-2.75-.23-.4-.02-.62.17-.82.18-.18.4-.46.6-.7.2-.23.27-.4.4-.66.13-.27.07-.5-.03-.7-.1-.2-.9-2.17-1.24-2.97-.33-.78-.66-.67-.9-.68h-.77c-.27 0-.7.1-1.06.5-.37.4-1.4 1.37-1.4 3.34s1.43 3.87 1.63 4.14c.2.27 2.82 4.3 6.83 6.03.95.41 1.7.66 2.28.84.96.3 1.83.26 2.52.16.77-.11 2.36-.96 2.7-1.9.33-.93.33-1.72.23-1.9-.1-.17-.37-.27-.77-.47z"/>
        </svg>
      </a>
    </div>);

}

function BottomNav({ active }) {
  const { user } = useAuth();
  
  const links = [
  { to: "/home", label: "Home", icon: "🏠", key: "home" },
  { to: "/mock-exam", label: "Exam", icon: "📝", key: "exam" },
  { to: "/progress", label: "Progress", icon: "📊", key: "progress" },
  ...(user?.role === "admin" ? [{ to: "/flashcards", label: "Cards", icon: "🃏", key: "flashcards" }, { to: "/review-questions", label: "Review", icon: "✅", key: "review" }] : []),
  ...(user?.role === "teacher" ? [{ to: "/teacher-dashboard", label: "Earnings", icon: "💰", key: "teacher" }] : []),
  { to: "/profile", label: "Profile", icon: "👤", key: "profile" }];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 pt-2 pb-safe flex justify-around z-50" style={{ paddingBottom: `max(0.5rem, env(safe-area-inset-bottom))` }}>
      {links.map((l) =>
      <Link
        key={l.key}
        to={l.to}
        className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-colors ${active === l.key ? "text-primary" : "text-muted-foreground"}`}>
        
          <span className="text-xl">{l.icon}</span>
          <span className="text-[10px] font-medium">{l.label}</span>
        </Link>
      )}
    </div>);

}

export { BottomNav };