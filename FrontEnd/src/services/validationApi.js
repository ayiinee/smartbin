const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

export async function fetchValidationQueue() {
  const payload = await fetchJson(`${API_BASE_URL}/api/validation/queue`);
  return Array.isArray(payload?.items) ? payload.items : [];
}

export async function submitCrowdValidation(data) {
  return fetchJson(`${API_BASE_URL}/api/validation/queue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function resolveValidationItem(id, data) {
  return fetchJson(`${API_BASE_URL}/api/validation/queue/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
