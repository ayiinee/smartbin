import { useEffect, useMemo, useState } from "react";

import DashboardHeader from "../components/DashboardHeader.jsx";
import DashboardSidebar from "../components/DashboardSidebar.jsx";
import { fetchValidationQueue, resolveValidationItem } from "../services/validationApi";

import paperWaste from "../assets/sampah-kertas.png";
import paperWasteAlt from "../assets/sampah-kertas-2.png";
import plasticWaste from "../assets/sampah-plastik.png";
import metalWaste from "../assets/sampah-metal.png";
import organicWaste from "../assets/sampah-organik.png";

const wasteTypeOptions = [
  "Organic Waste",
  "Plastic Waste",
  "Paper Waste",
  "Metal Waste",
  "Glass Waste",
  "Textile Waste",
  "E-Waste",
  "Other",
];

const initialQueue = [
  {
    id: "VAL-001",
    image: paperWaste,
    predictions: ["Paper waste?", "Plastic waste?"],
    binName: "Smartbin UM-01",
    location: "Main Campus · Level 1",
    timestamp: "Jan 31, 2026 · 10:18",
    confidence: "62%",
    status: "pending",
    resolvedType: "",
    showReject: false,
  },
  {
    id: "VAL-002",
    image: plasticWaste,
    predictions: ["Plastic waste?", "Metal waste?"],
    binName: "Smartbin UB-01",
    location: "University District · Food Court",
    timestamp: "Jan 31, 2026 · 10:07",
    confidence: "58%",
    status: "pending",
    resolvedType: "",
    showReject: false,
  },
  {
    id: "VAL-003",
    image: metalWaste,
    predictions: ["Metal waste?", "Glass waste?"],
    binName: "Smartbin MATOS-01",
    location: "Retail Hub · Atrium Gate",
    timestamp: "Jan 31, 2026 · 09:54",
    confidence: "54%",
    status: "pending",
    resolvedType: "",
    showReject: false,
  },
  {
    id: "VAL-004",
    image: organicWaste,
    predictions: ["Organic waste?", "Paper waste?"],
    binName: "Smartbin MOG-01",
    location: "Retail Hub · Food Hall",
    timestamp: "Jan 31, 2026 · 09:38",
    confidence: "61%",
    status: "pending",
    resolvedType: "",
    showReject: false,
  },
  {
    id: "VAL-005",
    image: paperWasteAlt,
    predictions: ["Paper waste?", "Organic waste?"],
    binName: "Smartbin LIB-01",
    location: "Civic Center · Library Hall",
    timestamp: "Jan 31, 2026 · 09:12",
    confidence: "57%",
    status: "pending",
    resolvedType: "",
    showReject: false,
  },
];

const statusFilters = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rejected", label: "Rejected" },
];

const statusBadges = {
  pending: "bg-[#FFF5D6] text-[#8A6A00]",
  confirmed: "bg-[#E7F6E7] text-[#228B22]",
  rejected: "bg-[#FDF2F2] text-[#8B3A3A]",
};

