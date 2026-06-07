import React, { useEffect, lazy, Suspense } from 'react';
import { appParams } from '@/lib/app-params';
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import PageNotFound from './lib/PageNotFound';
import { base44 } from '@/api/base44Client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { ActiveChildProvider } from '@/lib/ActiveChildContext';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import ViewAsSwitcher from '@/components/ViewAsSwitcher';
import { useActiveChild } from '@/lib/ActiveChildContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import UpdatePrompt from '@/components/UpdatePrompt';
import LevelUpModal from '@/components/gamification/LevelUpModal';
import GlobalBottomNav from '@/components/GlobalBottomNav';
import ParentDashboardGate from '@/components/ParentDashboardGate';
import Home from './pages/Home';
import RoleHomeRedirect from './components/RoleHomeRedirect';
import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import InstallAppPage from './pages/InstallAppPage';
import SubjectPage from './pages/SubjectPage';
import NotesPage from './pages/NotesPage';
import MockExamPage from './pages/MockExamPage';
import PaymentPage from './pages/PaymentPage';
import PaymentReturnPage from './pages/PaymentReturnPage';
import ActivationPage from './pages/ActivationPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import HelpPage from './pages/HelpPage';
import ParentDashboardPage from './pages/ParentDashboardPage';
import HomeworkPage from './pages/HomeworkPage';
import ReviewQuestionsPage from './pages/ReviewQuestionsPage';
import ProfilePage from './pages/ProfilePage';
import OfflineContentPage from './pages/OfflineContentPage';
import FlashcardsPage from './pages/FlashcardsPage';
import ZimsecPapersPage from './pages/ZimsecPapersPage';
import DeleteAccountPage from './pages/DeleteAccount';
import LeaderboardPage from './pages/LeaderboardPage';
import SchoolAdminDashboard from './pages/SchoolAdminDashboard';
import SchoolAdminTeachers from './pages/SchoolAdminTeachers';
import SchoolAdminClasses from './pages/SchoolAdminClasses';
import SchoolAdminStudents from './pages/SchoolAdminStudents';
import SchoolAdminReports from './pages/SchoolAdminReports';
import SchoolProfilePage from './pages/SchoolProfilePage';
import TeacherProfilePage from './pages/TeacherProfilePage';
import TeacherHome from './pages/TeacherHome';
import TeacherClasses from './pages/TeacherClasses';
import TeacherClassDetail from './pages/TeacherClassDetail';
import TeacherHomework from './pages/TeacherHomework';
import TeacherHomeworkSubmissions from './pages/TeacherHomeworkSubmissions';
import TeacherReports from './pages/TeacherReports';
import TeacherTopicTrends from './pages/TeacherTopicTrends';
import TeacherLessons from './pages/TeacherLessons';
import TeacherSchedule from './pages/TeacherSchedule';
import ClassJoinPage from './pages/ClassJoinPage';
import SchoolHomeworkPage from './pages/SchoolHomeworkPage';
import CurriculumUpload from './pages/CurriculumUpload';
import CurriculumExplorer from './pages/CurriculumExplorer';
import { useSystemTheme } from './hooks/useSystemTheme';
import { useTheme } from './hooks/useTheme';
import { useFontSize } from './hooks/useFontSize';
import { backgroundCacheAll } from './lib/backgroundSync';
import { useSubscription } from './lib/useSubscription';

const InstallBanner = lazy(() => import('./components/InstallBanner'));
const PracticePage = lazy(() => import('./pages/PracticePage'));
const ProgressPage = lazy(() => import('./pages/ProgressPage'));
import AdminPage from './pages/AdminPage';
import TeacherDashboardPage from './pages/TeacherDashboardPage';
const BookmarkPage = lazy(() => import('./pages/BookmarkPage'));
const GamificationPage = lazy(() => import('./pages/GamificationPage'));
const EnglishHub = lazy(() => import('./pages/EnglishHub'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
}

const pageVariants = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
};

