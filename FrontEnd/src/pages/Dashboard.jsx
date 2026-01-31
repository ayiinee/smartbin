import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { latLngBounds } from "leaflet";

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

const gisBins = [
  {
    id: "SB-UM-01",
    name: "Smartbin UM-01",
    institutionId: "inst-um",
    institutionName: "Universitas Negeri Malang",
    clusterId: "cluster-edu",
    clusterName: "University District",
    unitId: "unit-um-main",
    unitName: "Main Campus",
    status: "active",
    lat: -7.961474,
    lng: 112.617872,
    updatedAt: "2026-01-31 10:42",
  },
  {
    id: "SB-UB-01",
    name: "Smartbin UB-01",
    institutionId: "inst-ub",
    institutionName: "Universitas Brawijaya",
    clusterId: "cluster-edu",
    clusterName: "University District",
    unitId: "unit-ub-main",
    unitName: "Main Campus",
    status: "maintenance",
    lat: -7.95235,
    lng: 112.61296,
    updatedAt: "2026-01-31 09:55",
  },
  {
    id: "SB-MATOS-01",
    name: "Smartbin MATOS-01",
    institutionId: "inst-matos",
    institutionName: "Malang Town Square",
    clusterId: "cluster-retail",
    clusterName: "Retail Hub",
    unitId: "unit-matos-atrium",
    unitName: "Main Atrium",
    status: "full",
    lat: -7.95682,
    lng: 112.6188,
    updatedAt: "2026-01-31 10:28",
  },
  {
    id: "SB-MOG-01",
    name: "Smartbin MOG-01",
    institutionId: "inst-mog",
    institutionName: "Mall Olympic Garden",
    clusterId: "cluster-retail",
    clusterName: "Retail Hub",
    unitId: "unit-mog-entrance",
    unitName: "Main Entrance",
    status: "offline",
    lat: -7.97696,
    lng: 112.62388,
    updatedAt: "2026-01-31 08:12",
  },
  {
    id: "SB-LIB-01",
    name: "Smartbin LIB-01",
    institutionId: "inst-lib",
    institutionName: "Perpustakaan Kota Malang",
    clusterId: "cluster-civic",
    clusterName: "Civic Center",
    unitId: "unit-lib-main",
    unitName: "Public Library",
    status: "active",
    lat: -7.9722203,
    lng: 112.6220435,
    updatedAt: "2026-01-31 10:10",
  },
];

const statusOptions = [
  { value: "active", label: "Active", color: "#228B22", chip: "bg-[#E7F6E7] text-[#228B22]" },
  { value: "maintenance", label: "Maintenance", color: "#E0A800", chip: "bg-[#FFF5D6] text-[#8A6A00]" },
  { value: "full", label: "Full", color: "#C2410C", chip: "bg-[#FDE8D8] text-[#9A3412]" },
  { value: "offline", label: "Offline", color: "#6B7280", chip: "bg-[#F1F5F9] text-[#475569]" },
];

const alertToneStyles = {
  full: "bg-[#F9EAEA] text-[#8B3A3A]",
  offline: "bg-[#F1F5F9] text-[#475569]",
  anomaly: "bg-[#EAF7FD] text-[#2B7A93]",
};

function MapBounds({ bins }) {
  const map = useMap();

  useEffect(() => {
    if (!bins.length) return;
    const bounds = latLngBounds(bins.map((bin) => [bin.lat, bin.lng]));
    map.fitBounds(bounds, { padding: [80, 80] });
  }, [bins, map]);

  return null;
}

