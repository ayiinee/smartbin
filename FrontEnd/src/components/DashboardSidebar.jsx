import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "grid", to: "/dashboard" },
  { label: "Analytics & Reports", icon: "chart", disabled: true },
  { label: "AI Validation", icon: "brain", to: "/ai-validation" },
  { label: "SmartBin Units", icon: "bin", disabled: true },
  { label: "Settings", icon: "gear", disabled: true },
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
  bin: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M9 7V5h6v2m-8 0l1 13h8l1-13" />
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
  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-20 flex-col border-r border-[#E2E8F0] bg-white/90 px-4 py-6 shadow-sm backdrop-blur lg:w-64">
      <div className="flex items-center gap-3 px-2">
        <span className="text-sm font-semibold uppercase tracking-[0.3em] text-[#228B22]">SmartBin AI</span>
      </div>

      <nav className="mt-10 flex-1 space-y-2">
        {NAV_ITEMS.map((item) => {
          if (item.to) {
            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === "/dashboard"}
                className={({ isActive }) =>
                  `group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold transition ${
                    isActive
                      ? "border border-[#228B22] bg-[#E7F6E7] text-[#228B22]"
                      : "text-[#475569] hover:bg-[#F1F5F9]"
                  }`
                }
              >
                <span className="text-current">{iconMap[item.icon]}</span>
                <span className="hidden lg:inline">{item.label}</span>
              </NavLink>
            );
          }

          return (
            <button
              key={item.label}
              type="button"
              className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-[#94A3B8] opacity-70"
            >
              <span className="text-current">{iconMap[item.icon]}</span>
              <span className="hidden lg:inline">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-3 py-3 shadow-sm">
        <div className="h-9 w-9 rounded-full bg-[#E2E8F0]" />
        <div className="hidden lg:block">
          <div className="text-sm font-semibold text-[#1F2937]">Facility Manager</div>
          <div className="text-xs text-[#6B7280]">SmartBin HQ</div>
        </div>
      </div>
    </aside>
  );
}
