import { Link } from "react-router-dom";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpen, Zap, FileText, TrendingUp, CheckCircle, Star, Download, WifiOff, Wifi, Users, GraduationCap, UserCheck } from "lucide-react";
import { motion } from "framer-motion";

const FEATURES = [
{
  icon: <BookOpen className="w-6 h-6 text-primary" />,
  title: "Revision Notes",
  desc: "Instant study notes for every topic, written in simple language for Grade 4–7 students."
},
{
  icon: <Zap className="w-6 h-6 text-orange-500" />,
  title: "Daily Practice",
  desc: "Topic-by-topic practice questions aligned to the ZIMSEC curriculum."
},
{
  icon: <FileText className="w-6 h-6 text-blue-500" />,
  title: "Mock Exams",
  desc: "Full exam simulations under timed conditions to build confidence."
},
{
  icon: <TrendingUp className="w-6 h-6 text-accent" />,
  title: "Progress Tracking",
  desc: "Personalised insights showing strengths and areas that need revision."
}];


const SUBJECTS = ["Mathematics", "English", "Science", "Social Studies", "Shona", "Ndebele"];

export default function LandingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Referral params (?ref / ?tref) are captured at App module load — see App.jsx

  const handleSignIn = () => {
    base44.auth.redirectToLogin(window.location.origin + "/home");
  };

  return (
    <div className="min-h-screen bg-background font-jakarta">

      {/* Top Banner */}
      <div className="bg-yellow-300 text-violet-900 text-center text-sm font-bold px-4 py-2.5 shadow-sm">
        ✨ Use Zama AI to revise topics you are learning at school
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary via-violet-600 to-violet-800 text-white px-6 pt-16 pb-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 text-center max-w-sm mx-auto">
          <img
            src="https://media.base44.com/images/public/69ccd46e19848b833ca275ea/d9d9e2524_cfaaed950_ZamaAIFinalLogo.png"
            alt="Zama AI Primary Logo"
            className="w-28 h-28 mx-auto mb-4 rounded-2xl shadow-lg object-cover"
          />
          <h1 className="text-3xl font-extrabold leading-tight">
            <span className="text-yellow-300">Zama Ai Primary</span>
          </h1>
          <p className="text-yellow-200 font-semibold mt-1 text-sm">AI-powered ZIMSEC exam prep for Grade 4–7 students</p>
          <p className="text-white/75 mt-3 text-sm leading-relaxed">
            Zama AI Primary is an educational app designed for primary school students. It helps learners practice exam questions, improve understanding, and study effectively through interactive quizzes and AI-powered assistance.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white/10 rounded-xl px-2 py-2.5 text-center">
              <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-white/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              <p className="text-white/90 font-medium leading-snug">Parents assign homework</p>
            </div>
            <div className="bg-white/10 rounded-xl px-2 py-2.5 text-center">
              <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-white/20 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <p className="text-white/90 font-medium leading-snug">Kids learn</p>
            </div>
            <div className="bg-white/10 rounded-xl px-2 py-2.5 text-center">
              <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-white/20 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-white" />
              </div>
              <p className="text-white/90 font-medium leading-snug">Teachers create content</p>
            </div>
          </div>

          <div className="mt-7 space-y-3">
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full bg-white text-primary font-bold py-4 rounded-2xl text-base shadow-lg hover:bg-white/90 transition-colors">
              Get Started
            </button>

            <div className="flex items-center justify-center gap-3 text-sm">
              <Link to="/pricing" className="text-white font-semibold hover:underline">Pricing</Link>
              <span className="text-white/40">·</span>
              <Link to="/about" className="text-white font-semibold hover:underline">About</Link>
            </div>

            <p className="text-white/60 text-xs">7-day free trial · Full access · No credit card required</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-10 space-y-4 max-w-lg mx-auto">
        <h2 className="text-xl font-bold text-foreground text-center mb-6">Everything you need to prepare</h2>

        <div className="grid grid-cols-1 gap-4">
          {FEATURES.map((f, i) =>
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white rounded-2xl p-4 border border-border shadow-sm flex items-start gap-4">
            
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{f.title}</p>
                <p className="text-muted-foreground text-xs mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Subjects */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm mt-2">
          <p className="font-bold text-foreground text-sm mb-3">📚 Subjects Covered</p>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) =>
            <span key={s} className="bg-primary/8 text-primary text-xs font-semibold px-3 py-1 rounded-full border border-primary/20">
                {s}
              </span>
            )}
          </div>
        </div>

        {/* Trial callout */}
        <div className="bg-gradient-to-r from-accent to-emerald-500 rounded-2xl p-5 text-white shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-5 h-5" />
            <p className="font-bold">Free 7-Day Full Access Trial</p>
          </div>
          {[
          "Full access to all subjects & topics",
          "AI-generated notes & explanations",
          "Unlimited practice & mock exams",
          "Works offline after first download"].
          map((item) =>
          <div key={item} className="flex items-center gap-2 mt-2 text-sm text-white/90">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {item}
            </div>
          )}
          <button
            onClick={() => setShowAuthModal(true)}
            className="mt-5 w-full bg-white text-accent font-bold py-3 rounded-xl hover:bg-white/90 transition-colors">
            Start Free Trial
          </button>
        </div>



        {/* About Section */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <p className="font-bold text-foreground text-sm mb-2">ℹ️ About Zama Ai Primary</p>
          <p className="text-muted-foreground text-xs leading-relaxed">Zama Ai Primary is an educational platform designed to help Zimbabwean primary school students prepare for ZIMSEC exams through accessible digital tools. We provide  study notes, practice questions, timed mock exams, and personalised progress tracking  available online and some offline.

          </p>
        </div>

        {/* Contact Section */}
        <div className="bg-white rounded-2xl p-5 border border-border shadow-sm">
          <p className="font-bold text-foreground text-sm mb-3">📬 Contact Us</p>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <p>📧 <a href="mailto:support@zamaaiprimary.online" className="text-primary font-semibold hover:underline">support@zamaaiprimary.online</a></p>
            <p>📍 Location: Zimbabwe</p>
          </div>
        </div>

        {/* Explore Links */}
        <div className="bg-white rounded-2xl px-5 py-4 border border-border shadow-sm flex flex-col items-center gap-2 text-sm">
          <p className="text-muted-foreground text-xs font-medium">Explore</p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link to="/pricing" className="text-primary font-semibold hover:underline">Pricing</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/about" className="text-primary font-semibold hover:underline">About</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/help" className="text-primary font-semibold hover:underline">Help</Link>
          </div>
        </div>

        {/* Legal Links — prominently visible */}
        <div className="bg-secondary rounded-2xl px-5 py-4 flex flex-col items-center gap-2 text-sm">
          <p className="text-muted-foreground text-xs font-medium">Legal &amp; Privacy</p>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link to="/privacy-policy" className="text-primary font-semibold hover:underline">Privacy Policy</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/delete-account" className="text-primary font-semibold hover:underline">Delete Account</Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/terms" className="text-primary font-semibold hover:underline">Terms &amp; Conditions</Link>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1 pb-8 text-xs text-muted-foreground">
          <span>© 2026 Zama Ai Primary. All rights reserved.</span>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuthModal &&
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setShowAuthModal(false)}>
          <div
          className="w-full bg-white rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom"
          style={{ paddingBottom: `max(1.5rem, env(safe-area-inset-bottom))` }}
          onClick={(e) => e.stopPropagation()}>
          
            <div className="text-center mb-2">
              <div className="text-3xl mb-2">🎓</div>
              <h2 className="text-xl font-bold text-foreground">Welcome to Zama Ai Primary</h2>
              <p className="text-sm text-muted-foreground mt-1">Choose how you'd like to continue</p>
            </div>

            <button
            onClick={handleSignIn}
            className="w-full bg-primary text-white font-bold py-4 rounded-2xl text-base hover:bg-primary/90 transition-colors">
            
              📝 Register — Start Free Trial
            </button>

            <button
            onClick={handleSignIn}
            className="w-full border-2 border-primary text-primary font-bold py-4 rounded-2xl text-base hover:bg-primary/5 transition-colors">
            
              🔑 Login — I have an account
            </button>

            <p className="text-center text-xs text-muted-foreground">7-day free trial · Full access · No credit card required</p>

            <button
            onClick={() => setShowAuthModal(false)}
            className="w-full text-sm text-muted-foreground py-2 hover:text-foreground transition-colors">
            
              Cancel
            </button>
          </div>
        </div>
      }
    </div>);

}