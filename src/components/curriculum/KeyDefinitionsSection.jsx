import { BookText } from "lucide-react";

export default function KeyDefinitionsSection({ items }) {
  if (!items?.length) return null;
  return (
    <div>
      <h3 className="font-bold text-sm text-foreground mb-2 flex items-center gap-1.5">
        <BookText className="w-4 h-4 text-primary" /> Definitions of Key Terms
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {items.map((d, i) => (
          <div key={i} className="border border-border rounded-xl p-3 bg-secondary/30">
            <p className="font-bold text-sm text-foreground">{d.term}</p>
            <p className="text-sm text-foreground mt-1">{d.definition}</p>
            {d.example && (
              <p className="text-xs text-muted-foreground italic mt-1">e.g. {d.example}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}