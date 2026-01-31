import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../components/DashboardHeader.jsx";
import DashboardSidebar from "../components/DashboardSidebar.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const formatNumber = (value, digits = 1) => {
  if (Number.isNaN(Number(value))) return "0";
  return Number(value).toLocaleString("id-ID", { maximumFractionDigits: digits });
};

const buildTrendPaths = (trend) => {
  if (!trend || trend.length === 0) return null;
  const width = 520;
  const height = 200;
  const padding = 24;
  const values = trend.map((item) => Number(item.value) || 0);
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;
  const denom = Math.max(values.length - 1, 1);

  const points = values.map((value, index) => {
    const x = padding + ((width - padding * 2) * index) / denom;
    const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
    return { x, y, value, label: trend[index]?.label || "" };
  });

  const linePath = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${height - padding} L${points[0].x},${
    height - padding
  } Z`;

  return { width, height, points, linePath, areaPath, minValue, maxValue };
};

export default function AnalyticsReports() {
  const [carbonTrend, setCarbonTrend] = useState(null);
  const [composition, setComposition] = useState(null);
  const [trendView, setTrendView] = useState("daily");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content: "Halo! Saya Gemini AI yang siap menganalisis data SmartBin. Tanyakan ringkasan, tren, atau insight.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAnalytics() {
      try {
        const [trendRes, compositionRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/analytics/carbon-trend?days=7&weeks=4`),
          fetch(`${API_BASE_URL}/api/analytics/waste-composition?days=7`),
        ]);

        if (!trendRes.ok || !compositionRes.ok) {
          throw new Error("Analytics request failed.");
        }

        const trendPayload = await trendRes.json();
        const compositionPayload = await compositionRes.json();

        if (isMounted) {
          setCarbonTrend(trendPayload);
          setComposition(compositionPayload);
          setLoadError("");
        }
      } catch (error) {
        if (isMounted) {
          setLoadError("Gagal memuat data analytics dari backend.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAnalytics();
    return () => {
      isMounted = false;
    };
  }, []);

  const trendData = trendView === "weekly" ? carbonTrend?.weekly : carbonTrend?.daily;
  const trendMetrics = useMemo(() => buildTrendPaths(trendData), [trendData]);

  const compositionGradient = useMemo(() => {
    if (!composition?.categories?.length) {
      return { background: "#E2E8F0" };
    }
    let current = 0;
    const stops = composition.categories.map((item) => {
      const start = current;
      current += item.percent;
      return `${item.color} ${start.toFixed(2)}% ${current.toFixed(2)}%`;
    });
    if (current < 100) {
      stops.push(`#E2E8F0 ${current.toFixed(2)}% 100%`);
    }
    return { background: `conic-gradient(${stops.join(", ")})` };
  }, [composition]);

  const summaryCards = [
    {
      label: "Total Carbon Avoided",
      value: `${formatNumber(carbonTrend?.total_avoided || 0, 2)} kg CO2e`,
      meta: "Last 7 days",
    },
    {
      label: "Average per Day",
      value: `${formatNumber(
        (carbonTrend?.total_avoided || 0) / Math.max(carbonTrend?.daily?.length || 1, 1),
        2
      )} kg CO2e`,
      meta: "Daily mean",
    },
    {
      label: "Total Waste Logged",
      value: `${formatNumber(composition?.total_weight || 0, 1)} kg`,
      meta: "Weight estimation",
    },
  ];

  const handleSendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) return;

    const newMessage = { role: "user", content: trimmed };
    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput("");
    setChatLoading(true);
    setChatError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: chatMessages.slice(-6),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Chatbot error");
      }

      setChatMessages((prev) => [...prev, { role: "assistant", content: payload.reply }]);
    } catch (error) {
      const detail = error?.message ? `Gagal menghubungi Gemini AI: ${error.message}` : "Gagal menghubungi Gemini AI. Coba lagi nanti.";
      setChatError(detail);
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Maaf, saya belum bisa merespons saat ini." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F5F7F5] text-[#333333]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(34,139,34,0.12),_rgba(245,247,245,0.95)_45%)]" />
      <div className="min-h-screen">
        <DashboardSidebar />

        <div className="flex min-h-screen flex-1 flex-col pl-20 lg:pl-64">
          <DashboardHeader
            title="Analytics & Reports"
            breadcrumb="Home / Analytics & Reports"
            searchPlaceholder="Search reports or insights"
          />

          <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-8">
            {isLoading ? (
              <div className="mb-4 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#475569]">
                Memuat data analytics...
              </div>
            ) : null}
            {loadError ? (
              <div className="mb-4 rounded-2xl border border-[#F1C0C0] bg-[#FDF2F2] px-4 py-3 text-sm text-[#8B3A3A]">
                {loadError}
              </div>
            ) : null}

            <section className="grid gap-6 md:grid-cols-3">
              {summaryCards.map((card) => (
                <div key={card.label} className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">{card.label}</p>
                  <div className="mt-4 text-2xl font-semibold text-[#1F2937]">{card.value}</div>
                  <div className="mt-2 text-xs text-[#6B7280]">{card.meta}</div>
                </div>
              ))}
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#1F2937]">Carbon Footprint Report</h2>
                    <p className="text-xs text-[#6B7280]">
                      {carbonTrend?.range_start} - {carbonTrend?.range_end} (UTC)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white p-1 text-xs">
                    {[
                      { value: "daily", label: "Daily" },
                      { value: "weekly", label: "Weekly" },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setTrendView(item.value)}
                        className={`rounded-full px-3 py-1 font-semibold transition ${
                          trendView === item.value ? "bg-[#228B22] text-white" : "text-[#6B7280] hover:text-[#1F2937]"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  {trendMetrics ? (
                    <div>
                      <svg viewBox={`0 0 ${trendMetrics.width} ${trendMetrics.height}`} className="h-52 w-full">
                        <defs>
                          <linearGradient id="sbTrendFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#228B22" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#228B22" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>
                        <path d={trendMetrics.areaPath} fill="url(#sbTrendFill)" />
                        <path d={trendMetrics.linePath} fill="none" stroke="#228B22" strokeWidth="2.5" />
                        {trendMetrics.points.map((point) => (
                          <circle key={`${point.x}-${point.y}`} cx={point.x} cy={point.y} r="4" fill="#228B22" />
                        ))}
                      </svg>
                      <div
                        className="mt-3 grid text-center text-[11px] uppercase tracking-[0.16em] text-[#6B7280]"
                        style={{ gridTemplateColumns: `repeat(${trendMetrics.points.length}, minmax(0, 1fr))` }}
                      >
                        {trendMetrics.points.map((point) => (
                          <div key={point.label}>{point.label}</div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#CBD5F5] bg-white px-6 py-10 text-center text-sm text-[#6B7280]">
                      Belum ada data tren carbon untuk periode ini.
                    </div>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[#6B7280]">
                  <div>
                    Total avoided: <span className="font-semibold text-[#1F2937]">{formatNumber(carbonTrend?.total_avoided || 0, 2)} kg CO2e</span>
                  </div>
                  <div>
                    Unit: <span className="font-semibold text-[#1F2937]">{carbonTrend?.unit || "kg CO2e"}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#1F2937]">Waste Composition Analysis</h2>
                  <span className="text-xs text-[#6B7280]">Last 7 days</span>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-8">
                  <div className="relative h-44 w-44">
                    <div className="h-full w-full rounded-full" style={compositionGradient} />
                    <div className="absolute inset-4 rounded-full bg-white shadow-inner" />
                    <div className="absolute inset-0 flex items-center justify-center text-center text-sm font-semibold text-[#1F2937]">
                      {formatNumber(composition?.total_weight || 0, 1)} kg
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-[#4B5563]">
                    {composition?.categories?.length ? (
                      composition.categories.map((item) => (
                        <div key={item.label} className="flex items-center gap-3">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="font-medium text-[#1F2937]">{item.label}</span>
                          <span className="text-[#6B7280]">
                            {formatNumber(item.value, 1)} kg • {formatNumber(item.percent, 1)}%
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#CBD5F5] bg-[#F8FAFC] px-4 py-4 text-xs text-[#6B7280]">
                        Tidak ada data komposisi sampah.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-[#1F2937]">Export Reports</h2>
                <p className="mt-2 text-sm text-[#6B7280]">
                  Unduh laporan dasar untuk kebutuhan audit internal.
                </p>
                <div className="mt-6 space-y-3">
                  <a
                    href={`${API_BASE_URL}/api/reports/export?format=pdf&days=7`}
                    className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#1F2937] transition hover:border-[#CBD5F5]"
                  >
                    <span>Download PDF Report</span>
                    <span className="text-xs text-[#6B7280]">A4 Summary</span>
                  </a>
                  <a
                    href={`${API_BASE_URL}/api/reports/export?format=csv&days=7`}
                    className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-sm font-semibold text-[#1F2937] transition hover:border-[#CBD5F5]"
                  >
                    <span>Download CSV Report</span>
                    <span className="text-xs text-[#6B7280]">Raw Data</span>
                  </a>
                </div>
                <div className="mt-4 rounded-2xl bg-[#F1F5F9] px-4 py-3 text-xs text-[#475569]">
                  Reports mencakup ringkasan tren carbon, komposisi sampah, dan aktivitas SmartBin.
                </div>
              </div>

              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[#1F2937]">Gemini AI Analyst</h2>
                    <p className="text-xs text-[#6B7280]">Analisis otomatis berbasis data database.</p>
                  </div>
                  <span className="rounded-full bg-[#E7F6E7] px-3 py-1 text-xs font-semibold text-[#228B22]">
                    Online
                  </span>
                </div>

                <div className="mt-4 h-64 overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <div className="space-y-3 text-sm">
                    {chatMessages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "ml-auto bg-[#228B22] text-white"
                            : "bg-white text-[#1F2937] shadow-sm"
                        }`}
                      >
                        {message.content}
                      </div>
                    ))}
                    {chatLoading ? (
                      <div className="max-w-[80%] rounded-2xl bg-white px-4 py-3 text-[#6B7280] shadow-sm">
                        Gemini sedang menganalisis...
                      </div>
                    ) : null}
                  </div>
                </div>
                {chatError ? (
                  <div className="mt-3 rounded-xl border border-[#F1C0C0] bg-[#FDF2F2] px-3 py-2 text-xs text-[#8B3A3A]">
                    {chatError}
                  </div>
                ) : null}
                <div className="mt-4 flex items-start gap-3">
                  <textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        handleSendChat();
                      }
                    }}
                    rows={2}
                    placeholder="Tanyakan ringkasan atau insight..."
                    className="flex-1 resize-none rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#1F2937] shadow-sm focus:border-[#228B22] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendChat}
                    className="rounded-2xl bg-[#228B22] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1E7A1E] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={chatLoading}
                  >
                    Send
                  </button>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