export default function AIValidation() {
  const [items, setItems] = useState(initialQueue);
  const [activeFilter, setActiveFilter] = useState("pending");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const formatConfidence = (value) => {
    if (typeof value !== "number") return "N/A";
    const normalized = value <= 1 ? value * 100 : value;
    return `${Math.round(normalized)}%`;
  };

  const mapApiItem = (item) => {
    const predictions = [];
    if (item.ai_label) predictions.push(`AI: ${item.ai_label}?`);
    if (item.crowd_label) predictions.push(`Crowd: ${item.crowd_label}?`);

    return {
      id: item.id,
      image: item.image_url || "",
      predictions,
      aiLabel: item.ai_label || "Unknown",
      binName: item.bin_name || "Smartbin Demo",
      location: item.location || "Demo location",
      timestamp: item.timestamp ? new Date(item.timestamp).toLocaleString() : "N/A",
      confidence: formatConfidence(item.ai_confidence),
      status: item.status || "pending",
      resolvedType: item.resolved_type || "",
      showReject: false,
    };
  };

  const loadQueue = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const apiItems = await fetchValidationQueue();
      if (apiItems.length) {
        setItems(apiItems.map(mapApiItem));
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error("Failed to load validation queue:", error);
      setLoadError("Gagal memuat antrean validasi. Menampilkan data demo.");
      setItems(initialQueue);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const stats = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] += 1;
        return acc;
      },
      { total: 0, pending: 0, confirmed: 0, rejected: 0 }
    );
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((item) => item.status === activeFilter);
  }, [items, activeFilter]);

  const handleConfirm = async (id) => {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    if (typeof id === "string") {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "confirmed",
                resolvedType: item.predictions[0]?.replace("?", "") ?? "Confirmed",
                showReject: false,
              }
            : item
        )
      );
      return;
    }
    try {
      const payload = await resolveValidationItem(id, { action: "confirm" });
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...mapApiItem(payload), showReject: false } : item
        )
      );
    } catch (error) {
      console.error("Failed to confirm item:", error);
    }
  };

  const handleRejectToggle = (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              showReject: !item.showReject,
            }
          : item
      )
    );
  };

  const handleRejectSelect = async (id, value) => {
    if (!value) return;
    if (typeof id === "string") {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "rejected",
                resolvedType: value,
                showReject: false,
              }
            : item
        )
      );
      return;
    }
    try {
      const payload = await resolveValidationItem(id, { action: "reject", resolved_type: value });
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...mapApiItem(payload), showReject: false } : item
        )
      );
    } catch (error) {
      console.error("Failed to reject item:", error);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F5F7F5] text-[#333333]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(34,139,34,0.12),_rgba(245,247,245,0.95)_45%)]" />
      <div className="min-h-screen">
        <DashboardSidebar />

        <div className="flex min-h-screen flex-1 flex-col pl-20 lg:pl-64">
          <DashboardHeader title="AI Validation" breadcrumb="Home / AI Validation" />

          <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-28">
            <section className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#6B7280]">AI Oversight Queue</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#1F2937]">
                    Review uncertain waste classifications
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-[#6B7280]">
                    These items could not be confidently sorted. Confirm the AI suggestion or reject it and assign the
                    correct waste type.
                  </p>
                </div>

                <div className="grid min-w-[220px] gap-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-xs text-[#475569]">
                  <div className="flex items-center justify-between">
                    <span>Total items</span>
                    <span className="font-semibold text-[#1F2937]">{stats.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pending review</span>
                    <span className="font-semibold text-[#8A6A00]">{stats.pending}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Confirmed</span>
                    <span className="font-semibold text-[#228B22]">{stats.confirmed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Rejected</span>
                    <span className="font-semibold text-[#8B3A3A]">{stats.rejected}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 flex flex-wrap items-center gap-3">
              {statusFilters.map((filter) => {
                const isActive = activeFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveFilter(filter.value)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "bg-[#228B22] text-white shadow-sm"
                        : "border border-[#E2E8F0] bg-white text-[#475569] hover:text-[#1F2937]"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </section>

            {isLoading ? (
              <section className="mt-6 rounded-3xl border border-[#E2E8F0] bg-white px-6 py-10 text-center text-sm text-[#6B7280] shadow-sm">
                Memuat antrean validasi...
              </section>
            ) : null}

            {loadError ? (
              <section className="mt-6 rounded-3xl border border-[#F1C0C0] bg-[#FDF2F2] px-6 py-4 text-sm text-[#8B3A3A] shadow-sm">
                {loadError}
              </section>
            ) : null}

            <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-sm">
                  <div className="relative h-44 overflow-hidden bg-[#E9F0EA]">
                    {item.image ? (
                      <img src={item.image} alt={item.binName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[#6B7280]">
                        No image available
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    <div className="absolute left-4 bottom-4 right-4 flex flex-wrap gap-2">
                      {item.predictions.map((prediction) => (
                        <span
                          key={prediction}
                          className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#1F2937] shadow-sm"
                        >
                          {prediction}
                        </span>
                      ))}
                    </div>
                    <span
                      className={`absolute right-4 top-4 rounded-full px-3 py-1 text-[11px] font-semibold ${statusBadges[item.status]}`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="space-y-3 px-5 py-4 text-sm text-[#4B5563]">
                    <div className="flex items-center justify-between">
                      <div className="text-base font-semibold text-[#1F2937]">{item.binName}</div>
                      <div className="text-xs text-[#6B7280]">{item.confidence} confidence</div>
                    </div>
                    <div>{item.location}</div>
                    <div className="text-xs text-[#6B7280]">{item.timestamp}</div>
                    {item.resolvedType ? (
                      <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-[#475569]">
                        <span className="font-semibold text-[#1F2937]">Resolved as:</span> {item.resolvedType}
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-[#F1F5F9] px-5 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleConfirm(item.id)}
                        disabled={item.status !== "pending"}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          item.status === "pending"
                            ? "bg-[#228B22] text-white shadow-sm hover:bg-[#1A6B1A]"
                            : "cursor-not-allowed bg-[#E2E8F0] text-[#94A3B8]"
                        }`}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectToggle(item.id)}
                        disabled={item.status !== "pending"}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          item.status === "pending"
                            ? "border border-[#E2E8F0] bg-white text-[#475569] hover:border-[#C1D9C5] hover:text-[#1F2937]"
                            : "cursor-not-allowed border border-[#E2E8F0] bg-white text-[#CBD5F5]"
                        }`}
                      >
                        Reject
                      </button>
                    </div>

                    {item.showReject && item.status === "pending" ? (
                      <div className="mt-4">
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
                          Select correct waste type
                          <select
                            value=""
                            onChange={(event) => handleRejectSelect(item.id, event.target.value)}
                            className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#1F2937] shadow-sm focus:border-[#228B22] focus:outline-none"
                          >
                            <option value="">Choose waste type</option>
                            {wasteTypeOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </section>

            {filteredItems.length === 0 ? (
              <section className="mt-10 rounded-3xl border border-[#E2E8F0] bg-white px-6 py-10 text-center text-sm text-[#6B7280] shadow-sm">
                <h3 className="text-lg font-semibold text-[#1F2937]">No items match this filter</h3>
                <p className="mt-2">Try selecting another status to keep validating AI results.</p>
              </section>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
