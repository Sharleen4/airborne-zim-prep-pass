import { useState } from "react";
import { X, Download, Share, Smartphone } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export default function InstallBanner() {
  const { installPrompt, isInstalled, isIOS, triggerInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("install_dismissed") === "1");
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const dismiss = () => {
    sessionStorage.setItem("install_dismissed", "1");
    setDismissed(true);
  };

  // Don't show if already installed, dismissed, or no prompt available and not iOS
  if (isInstalled || dismissed || (!installPrompt && !isIOS)) return null;

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-3 right-3 z-[200] animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-white dark:bg-card border border-border rounded-2xl shadow-xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-violet-700 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg shadow-md">
            Z
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground">Get the Zamaai App</p>
            <p className="text-xs text-muted-foreground">Study offline, anytime 📚</p>
          </div>
          <button
            onClick={isIOS ? () => setShowIOSGuide(true) : triggerInstall}
            className="flex-shrink-0 bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Install
          </button>
          <button onClick={dismiss} className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 bg-black/50 z-[300] flex items-end">
          <div
            className="w-full bg-white dark:bg-card rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom"
            style={{ paddingBottom: `max(1.5rem, env(safe-area-inset-bottom))` }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-foreground">Add to Home Screen</h3>
              <button onClick={() => setShowIOSGuide(false)} className="text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">Follow these steps to install Zamaai on your iPhone or iPad:</p>
            <div className="space-y-4">
              <Step number={1} icon={<Share className="w-5 h-5 text-blue-500" />} text='Tap the Share button at the bottom of Safari' />
              <Step number={2} icon={<Smartphone className="w-5 h-5 text-primary" />} text='Scroll down and tap "Add to Home Screen"' />
              <Step number={3} icon={<span className="text-lg">✅</span>} text='Tap "Add" — Zamaai will appear on your home screen!' />
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ number, icon, text }) {
  return (
    <div className="flex items-center gap-4 bg-secondary/50 rounded-2xl p-3">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm">
        {number}
      </div>
      <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">{icon}</div>
      <p className="text-sm text-foreground font-medium flex-1">{text}</p>
    </div>
  );
}