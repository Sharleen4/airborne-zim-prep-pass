import { useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Mobile-friendly bottom sheet replacement for <select>.
 * Uses a portal so z-index stacking contexts don't interfere.
 * Props: value, onChange, options=[{value, label}], placeholder
 */
export default function BottomSheetSelect({ value, onChange, options = [], placeholder = "Select..." }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  const sheet = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40"
            style={{ zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />
          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{ zIndex: 9999, paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
            className="fixed bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide px-6 py-2">
              {placeholder}
            </p>
            <div className="overflow-y-auto max-h-[60vh] px-4 pb-2 space-y-1">
              {options.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">No options available</p>
              )}
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-medium transition-colors ${
                    value === opt.value
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-secondary"
                  }`}
                >
                  {opt.label}
                  {value === opt.value && <Check className="w-4 h-4 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-left mb-3"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>

      {createPortal(sheet, document.body)}
    </>
  );
}