function MapSizeFix() {
  const map = useMap();

  useEffect(() => {
    const refresh = () => map.invalidateSize(true);
    const timer = setTimeout(refresh, 0);
    window.addEventListener("resize", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", refresh);
    };
  }, [map]);

  return null;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function Dashboard() {
  const [selectedInstitution, setSelectedInstitution] = useState("all");
  const [selectedCluster, setSelectedCluster] = useState("all");
  const [selectedUnit, setSelectedUnit] = useState("all");
  const [statusFilters, setStatusFilters] = useState(statusOptions.map((status) => status.value));

  const institutions = useMemo(() => {
    const map = new Map();
    gisBins.forEach((bin) => {
      if (!map.has(bin.institutionId)) {
        map.set(bin.institutionId, { id: bin.institutionId, name: bin.institutionName });
      }
    });
    return Array.from(map.values());
  }, []);

  const clusters = useMemo(() => {
    const source = selectedInstitution === "all" ? gisBins : gisBins.filter((bin) => bin.institutionId === selectedInstitution);
    const map = new Map();
    source.forEach((bin) => {
      if (!map.has(bin.clusterId)) {
        map.set(bin.clusterId, { id: bin.clusterId, name: bin.clusterName });
      }
    });
    return Array.from(map.values());
  }, [selectedInstitution]);

  const units = useMemo(() => {
    let source = gisBins;
    if (selectedInstitution !== "all") {
      source = source.filter((bin) => bin.institutionId === selectedInstitution);
    }
    if (selectedCluster !== "all") {
      source = source.filter((bin) => bin.clusterId === selectedCluster);
    }
    const map = new Map();
    source.forEach((bin) => {
      if (!map.has(bin.unitId)) {
        map.set(bin.unitId, { id: bin.unitId, name: bin.unitName });
      }
    });
    return Array.from(map.values());
  }, [selectedInstitution, selectedCluster]);

  const filteredBins = useMemo(() => {
    const activeStatuses = statusFilters.length ? statusFilters : statusOptions.map((status) => status.value);
    return gisBins.filter((bin) => {
      if (selectedInstitution !== "all" && bin.institutionId !== selectedInstitution) return false;
      if (selectedCluster !== "all" && bin.clusterId !== selectedCluster) return false;
      if (selectedUnit !== "all" && bin.unitId !== selectedUnit) return false;
      if (!activeStatuses.includes(bin.status)) return false;
      return true;
    });
  }, [selectedInstitution, selectedCluster, selectedUnit, statusFilters]);

  const handleResetFilters = () => {
    setSelectedInstitution("all");
    setSelectedCluster("all");
    setSelectedUnit("all");
    setStatusFilters(statusOptions.map((status) => status.value));
  };

  const toggleStatus = (value) => {
    setStatusFilters((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
  };

  const [dashboard, setDashboard] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/dashboard/`);
        if (!response.ok) {
          throw new Error(`Dashboard request failed: ${response.status}`);
        }
        const payload = await response.json();
        if (isMounted) {
          setDashboard(payload);
          setLoadError("");
        }
      } catch (error) {
        if (isMounted) {
          setLoadError("Gagal memuat data dari backend.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#F5F7F5] text-[#333333]">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(34,139,34,0.12),_rgba(245,247,245,0.95)_45%)]" />
      <div className="min-h-screen">
        <DashboardSidebar />

        <div className="flex min-h-screen flex-1 flex-col pl-20 lg:pl-64">
          <DashboardHeader />

          <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-16 pt-8">
            {isLoading ? (
              <div className="mb-4 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#475569]">
                Memuat data dashboard...
              </div>
            ) : null}
            {loadError ? (
              <div className="mb-4 rounded-2xl border border-[#F1C0C0] bg-[#FDF2F2] px-4 py-3 text-sm text-[#8B3A3A]">
                {loadError}
              </div>
            ) : null}
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {dashboard?.impact_cards?.map((card) => (
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

            <section className="relative mt-10 overflow-hidden rounded-3xl border border-[#E2E8F0] bg-white shadow-sm">
              <div className="relative isolate h-[70vh] min-h-[520px] w-full overflow-hidden bg-[#E9F0EA]">
                <MapContainer
                  center={[-7.9771, 112.634]}
                  zoom={12}
                  scrollWheelZoom
                  className="relative z-0 h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapSizeFix />
                  <MapBounds bins={filteredBins} />
                  {filteredBins.map((bin) => {
                    const status = statusOptions.find((item) => item.value === bin.status);
                    return (
                      <CircleMarker
                        key={bin.id}
                        center={[bin.lat, bin.lng]}
                        radius={10}
                        pathOptions={{ color: status?.color ?? "#228B22", fillColor: status?.color ?? "#228B22", fillOpacity: 0.85 }}
                      >
                        <Popup>
                          <div className="text-sm">
                            <div className="text-base font-semibold text-[#1F2937]">{bin.name}</div>
                            <div className="mt-1 text-[#4B5563]">{bin.institutionName}</div>
                            <div className="text-[#6B7280]">
                              {bin.clusterName} • {bin.unitName}
                            </div>
                            <div className="mt-2 text-xs uppercase tracking-[0.2em] text-[#6B7280]">Status</div>
                            <div className="font-semibold text-[#1F2937]">{status?.label}</div>
                            <div className="mt-2 text-xs text-[#6B7280]">Updated {bin.updatedAt}</div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>

                <div className="pointer-events-none absolute left-6 top-6 rounded-2xl bg-white/80 px-4 py-3 text-sm shadow-lg backdrop-blur">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1F2937]">
                    Gis Map SmartBin Distribution
                  </div>
                  <div className="mt-2 text-[#6B7280]">{filteredBins.length} bins match the filters</div>
                </div>

                <div className="pointer-events-none absolute left-6 bottom-6 rounded-2xl bg-white/85 px-4 py-3 text-xs text-[#475569] shadow-md backdrop-blur">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#6B7280]">Status Legend</div>
                  <div className="mt-2 space-y-2">
                    {statusOptions.map((status) => (
                      <div key={status.value} className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                        <span className="font-medium text-[#1F2937]">{status.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute right-4 top-4 z-20 w-64 max-w-[80vw] rounded-2xl border border-white/80 bg-white/90 p-4 shadow-lg backdrop-blur md:right-6 md:top-6 md:w-72">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#6B7280]">Filter Layer</div>
                      <div className="mt-1 text-base font-semibold text-[#1F2937]">Map Filters</div>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="rounded-full border border-[#E2E8F0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#475569] transition hover:border-[#CBD5F5] hover:text-[#1F2937] cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>

                  <div className="mt-3 space-y-3">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
                      Institution
                      <select
                        value={selectedInstitution}
                        onChange={(event) => {
                          setSelectedInstitution(event.target.value);
                          setSelectedCluster("all");
                          setSelectedUnit("all");
                        }}
                        className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#1F2937] shadow-sm focus:border-[#228B22] focus:outline-none"
                      >
                        <option value="all">All Institutions</option>
                        {institutions.map((inst) => (
                          <option key={inst.id} value={inst.id}>
                            {inst.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
                      Cluster
                      <select
                        value={selectedCluster}
                        onChange={(event) => {
                          setSelectedCluster(event.target.value);
                          setSelectedUnit("all");
                        }}
                        className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#1F2937] shadow-sm focus:border-[#228B22] focus:outline-none"
                      >
                        <option value="all">All Clusters</option>
                        {clusters.map((cluster) => (
                          <option key={cluster.id} value={cluster.id}>
                            {cluster.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">
                      Smartbin Unit
                      <select
                        value={selectedUnit}
                        onChange={(event) => setSelectedUnit(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs text-[#1F2937] shadow-sm focus:border-[#228B22] focus:outline-none"
                      >
                        <option value="all">All Units</option>
                        {units.map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {unit.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B7280]">Status</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {statusOptions.map((status) => {
                        const isActive = statusFilters.includes(status.value);
                        return (
                          <button
                            key={status.value}
                            type="button"
                            onClick={() => toggleStatus(status.value)}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                              isActive ? status.chip : "border border-[#E2E8F0] bg-white text-[#6B7280] hover:text-[#1F2937]"
                            }`}
                          >
                            {status.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-2 text-[11px] text-[#6B7280]">
                      Toggle status filters to focus on priority bins.
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-[#F8FAFC] px-3 py-2 text-[11px] text-[#475569]">
                    Showing <span className="font-semibold text-[#1F2937]">{filteredBins.length}</span> bins from{" "}
                    <span className="font-semibold text-[#1F2937]">{gisBins.length}</span> total devices.
                  </div>
                </div>

                {filteredBins.length === 0 && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="rounded-3xl bg-white/90 px-6 py-4 text-center text-sm text-[#475569] shadow-lg backdrop-blur">
                      <div className="text-base font-semibold text-[#1F2937]">No bins match these filters</div>
                      <div className="mt-1">Try expanding the institution or status selection.</div>
                    </div>
                  </div>
                )}
              </div>
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
                    {dashboard?.waste_total}
                  </div>
                </div>
                  <div className="space-y-3 text-sm text-[#4B5563]">
                    {dashboard?.waste_legend?.map((item) => (
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
                  {dashboard?.live_feed?.map((item) => (
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
                <span className="text-xs text-[#6B7280]">{dashboard?.alerts?.length || 0} active</span>
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
                    {dashboard?.alerts?.map((alert, index) => (
                      <tr
                        key={alert.type}
                        className={index !== dashboard?.alerts?.length - 1 ? "border-b border-[#F1F5F9]" : ""}
                      >
                        <td className="py-4 pr-4 font-semibold text-[#1F2937]">{alert.type}</td>
                        <td className="py-4 pr-4">{alert.location}</td>
                        <td className="py-4 pr-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${alertToneStyles[alert.tone]}`}
                          >
                            {alert.status}
                          </span>
                        </td>
                        <td className="py-4 text-[#6B7280]">{alert.time || "Just now"}</td>
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


