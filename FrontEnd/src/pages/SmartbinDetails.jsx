import { Link, useParams } from "react-router-dom";
import DashboardHeader from "../components/DashboardHeader.jsx";
import DashboardSidebar from "../components/DashboardSidebar.jsx";
import { statusOptions } from "../data/smartbins.js";
import useSmartbin from "../hooks/useSmartbin.js";

const recentActivity = [
  { title: "Collection Completed", detail: "Waste collected by Truck #A12", time: "Today, 08:30 AM", tone: "blue" },
  { title: "High Fill Alert", detail: "Bin reached 85% capacity", time: "Yesterday, 04:15 PM", tone: "amber" },
  { title: "System Reset", detail: "Routine sensor calibration", time: "Jan 30, 02:00 AM", tone: "green" },
];

const wasteBreakdown = [
  { label: "Organic", value: "45%", color: "#228B22" },
  { label: "Plastic", value: "30%", color: "#87CEEB" },
  { label: "Paper", value: "15%", color: "#94A3B8" },
  { label: "Metal", value: "10%", color: "#1F2937" },
];

const activityIconClass = {
  blue: "bg-[#E8F1FF] text-[#2563EB]",
  amber: "bg-[#FFF5D6] text-[#B45309]",
  green: "bg-[#E7F6E7] text-[#228B22]",
};

