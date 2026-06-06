import { Link } from "react-router-dom";

export default function SkillCard({ icon, title, description, color, count, to }) {
  return (
    <Link
      to={to}
      className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-sm text-foreground">{title}</p>
          {count !== undefined && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground flex-shrink-0">
              {count}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
      </div>
    </Link>
  );
}