import { dom } from "./dom.dashboard.js";
import {
  openSlotModal,
  updateSlotModal,
  closeSlotModal,
} from "./slotsModal.js";

import { calculateAmount } from "../pricing.js";

const state = {
  currentDate: "",
  slots: [],
};
function formatTimeForInput(date) {
  const d = new Date(date);

  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}
function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Has an error
async function refreshSlots(selectedSlotId = null) {
  await fetchSlots(state.currentDate);

  renderSlots();

  if (!selectedSlotId) return;

  const updatedSlot = state.slots.find(
    slot => String(slot.slotId) === String(selectedSlotId)
  );

  if (updatedSlot) {
    updateSlotModal(updatedSlot);
  }
}

function setLoading(button, loadingText) {
  if (!button) return;

  button.disabled = true;

  button.dataset.originalText = button.innerHTML;

  button.innerHTML = `
    <span class="inline-flex items-center gap-2">
      <svg class="w-4 h-4 animate-spin"
           viewBox="0 0 24 24"
           fill="none"
           stroke="currentColor">

        <circle
          cx="12"
          cy="12"
          r="10"
          stroke-width="4"
          class="opacity-20"
        />

        <path
          d="M22 12a10 10 0 00-10-10"
          stroke-width="4"
        />

      </svg>

      ${loadingText}

    </span>
  `;
}

function resetLoading(button) {
  if (!button) return;

  button.disabled = false;

  button.innerHTML = button.dataset.originalText;
}

async function api(url, options = {}) {
  const res = await fetch(url, options);

  const data = await res.json();
  console.log("API Response:", data);

  if (!res.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

function buildDateTime(date, time) {
  return new Date(`${date}T${time}:00`);
}

function createSlotCard(slot, index) {
  return `
    <button
      type="button"
      class="slot-card rounded-3xl border bg-white p-5 text-left transition hover:shadow-lg hover:-translate-y-1"
      data-index="${index}"
    >

      <div class="flex items-center justify-between">

        <div>
          <p class="text-2xl font-black">
            ${formatTime(slot.start)}
          </p>

          <p class="text-xs text-slate-500 mt-1">
            ${slot.customerName || "No Customer"}
          </p>
        </div>

        <span class="rounded-full px-3 py-1 text-xs font-bold
          ${
            slot.status === "AVAILABLE"
              ? "bg-emerald-100 text-emerald-700"
              : slot.status === "HELD"
                ? "bg-yellow-100 text-yellow-700"
                : slot.status === "BOOKED"
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-700"
          }">
          ${slot.status}
        </span>

      </div>

    </button>
  `;
}

async function fetchSlots(date) {
  const res = await fetch(`/api/admin/slots?date=${date}`);

  if (!res.ok) {
    throw new Error("Failed to fetch slots");
  }

  const data = await res.json();

  state.slots = data.slots || [];

  return state.slots;
}

function renderSlots() {
  dom.slotContainer.innerHTML = state.slots
    .map((slot, index) => createSlotCard(slot, index))
    .join("");
}

async function loadSlots() {
  try {
    await fetchSlots(state.currentDate);

    renderSlots();
  } catch (err) {
    console.error(err);

    dom.slotContainer.innerHTML = `
      <div class="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-600 font-bold">
        Failed to load slots.
      </div>
    `;
  }
}
function handleSlotClick(e) {
  const card = e.target.closest(".slot-card");
  console.log(card);

  if (!card) return;

  const index = Number(card.dataset.index);
  console.log(index);

  const slot = state.slots[index];

  if (!slot) return;

  openSlotModal({
    slot,
    callbacks: {
      onManualBooking,
      onBlock,
      onReleaseHold,
      onUnblock,
      onBookingAction,
    },
  });
}

let bookingModal = null;

function getBookingModal() {
  if (bookingModal) return bookingModal;

  bookingModal = document.createElement("div");

  bookingModal.className =
    "fixed inset-0 z-[80] hidden items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4";

  bookingModal.innerHTML = `
    <div class="w-full max-w-lg rounded-3xl bg-white p-6">

      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-black">
          Manual Booking
        </h2>

        <button
          id="manual-close"
          class="w-10 h-10 rounded-xl bg-slate-100"
        >
          ✕
        </button>
      </div>

      <form id="manual-booking-form" class="space-y-5">

        <div class="grid grid-cols-2 gap-4">

          <input
            id="manual-start"
            type="time"
            required
            class="h-12 rounded-xl border px-4"
          />

          <input
            id="manual-end"
            type="time"
            required
            class="h-12 rounded-xl border px-4"
          />

        </div>

        <input
          id="manual-name"
          placeholder="Customer Name"
          class="h-12 w-full rounded-xl border px-4"
          required
        />

        <input
          id="manual-phone"
          placeholder="Phone Number"
          class="h-12 w-full rounded-xl border px-4"
          required
        />

        <input
          id="manual-email"
          placeholder="Email"
          class="h-12 w-full rounded-xl border px-4"
        />

        <textarea
          id="manual-notes"
          placeholder="Notes"
          class="w-full rounded-xl border p-4"
        ></textarea>

        <div>

          <div class="flex gap-6">

            <label>
              <input
                type="radio"
                name="payment-status"
                value="PARTIAL"
                checked
              />
              Advance
            </label>

            <label>
              <input
                type="radio"
                name="payment-status"
                value="FULL"
              />
              Full
            </label>

          </div>

        </div>

        <input
          id="manual-paid"
          type="number"
          placeholder="Amount Received"
          class="h-12 w-full rounded-xl border px-4"
          required
        />

        <button
          class="h-12 w-full rounded-xl bg-emerald-600 font-black text-white"
        >
          Create Booking
        </button>

      </form>

    </div>
  `;

  document.body.appendChild(bookingModal);

  bookingModal
    .querySelector("#manual-close")
    .addEventListener("click", closeManualBooking);

  bookingModal.addEventListener("click", e => {
    if (e.target === bookingModal) {
      closeManualBooking();
    }
  });

  bookingModal
    .querySelector("#manual-booking-form")
    .addEventListener("submit", submitManualBooking);

  return bookingModal;
}

function openManualBooking(slot) {
  const modal = getBookingModal();

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  document.getElementById("manual-start").value = formatTimeForInput(
    slot.start
  );

  document.getElementById("manual-end").value = formatTimeForInput(slot.end);
}

function closeManualBooking() {
  if (!bookingModal) return;

  bookingModal.classList.remove("flex");
  bookingModal.classList.add("hidden");

  bookingModal.querySelector("form").reset();
}

// Done
async function submitManualBooking(e) {
  e.preventDefault();

  const start = buildDateTime(
    state.currentDate,
    document.getElementById("manual-start").value
  );

  const end = buildDateTime(
    state.currentDate,
    document.getElementById("manual-end").value
  );

  const { total } = calculateAmount(start, end);

  const paymentStatus = document.querySelector(
    'input[name="payment-status"]:checked'
  ).value;

  const paid =
    paymentStatus === "FULL"
      ? total
      : Number(document.getElementById("manual-paid").value);

  const payload = {
    start: start.toISOString(),
    end: end.toISOString(),

    customerName: document.getElementById("manual-name").value.trim(),

    customerPhone: document.getElementById("manual-phone").value.trim(),

    customerEmail: document.getElementById("manual-email").value.trim(),

    totalAmount: total,

    paidAmount: paid,

    paymentMethod: "CASH",

    // notes: document.getElementById("manual-notes").value.trim(),
  };

  console.log("Manual Booking Payload:", payload);

  try {
    const res = await fetch("/api/admin/V2/bookings/create", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log(data);

    if (!res.ok) {
      throw new Error(data.message || "Booking failed");
    }

    closeManualBooking();

    await refreshSlots();
  } catch (err) {
    console.error(err);

    alert(err.message);
  }
}

async function onManualBooking(slot) {
  closeSlotModal();
  openManualBooking(slot);
}

// Done
async function onBlock(slot) {
  try {
    await api("/api/admin/slots/block", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start: slot.start,
        end: slot.end,
      }),
    });

    await refreshSlots(slot.slotId);
  } catch (err) {
    console.error(err);
  }
}

