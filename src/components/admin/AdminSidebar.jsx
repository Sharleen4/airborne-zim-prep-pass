import { useState } from "react";
import { LayoutDashboard, BookOpen, Users, DollarSign, BarChart3, Mail, Wrench, Menu, X, ChevronDown } from "lucide-react";

export const ADMIN_GROUPS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    tabs: [{ key: "Dashboard", label: "Overview" }],
  },
  {
    key: "content",
    label: "Content",
    icon: BookOpen,
    tabs: [
      { key: "CMS", label: "CMS (recommended)" },
      { key: "Subjects", label: "Subjects" },
      { key: "Topics", label: "Topics" },
      { key: "Notes", label: "Notes" },
      { key: "Questions", label: "Questions" },
      { key: "Mock Exams", label: "Mock Exams" },
      { key: "Review", label: "Review queue" },
      { key: "Quality", label: "Quality" },
    ],
  },
  {
    key: "people",
    label: "People",
    icon: Users,
    tabs: [
      { key: "Users", label: "Users" },
      { key: "Schools", label: "🏫 Schools (approvals)" },
      { key: "Students", label: "Student performance" },
      { key: "Teachers", label: "Teachers" },
    ],
  },
  {
    key: "payments",
    label: "Payments",
    icon: DollarSign,
    tabs: [{ key: "Founding Offer", label: "Founding offer" }],
  },
  {
    key: "analytics",
    label: "Analytics",
    icon: BarChart3,
    tabs: [
      { key: "Analytics", label: "Analytics" },
      { key: "Feedback", label: "Feedback" },
    ],
  },
  {
    key: "comms",
    label: "Communications",
    icon: Mail,
    tabs: [
      { key: "Email Centre", label: "Email centre" },
      { key: "Emails", label: "Email templates" },
      { key: "Email Logs", label: "Email logs" },
      { key: "Notifications", label: "Notification templates" },
      { key: "SMS Logs", label: "SMS logs" },
    ],
  },
  {
    key: "tools",
    label: "Tools",
    icon: Wrench,
    tabs: [
      { key: "Bulk CSV", label: "Bulk CSV" },
      { key: "Import CSV", label: "Import CSV" },
      { key: "English CSV", label: "English CSV (new module)" },
      { key: "Preload", label: "Preload questions" },
      { key: "Generate Grade", label: "⚡ Generate ALL for a Grade" },
      { key: "Curriculum", label: "Curriculum references" },
      { key: "Curriculum CMS", label: "📘 Curriculum (Heritage-Based)" },
      { key: "Generate", label: "Syllabus generator" },
      { key: "Import Content", label: "Import content" },
      { key: "PDF Upload", label: "PDF upload" },
      { key: "Exam Builder", label: "Mock exam builder" },
    ],
  },
];

export function findGroupForTab(tabKey) {
  return ADMIN_GROUPS.find(g => g.tabs.some(t => t.key === tabKey))?.key || "dashboard";
}

export default function AdminSidebar({ activeTab, onSelect }) {
  const [openGroup, setOpenGroup] = useState(findGroupForTab(activeTab));
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (tabKey) => {
    onSelect(tabKey);
    setMobileOpen(false);
  };

  const SidebarContent = (
    <nav className="space-y-1">
      {ADMIN_GROUPS.map(group => {
        const Icon = group.icon;
        const isOpen = openGroup === group.key;
        const hasActive = group.tabs.some(t => t.key === activeTab);

        return (
          <div key={group.key}>
            <button
              onClick={() => setOpenGroup(isOpen ? null : group.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                hasActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="mt-0.5 ml-3 pl-3 border-l border-border space-y-0.5">
                {group.tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => handleSelect(tab.key)}
                    className={`w-full text-left text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                      activeTab === tab.key
                        ? "bg-primary text-white"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 bg-card border border-border rounded-xl p-2 shadow-md"
        aria-label="Open admin menu"
      >
        <Menu className="w-4 h-4 text-foreground" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 max-w-[85vw] h-full bg-card border-r border-border overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="font-bold text-sm">Admin Menu</p>
              <button onClick={() => setMobileOpen(false)} className="p-1"><X className="w-4 h-4" /></button>
            </div>
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-60 flex-shrink-0 border-r border-border bg-card overflow-y-auto p-4 sticky top-0 h-screen">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-3">Admin Panel</p>
        {SidebarContent}
      </aside>
    </>
  );
}