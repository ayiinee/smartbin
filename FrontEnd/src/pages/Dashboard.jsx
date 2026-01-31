import DashboardHeader from "../components/DashboardHeader.jsx";
import DashboardSidebar from "../components/DashboardSidebar.jsx";

const impactCards = [
  { label: "Total Waste Collected", value: "1,250 kg", trend: "+5% vs. last week" },
  { label: "Carbon Avoided (CO2e)", value: "850 kg", trend: "12% reduction", accent: "green" },
  { label: "Active Bins", value: "24/25 Online", trend: "1 unit offline" },
  { label: "Sorting Accuracy", value: "92%", trend: "Stable this week" },
];

const wasteLegend = [
  { label: "Organic", value: "420 kg", color: "#228B22" },
  { label: "Plastic", value: "310 kg", color: "#87CEEB" },
  { label: "Paper", value: "220 kg", color: "#94A3B8" },
  { label: "Metal", value: "180 kg", color: "#1F2937" },
  { label: "Residue", value: "120 kg", color: "#8B3A3A" },
];

const liveFeed = [
  { time: "10:45 AM", location: "1st Floor Canteen", type: "Plastic Bottles", confidence: "98%" },
  { time: "10:42 AM", location: "Lobby", type: "Organic Waste", confidence: "93%" },
  { time: "10:38 AM", location: "Conference Wing", type: "Paper Cups", confidence: "91%" },
  { time: "10:34 AM", location: "Floor 3 Pantry", type: "Metal Cans", confidence: "96%" },
];

const alerts = [
  { type: "Bin Full", location: "Level 2 - Hallway", status: "90% Full", tone: "full" },
  { type: "Bin Offline", location: "Parking Garage", status: "Disconnected", tone: "offline" },
  { type: "High Anomaly", location: "Cafeteria", status: "Mixed Waste", tone: "anomaly" },
];

const alertToneStyles = {
  full: "bg-[#F9EAEA] text-[#8B3A3A]",
  offline: "bg-[#F1F5F9] text-[#475569]",
  anomaly: "bg-[#EAF7FD] text-[#2B7A93]",
};

export default function Dashboard() {
  return (
    <div className="relative min-h-screen bg-[#F5F7F5] text-[#333333]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(34,139,34,0.12),_rgba(245,247,245,0.95)_45%)]" />
      <div className="flex min-h-screen">
        <DashboardSidebar />

        <div className="flex min-h-screen flex-1 flex-col">
          <DashboardHeader />

          <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-8">
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {impactCards.map((card) => (
                <div key={card.label} className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">{card.label}</p>
                  <div className="mt-4 text-3xl font-semibold text-[#1F2937]">{card.value}</div>
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                        card.accent === "green" ? "bg-[#E7F6E7] text-[#228B22]" : "bg-[#F1F5F9] text-[#475569]"
                      }`}
                    >
                      {card.trend}
                    </span>
                  </div>
                </div>
              ))}
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#1F2937]">Waste Composition</h2>
                  <span className="text-xs text-[#6B7280]">Last 7 days</span>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-8">
                  <div className="relative h-44 w-44">
                    <div className="h-full w-full rounded-full bg-[conic-gradient(#228B22_0_32%,#87CEEB_32%_55%,#94A3B8_55%_72%,#1F2937_72%_86%,#8B3A3A_86%_100%)]" />
                    <div className="absolute inset-4 rounded-full bg-white shadow-inner" />
                    <div className="absolute inset-0 flex items-center justify-center text-center text-sm font-semibold text-[#1F2937]">
                      1,250 kg
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-[#4B5563]">
                    {wasteLegend.map((item) => (
                      <div key={item.label} className="flex items-center gap-3" title={item.value}>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-[#1F2937]">{item.label}</span>
                        <span className="text-[#6B7280]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#228B22]">Live Stream</h2>
                  <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[#228B22]" />
                    Live
                  </div>
                </div>
                <div className="mt-4 space-y-4 text-sm text-[#4B5563]">
                  {liveFeed.map((item) => (
                    <div key={`${item.time}-${item.location}`} className="border-b border-[#F1F5F9] pb-3 last:border-b-0">
                      <div className="font-semibold text-[#1F2937]">{item.time}</div>
                      <div className="mt-1">{item.location}</div>
                      <div className="mt-1 text-[#6B7280]">
                        {item.type} ({item.confidence})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#1F2937]">Alerts / Action Needed</h2>
                <span className="text-xs text-[#6B7280]">3 active</span>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm text-[#4B5563]">
                  <thead className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">
                    <tr>
                      <th className="py-3 pr-4">Alert</th>
                      <th className="py-3 pr-4">Location</th>
                      <th className="py-3 pr-4">Status</th>
                      <th className="py-3">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert, index) => (
                      <tr key={alert.type} className={index !== alerts.length - 1 ? "border-b border-[#F1F5F9]" : ""}>
                        <td className="py-4 pr-4 font-semibold text-[#1F2937]">{alert.type}</td>
                        <td className="py-4 pr-4">{alert.location}</td>
                        <td className="py-4 pr-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${alertToneStyles[alert.tone]}`}
                          >
                            {alert.status}
                          </span>
                        </td>
                        <td className="py-4 text-[#6B7280]">Just now</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
