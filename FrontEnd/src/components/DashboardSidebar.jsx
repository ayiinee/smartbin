import { Link, useLocation } from "react-router-dom";
import SmartbinLogo from "./SmartbinLogo.jsx";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "grid", path: "/dashboard" },
  { label: "Analytics & Reports", icon: "chart", path: "/analytics-reports" },
  { label: "AI Validation", icon: "brain", path: "/ai-validation" },
  { label: "Education", icon: "education", path: "/education" },
];

const iconMap = {
  grid: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m6 14V9m6 10V3m4 16H2" />
    </svg>
  ),
  brain: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.5 4.5a3 3 0 015 0 3.5 3.5 0 013.5 3.5 3.5 3.5 0 01-1 2.5 3 3 0 011 2.3 3.2 3.2 0 01-2.5 3.1 3 3 0 01-5.9 0 3.2 3.2 0 01-2.5-3.1 3 3 0 011-2.3 3.5 3.5 0 01-1-2.5 3.5 3.5 0 013.4-3.5z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M9 9h6M9 15h6" />
    </svg>
  ),
  play: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6.5v11l9-5.5-9-5.5z" />
    </svg>
  ),
  education: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l9 4-9 4-9-4 9-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10v4c0 1.1 3.1 3 7 3s7-1.9 7-3v-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v7" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 3.5h3l.5 2.1a6.8 6.8 0 012 1.2l2.1-.7 1.5 2.6-1.7 1.4a6.6 6.6 0 010 2.4l1.7 1.4-1.5 2.6-2.1-.7a6.8 6.8 0 01-2 1.2l-.5 2.1h-3l-.5-2.1a6.8 6.8 0 01-2-1.2l-2.1.7-1.5-2.6 1.7-1.4a6.6 6.6 0 010-2.4L4.9 8.3 6.4 5.7l2.1.7a6.8 6.8 0 012-1.2z"
      />
      <circle cx="12" cy="12" r="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function DashboardSidebar() {
  const location = useLocation();

  const isItemActive = (item) => {
    if (!item.path) return false;
    if (item.hash) {
      return location.pathname === item.path && location.hash === item.hash;
    }
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-20 flex-col border-r border-[#E2E8F0] bg-white/90 px-4 py-6 shadow-sm backdrop-blur lg:w-64">
      <div className="flex items-center gap-3 px-2">
        <SmartbinLogo className="h-10 w-10 border border-[#E2E8F0]" />
        <span className="text-sm font-semibold uppercase tracking-[0.3em] text-[#228B22]">SmartBin AI</span>
      </div>

      <nav className="mt-10 flex-1 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                isActive
                  ? "border border-[#228B22] bg-[#E7F6E7] text-[#228B22]"
                  : "text-[#475569] hover:bg-[#F1F5F9]"
              }`}
            >
              <span className="text-current">{iconMap[item.icon]}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </Link>
          );
        })}

        <Link
          to="/demo-smartbin"
          className="flex w-full items-center justify-center rounded-2xl bg-[#1B9F52] px-3 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#178a43]"
        >
          <span className="text-current">{iconMap.play}</span>
          <span className="hidden lg:inline">Demo</span>
        </Link>
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-3 py-3 shadow-sm">
        <SmartbinLogo className="h-9 w-9 border border-[#E2E8F0]" />
        <div className="hidden lg:block">
          <div className="text-sm font-semibold text-[#1F2937]">Facility Manager</div>
          <div className="text-xs text-[#6B7280]">SmartBin HQ</div>
        </div>
      </div>
    </aside>
  );
}
