import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, BookOpen, Heart, Globe2, ShieldCheck, Users, GraduationCap, Sparkles, Mail } from "lucide-react";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";

const VALUES = [
  {
    icon: <Heart className="w-5 h-5 text-rose-500" />,
    title: "Built for Zimbabwean learners",
    desc: "Every lesson, example, and exercise is grounded in the local ZIMSEC Heritage-Based Curriculum.",
  },
  {
    icon: <Globe2 className="w-5 h-5 text-emerald-600" />,
    title: "Works where you are",
    desc: "Designed for low-bandwidth conditions so learning never stops — even on slow connections.",
  },
  {
    icon: <ShieldCheck className="w-5 h-5 text-blue-600" />,
    title: "Safe and private",
    desc: "Children's accounts are protected. Parents control profiles and we never share personal data.",
  },
  {
    icon: <Sparkles className="w-5 h-5 text-amber-500" />,
    title: "Powered by AI, guided by teachers",
    desc: "AI helps generate lesson plans, notes, and practice — but our curriculum follows what teachers actually teach.",
  },
];

const AUDIENCES = [
  {
    icon: <Users className="w-5 h-5 text-primary" />,
    title: "Parents",
    desc: "Assign homework, track progress, and support your child's learning at home with weekly insights.",
  },
  {
    icon: <GraduationCap className="w-5 h-5 text-violet-600" />,
    title: "Students",
    desc: "Practice topic-by-topic, take mock exams, and revise with AI-generated notes — at your own pace.",
  },
  {
    icon: <BookOpen className="w-5 h-5 text-emerald-600" />,
    title: "Teachers & Schools",
    desc: "Manage classes, set homework, generate lesson plans, and monitor class-wide performance.",
  },
];

export default function AboutPage() {
  const handleSignIn = () => {
    base44.auth.redirectToLogin(window.location.origin + "/home");
  };

  return (
    <div className="min-h-screen bg-background font-jakarta">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-violet-600 to-violet-800 text-white px-6 pt-10 pb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-white/80 text-sm mb-4 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <img
            src="https://media.base44.com/images/public/69ccd46e19848b833ca275ea/d9d9e2524_cfaaed950_ZamaAIFinalLogo.png"
            alt="Zama AI Primary"
            className="w-16 h-16 rounded-2xl shadow-lg object-cover mb-4"
          />
          <h1 className="text-3xl font-extrabold leading-tight">About Zama AI Primary</h1>
          <p className="text-white/80 mt-2 text-sm max-w-md">
            An AI-powered learning companion built specifically for Zimbabwean primary school students,
            parents, teachers and schools.
          </p>
        </div>
      </div>

      <div className="px-5 pt-6 pb-12 max-w-3xl mx-auto space-y-6">
        {/* Mission */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary mb-2">Our mission</p>
          <h2 className="font-bold text-foreground text-lg leading-snug">
            Make high-quality exam preparation accessible to every primary school learner in Zimbabwe.
          </h2>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Whether you're a parent supporting your child after school, a teacher preparing tomorrow's
            lesson, or a school administrator coordinating dozens of classes — Zama AI Primary gives
            you the tools and content to help learners succeed at Grade 4 through Grade 7.
          </p>
        </div>

        {/* What we believe */}
        <div>
          <h2 className="font-bold text-foreground text-lg mb-3">What we believe</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {VALUES.map((v) => (
              <div key={v.title} className="bg-card rounded-2xl border border-border p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  {v.icon}
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{v.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Who it's for */}
        <div>
          <h2 className="font-bold text-foreground text-lg mb-3">Who it's for</h2>
          <div className="space-y-3">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="bg-card rounded-2xl border border-border p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                  {a.icon}
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Curriculum */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold text-foreground text-sm mb-2">📚 Curriculum coverage</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We cover the full ZIMSEC Heritage-Based Curriculum for Grade 4–7, including Mathematics,
            English, Science, Social Studies, Shona, and Ndebele. Content is organised by term, week,
            and curriculum code so teachers and parents can follow along with the official syllabus.
          </p>
        </div>

        {/* Contact */}
        <div className="bg-secondary rounded-2xl p-5">
          <p className="font-bold text-foreground text-sm mb-2 flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" /> Get in touch
          </p>
          <p className="text-xs text-muted-foreground">
            Questions, feedback, or interested in bringing Zama AI Primary to your school?<br />
            Email us at{" "}
            <a href="mailto:support@zamaaiprimary.online" className="text-primary font-semibold hover:underline">
              support@zamaaiprimary.online
            </a>
          </p>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-primary to-violet-700 rounded-2xl p-6 text-white shadow-md text-center">
          <p className="font-bold text-lg">Try Zama AI Primary today</p>
          <p className="text-white/90 text-sm mt-1">7-day free trial · No credit card required</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={handleSignIn}
              className="bg-white text-primary font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors"
            >
              Start Free Trial
            </button>
            <Link
              to="/pricing"
              className="bg-white/10 border border-white/30 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/20 transition-colors"
            >
              See pricing
            </Link>
          </div>
        </div>
      </div>

      <WhatsAppFloatingButton message="Hi! I'd like to know more about Zama AI Primary." />
    </div>
  );
}