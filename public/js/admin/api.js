// admin/api.js
//
// Thin wrapper around your existing endpoints. Centralizing these here
// means slotModal.js and slots.js never touch `fetch` directly.

import loader from "./loader.js";

let refreshPromise = null;
let activeRequests = 0;

function showLoader() {
  if (activeRequests++ === 0) {
    loader.show();
  }
}

function hideLoader() {
  activeRequests--;

  if (activeRequests <= 0) {
    activeRequests = 0;
    loader.hide();
  }
}

async function refreshAccessToken() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const res = await fetch("/api/admin/refresh", {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      throw new Error("Refresh failed");
    }

    return true;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

export async function apiFetch(url, options = {}) {
  showLoader();

  try {
    const config = {
      credentials: "include",
      ...options,
    };

    let response = await fetch(url, config);

    if (response.status !== 401) {
      return response;
    }

    await refreshAccessToken();

    response = await fetch(url, config);

    return response;
  } catch (err) {
    window.location.replace("/admin/login");
    throw err;
  } finally {
    hideLoader();
  }
}

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
