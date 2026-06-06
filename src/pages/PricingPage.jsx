import { Link } from "react-router-dom";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Check, Star, Users, GraduationCap, Building2, Sparkles } from "lucide-react";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";

const PARENT_PLANS = [
  {
    name: "Monthly",
    price: "$3",
    period: "/month",
    badge: null,
    features: [
      "1 child profile",
      "Full ZIMSEC Grade 4–7 content",
      "Unlimited practice & mock exams",
      "AI-powered revision notes",
      "Email support",
    ],
  },
  {
    name: "Termly",
    price: "$8",
    period: "/term",
    badge: "Most Popular",
    features: [
      "1 child profile",
      "Everything in Monthly",
      "Save ~11% vs monthly",
      "Termly progress reports",
      "Priority email support",
    ],
  },
  {
    name: "Annual",
    price: "$25",
    period: "/year",
    badge: "Best Value",
    features: [
      "1 child profile",
      "Everything in Termly",
      "Save ~30% vs monthly",
      "All future feature updates",
      "Priority email support",
    ],
  },
];

const FAMILY_PLANS = [
  {
    name: "Family Quarterly",
    price: "$15",
    period: "/quarter",
    badge: null,
    features: [
      "Up to 4 children",
      "All Premium features",
      "Individual progress per child",
      "One subscription, whole family",
    ],
  },
  {
    name: "Family Yearly",
    price: "$45",
    period: "/year",
    badge: "Best for families",
    features: [
      "Up to 4 children",
      "All Premium features",
      "Save ~25% vs quarterly",
      "Priority support",
    ],
  },
];

const SCHOOL_PLANS = [
  {
    name: "Small School",
    price: "Contact us",
    period: "",
    audience: "Up to 100 students",
    features: [
      "All teacher & admin tools",
      "Class & homework management",
      "AI lesson plan generator",
      "School-wide reports & analytics",
      "Onboarding & training included",
    ],
  },
  {
    name: "Medium School",
    price: "Contact us",
    period: "",
    audience: "101 – 500 students",
    features: [
      "Everything in Small School",
      "Bulk SMS to parents",
      "Multiple co-administrators",
      "Termly performance reviews",
      "Dedicated success manager",
    ],
  },
  {
    name: "Large / Group",
    price: "Custom",
    period: "",
    audience: "500+ students or multi-school",
    features: [
      "Everything in Medium School",
      "Volume pricing",
      "Custom integrations",
      "Priority feature requests",
      "Quarterly business reviews",
    ],
  },
];

function PlanCard({ plan, accent = "primary" }) {
  const accentClasses = {
    primary: "border-primary bg-primary/5",
    accent: "border-accent bg-accent/5",
    violet: "border-violet-500 bg-violet-500/5",
  };
  return (
    <div className={`relative bg-card rounded-2xl p-5 border-2 ${plan.badge ? accentClasses[accent] : "border-border"} shadow-sm flex flex-col`}>
      {plan.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1 rounded-full flex items-center gap-1">
          <Star className="w-3 h-3" /> {plan.badge}
        </div>
      )}
      <p className="font-bold text-foreground text-base">{plan.name}</p>
      {plan.audience && (
        <p className="text-xs text-muted-foreground mt-0.5">{plan.audience}</p>
      )}
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
        {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
      </div>
      <ul className="mt-4 space-y-2 flex-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-foreground">
            <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PricingPage() {
  const [tab, setTab] = useState("parents");

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
          <h1 className="text-3xl font-extrabold leading-tight">Simple, fair pricing</h1>
          <p className="text-white/80 mt-2 text-sm max-w-md">
            Start with a 7-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>
      </div>

      <div className="px-5 pt-6 pb-12 max-w-3xl mx-auto">
        {/* Tabs */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-1 grid grid-cols-3 gap-1 mb-6">
          {[
            { id: "parents", label: "Parents", icon: Users },
            { id: "families", label: "Families", icon: Sparkles },
            { id: "schools", label: "Schools", icon: Building2 },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  active ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "parents" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PARENT_PLANS.map((p) => (
              <PlanCard key={p.name} plan={p} accent="primary" />
            ))}
          </div>
        )}

        {tab === "families" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAMILY_PLANS.map((p) => (
              <PlanCard key={p.name} plan={p} accent="accent" />
            ))}
          </div>
        )}

        {tab === "schools" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {SCHOOL_PLANS.map((p) => (
                <PlanCard key={p.name} plan={p} accent="violet" />
              ))}
            </div>
            <div className="bg-card rounded-2xl border border-border p-5 mt-5">
              <p className="font-bold text-foreground text-sm mb-2 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" /> What schools get
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Multi-tenant school dashboard, teacher accounts, class &amp; homework management,
                AI lesson planning aligned to the ZIMSEC Heritage-Based Curriculum,
                school-wide analytics, and parent communication tools. Email{" "}
                <a href="mailto:support@zamaaiprimary.online" className="text-primary font-semibold">
                  support@zamaaiprimary.online
                </a>{" "}
                for a quote.
              </p>
            </div>
          </>
        )}

        {/* FAQ */}
        <div className="mt-8 space-y-3">
          <h2 className="font-bold text-foreground text-lg">Frequently asked questions</h2>
          {[
            {
              q: "Is there really a free trial?",
              a: "Yes. Every new account gets 7 days of full access to all features — no credit card required.",
            },
            {
              q: "Can I cancel anytime?",
              a: "Yes. Subscriptions can be cancelled anytime and you keep access until the end of your billing period.",
            },
            {
              q: "Which payment methods are supported?",
              a: "We accept EcoCash, OneMoney, ZIPIT, Visa and Mastercard through Paynow — all locally in USD or ZWL.",
            },
            {
              q: "Do you offer discounts for schools?",
              a: "Yes — volume pricing is available for schools with more than 100 students. Contact us for a quote.",
            },
          ].map((f) => (
            <div key={f.q} className="bg-card rounded-2xl border border-border p-4">
              <p className="font-bold text-foreground text-sm">{f.q}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-accent to-emerald-500 rounded-2xl p-6 text-white shadow-md mt-8 text-center">
          <p className="font-bold text-lg">Ready to get started?</p>
          <p className="text-white/90 text-sm mt-1">Try Zama AI Primary free for 7 days.</p>
          <button
            onClick={handleSignIn}
            className="mt-4 bg-white text-accent font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors"
          >
            Start Free Trial
          </button>
        </div>

        <div className="text-center mt-6">
          <Link to="/about" className="text-primary font-semibold text-sm hover:underline">
            Learn more about Zama AI Primary →
          </Link>
        </div>
      </div>

      <WhatsAppFloatingButton message="Hi! I'd like to know more about Zama AI Primary pricing." />
    </div>
  );
}