export async function fetchSlots(date) {
  if (!date) return [];

  const res = await fetch(`/api/slots?date=${date}`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Failed to fetch slots");
  }

  return Array.isArray(data) ? data : data.slots ?? [];
}

export async function holdSlot(payload) {
  const res = await fetch("/api/slots/hold", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || "Hold failed");
  }

  return data; // { bookingId, expiresAt }
}