function PageTransition({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.12, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

// Lazy page wrappers to ensure they render inside Router context
const NotesPageWrapper = () => <NotesPage />;
const PracticePageWrapper = () => <PracticePage />;

const ProgressPageWrapper = () => <ProgressPage />;


function AnimatedRoutes() {
  const location = useLocation();
  const { user } = useAuth();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
        <Route path="/login" element={<Navigate to="/home" replace />} />
        <Route path="/pricing" element={<PageTransition><PricingPage /></PageTransition>} />
        <Route path="/about" element={<PageTransition><AboutPage /></PageTransition>} />
        <Route path="/install" element={<PageTransition><InstallAppPage /></PageTransition>} />
        <Route path="/home" element={<PageTransition><RoleHomeRedirect /></PageTransition>} />
        <Route path="/subject/:subjectId" element={<PageTransition><SubjectPage /></PageTransition>} />
        <Route path="/notes/:topicId" element={<PageTransition><Suspense fallback={<PageLoader />}><NotesPageWrapper /></Suspense></PageTransition>} />
        <Route path="/practice" element={<PageTransition><Suspense fallback={<PageLoader />}><PracticePageWrapper /></Suspense></PageTransition>} />
        <Route path="/practice/:topicId" element={<PageTransition><Suspense fallback={<PageLoader />}><PracticePageWrapper /></Suspense></PageTransition>} />
        <Route path="/mock-exam" element={<PageTransition><MockExamPage /></PageTransition>} />
        <Route path="/progress" element={<PageTransition><Suspense fallback={<PageLoader />}><ProgressPageWrapper /></Suspense></PageTransition>} />
        <Route path="/bookmarks" element={<PageTransition><Suspense fallback={<PageLoader />}><BookmarkPage /></Suspense></PageTransition>} />
        <Route path="/payment" element={<PageTransition><PaymentPage /></PageTransition>} />
        <Route path="/payment-return" element={<PageTransition><PaymentReturnPage /></PageTransition>} />
        <Route path="/activation" element={<PageTransition><ActivationPage /></PageTransition>} />
        <Route path="/terms" element={<PageTransition><TermsPage /></PageTransition>} />
        <Route path="/privacy" element={<PageTransition><PrivacyPage /></PageTransition>} />
        <Route path="/privacy-policy" element={<PageTransition><PrivacyPage /></PageTransition>} />
        <Route path="/gamification" element={<PageTransition><Suspense fallback={<PageLoader />}><GamificationPage /></Suspense></PageTransition>} />
        <Route path="/admin" element={<PageTransition><AdminPage /></PageTransition>} />
        <Route path="/teacher-dashboard" element={<PageTransition><TeacherDashboardPage /></PageTransition>} />
        <Route path="/help" element={<PageTransition><HelpPage /></PageTransition>} />
        <Route path="/parent" element={<PageTransition><ParentDashboardGate><ParentDashboardPage /></ParentDashboardGate></PageTransition>} />
        <Route path="/homework" element={<PageTransition><HomeworkPage /></PageTransition>} />
        <Route path="/review-questions" element={<PageTransition><ReviewQuestionsPage /></PageTransition>} />
        <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
        <Route path="/offline-content" element={<PageTransition><OfflineContentPage /></PageTransition>} />
        <Route path="/zimsec-papers" element={<PageTransition><ZimsecPapersPage /></PageTransition>} />
        <Route path="/delete-account" element={<PageTransition><DeleteAccountPage /></PageTransition>} />
        <Route path="/leaderboard" element={<PageTransition><LeaderboardPage /></PageTransition>} />
        <Route path="/english" element={<PageTransition><Suspense fallback={<PageLoader />}><EnglishHub /></Suspense></PageTransition>} />
        <Route path="/school-admin" element={<PageTransition><SchoolAdminDashboard /></PageTransition>} />
        <Route path="/school-admin/teachers" element={<PageTransition><SchoolAdminTeachers /></PageTransition>} />
        <Route path="/school-admin/classes" element={<PageTransition><SchoolAdminClasses /></PageTransition>} />
        <Route path="/school-admin/students" element={<PageTransition><SchoolAdminStudents /></PageTransition>} />
        <Route path="/school-admin/reports" element={<PageTransition><SchoolAdminReports /></PageTransition>} />
        <Route path="/school-admin/profile" element={<PageTransition><SchoolProfilePage /></PageTransition>} />
        <Route path="/teacher/profile" element={<PageTransition><TeacherProfilePage /></PageTransition>} />
        <Route path="/teacher" element={<PageTransition><TeacherHome /></PageTransition>} />
        <Route path="/teacher/classes" element={<PageTransition><TeacherClasses /></PageTransition>} />
        <Route path="/teacher/classes/:classId" element={<PageTransition><TeacherClassDetail /></PageTransition>} />
        <Route path="/teacher/homework" element={<PageTransition><TeacherHomework /></PageTransition>} />
        <Route path="/teacher/homework/:homeworkId/submissions" element={<PageTransition><TeacherHomeworkSubmissions /></PageTransition>} />
        <Route path="/teacher/reports" element={<PageTransition><TeacherReports /></PageTransition>} />
        <Route path="/teacher/topic-trends" element={<PageTransition><TeacherTopicTrends /></PageTransition>} />
        <Route path="/teacher/lessons" element={<PageTransition><TeacherLessons /></PageTransition>} />
        <Route path="/teacher/schedule" element={<PageTransition><TeacherSchedule /></PageTransition>} />
        <Route path="/class-join" element={<PageTransition><ClassJoinPage /></PageTransition>} />
        <Route path="/school-homework" element={<Navigate to="/homework?tab=school" replace />} />
        <Route path="/curriculum-upload" element={<PageTransition><CurriculumUpload /></PageTransition>} />
        <Route path="/curriculum-explorer" element={<PageTransition><CurriculumExplorer /></PageTransition>} />
        <Route path="/flashcards" element={<PageTransition>{user?.role === "admin" ? <FlashcardsPage /> : <Navigate to="/home" replace />}</PageTransition>} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const AuthenticatedApp = () => {
  useSystemTheme();
  useTheme(); // Initialize theme preference
  useFontSize(); // Initialize font size preference
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, isAuthenticated, user } = useAuth();

  // If the page is restored from the browser's back/forward cache (bfcache) AND
  // there is no auth token (i.e. the user has logged out), force a hard reload to
  // the landing page. Without this, pressing Back after logout shows the cached
  // private page until the next navigation.
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted && !appParams.token) {
        window.location.replace('/');
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);
  const subStatus = useSubscription(isAuthenticated ? user : null);
  const { childProfiles, loading: loadingChildren } = useActiveChild();

  // Silently pre-cache all content once user is authenticated and online
  useEffect(() => {
    if (!isAuthenticated || isLoadingAuth) return;

    // Run shortly after login to populate the cache
    const t = setTimeout(() => backgroundCacheAll(), 5000);

    // Re-run whenever the user comes back online (covers multiple offline visits)
    const handleOnline = () => backgroundCacheAll();
    window.addEventListener('online', handleOnline);

    return () => {
      clearTimeout(t);
      window.removeEventListener('online', handleOnline);
    };
  }, [isAuthenticated, isLoadingAuth]);

  const currentPath = window.location.pathname;
  const publicRoutes = ["/", "/login", "/pricing", "/about", "/install", "/terms", "/privacy", "/privacy-policy", "/class-join"];
  const isPublicRoute = publicRoutes.includes(currentPath);

  // Always show a loader until auth state is resolved
  if (isLoadingAuth || isLoadingPublicSettings) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect authenticated users away from the landing page to home (client-side, no reload)
  if (isPublicRoute && isAuthenticated && currentPath === "/") {
    return <Navigate to="/home" replace />;
  }

  // Show public routes for unauthenticated users
  if (isPublicRoute && !isAuthenticated) {
    return <AnimatedRoutes />;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      if (!isPublicRoute) { navigateToLogin(); return null; }
    }
  }

  // If not authenticated and not on a public route, redirect to login
  if (!isAuthenticated && !isPublicRoute) {
    base44.auth.redirectToLogin(window.location.href);
    return null;
  }

  // Show subscription gate — but allow /payment and /payment-return routes freely
  const isPaymentRoute = currentPath.startsWith("/payment");
  const isParentRoute = currentPath === "/parent";

  // First-time onboarding: any non-admin user who hasn't completed the onboarding
  // wizard sees it BEFORE the paywall. This guarantees brand-new users always get
  // the welcome / role-setup experience first, regardless of trial status.
  // Existing members (accounts created before the onboarding rollout) are NEVER
  // considered onboarding users — they go straight to the paywall flow.
  const ONBOARDING_ROLLOUT_DATE = new Date("2026-05-01T00:00:00Z");
  const isExistingMember = (() => {
    if (!user?.created_date) return false;
    const created = new Date(user.created_date);
    return !isNaN(created.getTime()) && created < ONBOARDING_ROLLOUT_DATE;
  })();

  const isParentLikeRole = !user?.role || user.role === "user" || user.role === "parent";
  const parentAlreadySetUp =
    isParentLikeRole &&
    !loadingChildren &&
    childProfiles.length > 0;

  const isOnboardingUser =
    user &&
    user.role !== "admin" &&
    !user.onboarding_completed &&
    !isExistingMember &&
    !parentAlreadySetUp;

  // While we're still resolving whether a parent-like user has children, hold off on
  // showing the paywall — otherwise existing users (who DO have children but no
  // onboarding flag yet) briefly see the wizard then get bounced to the payment page.
  const waitingForChildrenCheck = isParentLikeRole && loadingChildren && !user?.onboarding_completed;

  // Paywall gate: hold off while we're still resolving the user's onboarding/children state,
  // and ALWAYS let the onboarding wizard run first for brand-new users. The wizard itself
  // (latches open in its own effect) is what decides whether onboarding still needs to run.
  const onboardingMaybeNeeded =
    user &&
    user.role !== "admin" &&
    !user.onboarding_completed &&
    !isExistingMember;

  // Pass trial info via a global so pages can show trial banners
  if (subStatus?.isTrial) {
    window.__trialDaysLeft = subStatus.days_left;
    window.__trialEndDate = subStatus.trial_end_date;
  } else {
    delete window.__trialDaysLeft;
  }

  // Pass expired-trial info so pages can show a "choose plan" banner instead of a hard paywall
  const activationStatus = subStatus?.activation_status || subStatus?.status;
  window.__activationStatus = activationStatus || "loading";
  window.__trialExpired = activationStatus === "expired" || !!subStatus?.isExpired;
  if (subStatus?.isOfflineCached) {
    window.__offlineGraceDaysLeft = subStatus.offline_grace_days_left || 0;
  } else {
    delete window.__offlineGraceDaysLeft;
  }

  // Routes that should NOT trigger the onboarding wizard overlay (admin/payment/profile etc.)
  const skipOnboardingRoutes = ["/admin", "/payment", "/payment-return", "/activation", "/profile", "/teacher-dashboard", "/class-join"];
  const shouldShowOnboarding = !skipOnboardingRoutes.some(r => currentPath.startsWith(r)) && user?.role !== "admin";

  return (
    <>
      <AnimatedRoutes />
      {shouldShowOnboarding && <OnboardingWizard />}
      <GlobalBottomNav />
      <ViewAsSwitcher />
      <Suspense fallback={null}><InstallBanner /></Suspense>
    </>
  );
};

// Capture referral params (?tref=... for teachers, ?ref=... for friend-referrals)
// at module load — BEFORE any auth redirects — so the codes survive login flow.
(function captureReferralParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    const tref = params.get("tref");
    if (tref) localStorage.setItem("zama_teacher_referral", tref);
    const ref = params.get("ref");
    if (ref) localStorage.setItem("zama_referrer", ref);
  } catch {}
})();

function App() {
  return (
    <AuthProvider>
      <ActiveChildProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <AuthenticatedApp />
          </Router>
          <UpdatePrompt />
          <LevelUpModal />
          <Toaster />
        </QueryClientProvider>
      </ActiveChildProvider>
    </AuthProvider>
  );
}

export default App;
