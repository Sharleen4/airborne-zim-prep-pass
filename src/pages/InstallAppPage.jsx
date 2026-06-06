import { Link } from "react-router-dom";
import { ArrowLeft, Smartphone, Apple, Download, Share2, Plus, CheckCircle2, Wifi, Bell, Zap } from "lucide-react";
import WhatsAppFloatingButton from "@/components/WhatsAppFloatingButton";

const ANDROID_STEPS = [
  { icon: <Smartphone className="w-4 h-4" />, title: "Open in Chrome", desc: "Visit zamaaiprimary.online using Google Chrome on your Android phone." },
  { icon: <Download className="w-4 h-4" />, title: "Tap 'Install app'", desc: "You'll see a prompt at the bottom of the screen, or open the Chrome menu (⋮) and choose 'Install app' or 'Add to Home screen'." },
  { icon: <Plus className="w-4 h-4" />, title: "Confirm 'Install'", desc: "Tap Install in the popup. The app icon will appear on your home screen." },
  { icon: <CheckCircle2 className="w-4 h-4" />, title: "Open from home screen", desc: "Tap the Zama AI icon like any normal app — no browser bar, full-screen experience." },
];

const IOS_STEPS = [
  { icon: <Apple className="w-4 h-4" />, title: "Open in Safari", desc: "Visit zamaaiprimary.online using Safari (it must be Safari — not Chrome — on iPhone/iPad)." },
  { icon: <Share2 className="w-4 h-4" />, title: "Tap the Share button", desc: "Tap the share icon (square with an arrow pointing up) at the bottom of the screen." },
  { icon: <Plus className="w-4 h-4" />, title: "Choose 'Add to Home Screen'", desc: "Scroll down in the share menu and tap 'Add to Home Screen'." },
  { icon: <CheckCircle2 className="w-4 h-4" />, title: "Tap 'Add'", desc: "Confirm by tapping Add in the top-right corner. The app icon will appear on your home screen." },
];

const BENEFITS = [
  { icon: <Zap className="w-5 h-5 text-amber-500" />, title: "Faster loading", desc: "Opens instantly like a native app." },
  { icon: <Wifi className="w-5 h-5 text-blue-500" />, title: "Full-screen experience", desc: "No browser address bar — more space for learning." },
  { icon: <Bell className="w-5 h-5 text-emerald-500" />, title: "Quick access", desc: "Launch from your home screen with one tap." },
];

function StepCard({ step, index }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-primary text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
        {index + 1}
      </div>
      <div className="flex-1">
        <p className="font-bold text-foreground text-sm flex items-center gap-2">
          <span className="text-primary">{step.icon}</span>
          {step.title}
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.desc}</p>
      </div>
    </div>
  );
}

export default function InstallAppPage() {
  return (
    <div className="min-h-screen bg-background font-jakarta">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-violet-600 to-violet-800 text-white px-6 pt-10 pb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-white/5 -translate-y-1/3 translate-x-1/3" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-1 text-white/80 text-sm mb-4 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <h1 className="text-3xl font-extrabold leading-tight">Install Zama AI Primary</h1>
          <p className="text-white/80 mt-2 text-sm max-w-md">
            Add the app to your phone's home screen for a faster, app-like experience.
          </p>
        </div>
      </div>

      <div className="px-5 pt-6 pb-12 max-w-3xl mx-auto space-y-6">
        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="bg-card rounded-2xl border border-border p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                {b.icon}
              </div>
              <div>
                <p className="font-bold text-foreground text-sm">{b.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Android */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg leading-tight">On Android</h2>
              <p className="text-xs text-muted-foreground">Using Google Chrome</p>
            </div>
          </div>
          <div className="space-y-2">
            {ANDROID_STEPS.map((step, i) => (
              <StepCard key={step.title} step={step} index={i} />
            ))}
          </div>
        </div>

        {/* iPhone */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center">
              <Apple className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <h2 className="font-bold text-foreground text-lg leading-tight">On iPhone &amp; iPad</h2>
              <p className="text-xs text-muted-foreground">Using Safari (required)</p>
            </div>
          </div>
          <div className="space-y-2">
            {IOS_STEPS.map((step, i) => (
              <StepCard key={step.title} step={step} index={i} />
            ))}
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="font-bold text-foreground text-sm mb-2">Having trouble?</p>
          <ul className="text-xs text-muted-foreground space-y-1.5 leading-relaxed list-disc list-inside">
            <li>On iPhone, the "Add to Home Screen" option <strong>only appears in Safari</strong> — not Chrome or Firefox.</li>
            <li>On Android, make sure you're using Chrome (or Edge / Samsung Internet).</li>
            <li>Make sure you're signed in once before installing so your account is ready.</li>
            <li>Still stuck? Tap the WhatsApp button below and we'll help you out.</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-primary to-violet-700 rounded-2xl p-6 text-white shadow-md text-center">
          <p className="font-bold text-lg">Ready to install?</p>
          <p className="text-white/90 text-sm mt-1">Open this page on your phone and follow the steps above.</p>
          <Link
            to="/"
            className="mt-4 inline-block bg-white text-primary font-bold px-6 py-3 rounded-xl hover:bg-white/90 transition-colors"
          >
            Back to home
          </Link>
        </div>
      </div>

      <WhatsAppFloatingButton message="Hi! I need help installing the Zama AI Primary app." />
    </div>
  );
}