async function onReleaseHold(slot) {
  await api(`/api/admin/slots/${slot.slotId}/release`, {
    method: "PATCH",
  });

  closeSlotModal();

  await refreshSlots();
}

//Done
async function onUnblock(slot) {
  await api("/api/admin/slots/unblock", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start: slot.start,
      end: slot.end,
    }),
  });

  closeSlotModal();

  await refreshSlots();
}

async function onBookingAction(slot, payload) {
  if (payload.action === "cancelBooking") {
    await api(`/api/admin/bookings/${slot.bookingId}`, {
      method: "DELETE",
    });

    closeSlotModal();

    await refreshSlots();

    return;
  }

  await api("/api/admin/V2/bookings/update", {
    method: "PATCH",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      bookingId: slot.bookingId,
      paidOn: payload.paidOnSpot,
      isCompleted: payload.isCompleted,
    }),
  });

  closeSlotModal();

  await refreshSlots();
}

function showError(error) {
  console.error(error);

  alert(error.message || "Something went wrong");
}

document.addEventListener("DOMContentLoaded", () => {
  const currentPage = window.location.pathname
    .split("/")
    .pop()
    .replace(".html", "");

  document.querySelectorAll(".nav-link").forEach(link => {
    const page = link.dataset.page;

    if (page === currentPage) {
      link.classList.remove("text-slate-500");
      link.classList.add("bg-emerald-500", "text-white", "shadow-lg");
    } else {
      link.classList.remove("bg-emerald-500", "text-white", "shadow-lg");
      link.classList.add("text-slate-500");
    }
  });

  const today = new Date();

  state.currentDate = today.toISOString().split("T")[0];

  dom.datePicker.value = state.currentDate;

  loadSlots();

  dom.datePicker.addEventListener("change", e => {
    state.currentDate = e.target.value;

    loadSlots();
  });

  dom.slotContainer.addEventListener("click", handleSlotClick);
});
