// admin/js/api.dashboard.js
export async function fetchDashboardSummary(date) {
  const res = await fetch(`/api/admin/dashboard/summary?date=${date}`);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Failed to load summary");
  return data;
}

export async function fetchDashboardBookings(date) {
  const res = await fetch(`/api/admin/dashboard/bookings?date=${date}`);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Failed to load bookings");
  return data;
}
