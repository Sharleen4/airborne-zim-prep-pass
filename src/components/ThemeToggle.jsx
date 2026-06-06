import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex-shrink-0 bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3 py-2 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors"
        title="Change theme"
      >
        {theme === 'dark' ? (
          <Moon className="w-3.5 h-3.5" />
        ) : theme === 'light' ? (
          <Sun className="w-3.5 h-3.5" />
        ) : (
          <Monitor className="w-3.5 h-3.5" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[998]" onClick={() => setOpen(false)} />
          <div
            className="fixed right-4 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-[999] min-w-[140px]"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 3.5rem)' }}
          >
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    setTheme(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 text-sm font-medium flex items-center gap-2 transition-colors ${
                    theme === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-card text-foreground hover:bg-secondary'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}