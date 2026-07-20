// admin/api.js
//
// Thin wrapper around your existing endpoints. Centralizing these here
// means slotModal.js and slots.js never touch `fetch` directly.

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed: ${url}`);
  }

  return data;
}

/* ===============================
   SLOTS
================================ */

export function getSlots(date) {
  return request(`/api/admin/slots?date=${date}`);
}

export function releaseHold(slotId) {
  return request(`/api/admin/slots/${slotId}/release`, {
    method: "PATCH",
  });
}

// GUESS — confirm the real route with your backend and update these two.
export function blockSlot({ start, end, reason }) {
  return request(`/api/admin/slots/block`, {
    method: "POST",
    body: JSON.stringify({ start, end, reason }),
  });
}

// GUESS — confirm the real route with your backend and update this.
export function unblockSlot(slotId) {
  return request(`/api/admin/slots/${slotId}/unblock`, {
    method: "PATCH",
  });
}

/* ===============================
   BOOKINGS
================================ */

export function createBooking(payload) {
  return request("/api/admin/V2/bookings/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateBooking(bookingId, paidOn, isCompleted) {
  return request("/api/admin/V2/bookings/update", {
    method: "PATCH",
    body: JSON.stringify({ bookingId, paidOn, isCompleted }),
  });
}

export function cancelBooking(bookingId) {
  return request(`/api/admin/bookings/${bookingId}`, {
    method: "DELETE",
  });
}
