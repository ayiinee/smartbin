const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function normalizeBin(bin) {
  return {
    id: String(bin.id),
    name: bin.name ?? `Smartbin ${bin.id}`,
    locationName: bin.location_name ?? "Unknown Location",
    lat: bin.latitude ?? 0,
    lng: bin.longitude ?? 0,
    isActive: Boolean(bin.is_active),
    fillLevel: typeof bin.fill_level === "number" ? bin.fill_level : 0,
    status: bin.status ?? "active",
    updatedAt: bin.last_seen ?? "N/A",
  };
}

export async function fetchDashboard() {
  return fetchJson(`${API_BASE_URL}/api/dashboard/`);
}

export async function fetchBins() {
  const payload = await fetchJson(`${API_BASE_URL}/api/bins/`);
  const bins = Array.isArray(payload?.data) ? payload.data : [];
  return bins.map(normalizeBin);
}

export async function fetchBinById(id) {
  const payload = await fetchJson(`${API_BASE_URL}/api/bins/${id}`);
  return normalizeBin(payload);
}

