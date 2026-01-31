export default function DashboardHeader({
  title = "Dashboard",
  breadcrumb = "Home / Dashboard",
  searchPlaceholder = "Search Bin ID or Location",
}) {
  return (
    <header className="fixed left-20 right-0 top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-[#E2E8F0] bg-[#F5F7F5]/90 px-6 py-4 shadow-sm backdrop-blur lg:left-64">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">{breadcrumb}</p>
        <h1 className="mt-1 text-2xl font-semibold text-[#1F2937]">{title}</h1>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="relative w-full max-w-md">
          <input
            type="search"
            placeholder={searchPlaceholder}
            className="w-full rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-sm text-[#1F2937] shadow-sm focus:border-[#87CEEB] focus:outline-none"
          />
          <svg
            viewBox="0 0 24 24"
            className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B7280]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19a8 8 0 100-16 8 8 0 000 16zm9 2l-4.5-4.5" />
          </svg>
        </div>

        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#475569] shadow-sm"
          aria-label="Notifications"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 17a2.5 2.5 0 005 0" />
          </svg>
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#228B22]" />
        </button>
      </div>
    </header>
  );
}