export default function SmartbinDetails() {
  const { id } = useParams();
  const { bin, isLoading, error } = useSmartbin(id);
  const status = statusOptions.find((item) => item.value === bin?.status);

  const fillLevel = typeof bin?.fillLevel === "number" ? bin.fillLevel : 0;
  const batteryLevel = bin?.isActive ? 92 : 55;
  const signalQuality = bin?.isActive ? "Strong" : "Weak";

  return (
    <div className="relative min-h-screen bg-[#F5F7F5] text-[#333333]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,139,34,0.12),rgba(245,247,245,0.95)45%)]" />
      <div className="min-h-screen">
        <DashboardSidebar />

        <div className="flex min-h-screen flex-1 flex-col pl-20 lg:pl-64">
          <DashboardHeader
            title={bin ? `${bin.name} - ${bin.id}` : "Smartbin Detail"}
            breadcrumb={`Dashboard / Smartbin / ${bin?.id ?? "Unknown"}`}
            searchPlaceholder="Search sensor or metric"
          />

          <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-28">
            {isLoading ? (
              <div className="mb-6 rounded-3xl border border-[#E2E8F0] bg-white px-6 py-5 text-sm text-[#475569]">
                Memuat detail smartbin...
              </div>
            ) : null}
            {error ? (
              <div className="mb-6 rounded-3xl border border-[#F1C0C0] bg-[#FDF2F2] px-6 py-5 text-sm text-[#8B3A3A]">
                {error}
              </div>
            ) : null}
            {!isLoading && !bin ? (
              <div className="rounded-3xl border border-[#F1C0C0] bg-[#FDF2F2] px-6 py-5 text-sm text-[#8B3A3A]">
                Smartbin details not found. Return to the{" "}
                <Link to="/dashboard" className="font-semibold text-[#1F2937] underline">
                  dashboard
                </Link>
                .
              </div>
            ) : (
              <>
                <section className="flex flex-col gap-4 rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#6B7280]">
                      <Link to="/dashboard" className="hover:text-[#1F2937]">
                        Dashboard
                      </Link>
                      <span className="text-[#CBD5F5]">/</span>
                      <span className="text-[#228B22]">{bin.id}</span>
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold text-[#1F2937]">{bin.name}</h2>
                    <p className="mt-1 text-sm text-[#6B7280]">
                      {bin.locationName}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 text-xs font-semibold text-[#475569] transition hover:border-[#CBD5F5] hover:text-[#1F2937]"
                    >
                      <span className="h-2 w-2 rounded-full bg-[#87CEEB]" />
                      Maintenance
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-full bg-[#228B22] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#1C7A1C]"
                    >
                      Export report
                    </button>
                  </div>
                </section>

                <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
                  <div className="flex flex-col gap-6">
                    <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6B7280]">Fill Level</h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status?.chip ?? "bg-[#F1F5F9] text-[#475569]"}`}>
                          {status?.label ?? "Unknown"}
                        </span>
                      </div>
                      <div className="mt-6 flex flex-col items-center">
                        <div className="relative h-52 w-32">
                          <div className="absolute inset-x-0 top-0 h-8 rounded-full bg-[#CBD5F5]" />
                          <div className="absolute inset-x-0 top-2 h-3 rounded-full bg-[#87CEEB] shadow-md" />
                          <div className="absolute inset-x-0 top-6 bottom-0 rounded-b-[28px] border border-[#E2E8F0] bg-gradient-to-r from-[#E5E7EB] via-[#E2E8F0] to-[#CBD5F5]" />
                          <div
                            className="absolute inset-x-0 bottom-0 rounded-b-[28px] bg-gradient-to-t from-[#228B22] via-[#5FBF5F] to-[#9AD89A] opacity-90 transition-all"
                            style={{ height: `${fillLevel}%` }}
                          />
                          <div
                            className="absolute inset-x-2 rounded-full bg-white/60"
                            style={{ bottom: `calc(${fillLevel}% - 10px)`, height: "18px" }}
                          />
                        </div>
                        <div className="mt-4 text-center">
                          <div className="text-4xl font-semibold text-[#1F2937]">{fillLevel}%</div>
                          <p className="mt-1 text-sm text-[#6B7280]">Capacity used</p>
                        </div>
                        <div className="mt-5 w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-xs text-[#475569]">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
                            AI Prediction
                          </div>
                          <div className="mt-2">
                            Bin is expected to be full by <span className="font-semibold text-[#1F2937]">Tomorrow, 2:00 PM</span>.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6B7280]">Device Health</h3>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center">
                          <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Battery</div>
                          <div className="mt-3 text-2xl font-semibold text-[#1F2937]">{batteryLevel}%</div>
                          <div className="mt-2 text-xs text-[#228B22]">Stable</div>
                        </div>
                        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center">
                          <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Signal</div>
                          <div className="mt-3 text-2xl font-semibold text-[#1F2937]">{signalQuality}</div>
                          <div className="mt-2 text-xs text-[#6B7280]">Wi-Fi</div>
                        </div>
                        <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-center sm:col-span-2">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Internal Temp</div>
                              <div className="mt-2 text-xl font-semibold text-[#1F2937]">28 C</div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">Status</div>
                              <div className="mt-2 text-sm font-semibold text-[#228B22]">Normal</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-[#1F2937]">Waste Composition</h3>
                          <p className="mt-1 text-sm text-[#6B7280]">Detected materials via IoT sensors</p>
                        </div>
                        <span className="text-xs text-[#6B7280]">Last 24 hours</span>
                      </div>
                      <div className="mt-6 space-y-4">
                        {wasteBreakdown.map((item) => (
                          <div key={item.label} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-3">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="font-medium text-[#1F2937]">{item.label}</span>
                            </div>
                            <span className="text-[#6B7280]">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6B7280]">Recent Activity</h3>
                          <Link to="/dashboard" className="text-xs font-semibold text-[#228B22] hover:underline">
                            View all
                          </Link>
                        </div>
                        <div className="mt-4 space-y-4">
                          {recentActivity.map((item) => (
                            <div key={item.title} className="flex items-start gap-3 border-b border-[#F1F5F9] pb-3 last:border-b-0">
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-full ${activityIconClass[item.tone]}`}
                              >
                                <span className="text-base font-semibold">*</span>
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-[#1F2937]">{item.title}</div>
                                <div className="mt-1 text-xs text-[#6B7280]">{item.detail}</div>
                                <div className="mt-1 text-[11px] text-[#94A3B8]">{item.time}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl bg-[#228B22] p-6 text-white shadow-sm">
                        <div className="text-sm uppercase tracking-[0.2em] text-white/70">Impact This Month</div>
                        <div className="mt-4 text-4xl font-semibold">145 kg</div>
                        <p className="mt-2 text-sm text-white/80">CO2 Saved: 42 kg</p>
                        <div className="mt-5 rounded-2xl bg-white/15 px-4 py-3 text-xs text-white/80">
                          <div className="flex items-center justify-between">
                            <span>Monthly Goal</span>
                            <span className="font-semibold text-white">85%</span>
                          </div>
                          <div className="mt-3 h-2 w-full rounded-full bg-white/20">
                            <div className="h-2 w-[85%] rounded-full bg-white" />
                          </div>
                        </div>
                        <div className="mt-4 text-xs text-white/80">Last update: {bin.updatedAt}</div>
                      </div>
                    </div>
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
