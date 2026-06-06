import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Bug, Lightbulb, MessageSquare, HelpCircle, ChevronDown, ChevronUp, CheckCircle, Clock, Eye, X } from "lucide-react";

const TYPE_META = {
  bug_report: { label: "Bug Report", icon: Bug, color: "bg-red-100 text-red-700 border-red-300" },
  feature_request: { label: "Feature Request", icon: Lightbulb, color: "bg-amber-100 text-amber-700 border-amber-300" },
  suggestion: { label: "Suggestion", icon: MessageSquare, color: "bg-blue-100 text-blue-700 border-blue-300" },
  other: { label: "Other", icon: HelpCircle, color: "bg-secondary text-muted-foreground border-border" },
};

const STATUS_META = {
  new: { label: "New", color: "bg-orange-100 text-orange-700" },
  under_review: { label: "Under Review", color: "bg-blue-100 text-blue-700" },
  resolved: { label: "Resolved", color: "bg-green-100 text-green-700" },
  closed: { label: "Closed", color: "bg-secondary text-muted-foreground" },
};

export default function FeedbackTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    base44.entities.UserFeedback.list("-created_date", 200).then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    await base44.entities.UserFeedback.update(id, { status });
    setItems(prev => prev.map(i => i.id === id ? { ...i, status } : i));
    setUpdatingId(null);
  };

  const filtered = items.filter(i => {
    if (filterType !== "all" && i.type !== filterType) return false;
    if (filterStatus !== "all" && i.status !== filterStatus) return false;
    return true;
  });

  const counts = { new: 0, under_review: 0, resolved: 0, closed: 0 };
  items.forEach(i => { if (counts[i.status] !== undefined) counts[i.status]++; });

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">User Feedback ({items.length})</h2>

      {/* Status summary */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key} className={`rounded-2xl py-3 px-2 border ${meta.color}`}>
            <p className="text-xl font-extrabold">{counts[key]}</p>
            <p className="text-[10px] font-semibold mt-0.5">{meta.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="border border-border rounded-xl px-3 py-2 text-xs flex-1"
        >
          <option value="all">All Types</option>
          {Object.entries(TYPE_META).map(([v, m]) => (
            <option key={v} value={v}>{m.label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-border rounded-xl px-3 py-2 text-xs flex-1"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_META).map(([v, m]) => (
            <option key={v} value={v}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Feedback list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-white rounded-2xl border border-border">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="font-semibold">No feedback yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const typeMeta = TYPE_META[item.type] || TYPE_META.other;
            const statusMeta = STATUS_META[item.status] || STATUS_META.new;
            const Icon = typeMeta.icon;
            const isOpen = expandedId === item.id;

            return (
              <div key={item.id} className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${typeMeta.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{item.subject}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${typeMeta.color}`}>{typeMeta.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusMeta.color}`}>{statusMeta.label}</span>
                      {item.page_or_feature && (
                        <span className="text-xs text-muted-foreground">{item.page_or_feature}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.reported_by} · {new Date(item.created_date).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => setExpandedId(isOpen ? null : item.id)} className="text-muted-foreground flex-shrink-0 mt-1">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-border bg-secondary/20 px-4 py-3 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Description</p>
                      <p className="text-sm text-foreground whitespace-pre-line">{item.description}</p>
                    </div>

                    {/* Status updater */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Update Status</p>
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(STATUS_META).map(([key, meta]) => (
                          <button
                            key={key}
                            onClick={() => updateStatus(item.id, key)}
                            disabled={item.status === key || updatingId === item.id}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors disabled:opacity-40 ${
                              item.status === key ? meta.color + " border-current" : "border-border text-muted-foreground hover:bg-secondary"
                            }`}
                          >
                            {updatingId === item.id && item.status !== key ? "..." : meta.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}