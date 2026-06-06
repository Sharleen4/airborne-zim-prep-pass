import { useFontSize, FONT_SIZES } from "@/hooks/useFontSize";
import { Type } from "lucide-react";

export default function FontSizePicker() {
  const { fontSize, setFontSize } = useFontSize();

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-2 border-b border-border">
        <Type className="w-4 h-4 text-primary" />
        <div>
          <p className="font-semibold text-sm text-foreground">Text Size</p>
          <p className="text-[11px] text-muted-foreground">Make text easier to read</p>
        </div>
      </div>
      <div className="p-3 grid grid-cols-3 gap-2">
        {Object.entries(FONT_SIZES).map(([key, opt]) => {
          const isActive = fontSize === key;
          const sizeClass = key === 'normal' ? 'text-sm' : key === 'large' ? 'text-base' : 'text-lg';
          return (
            <button
              key={key}
              onClick={() => setFontSize(key)}
              className={`rounded-xl py-3 px-2 border-2 transition-all flex flex-col items-center gap-1 ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-foreground hover:border-primary/40'
              }`}
            >
              <span className={`font-bold ${sizeClass}`}>Aa</span>
              <span className="text-[11px] font-semibold">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}