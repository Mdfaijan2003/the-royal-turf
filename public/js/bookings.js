import { dom } from "./dom.js";
import { state } from "./state.js";
import { updateAvailableSlots } from "./slots.js";
import { calculateAmount } from "./pricing.js";

/* ===============================
   STATE SYNC FROM UI
================================ */

// Start time change
dom.startTime.addEventListener("change", () => {
  state.booking.startTime = dom.startTime.value;
  updateSummary();
});

// End time change
dom.endTime.addEventListener("change", () => {
  state.booking.endTime = dom.endTime.value;
  updateSummary();
});

// Date change
dom.dateInput.addEventListener("change", () => {
  const date = dom.dateInput.value;
  state.booking.date = date;

  // 🔁 Reset time selection
  state.booking.startTime = "";
  state.booking.endTime = "";

  dom.startTime.value = "";
  dom.endTime.value = "";

  resetSummaryUI();

  if (!date) return; // ⛔ guard

  updateAvailableSlots();
});

/* ===============================
   BOOKING SUMMARY LOGIC
================================ */

function updateSummary() {
  const { date, startTime, endTime } = state.booking;
  if (!date || !startTime || !endTime) {
    resetSummaryUI();
    return;
  }

  let startHour = timeToHour(startTime);
  let endHour = timeToHour(endTime);

  // ✅ CROSS MIDNIGHT FIX
  if (endHour <= startHour) {
    endHour += 24; // 1 AM → 25
  }

  const hours = endHour - startHour;
  if (hours <= 0) {
    resetSummaryUI();
    return;
  }

  const total = hours * 1000;
  const advance = Math.round(total * 0.3);

  dom.selectedTime.textContent =
    `${startTime} - ${endTime} (${hours} hrs)`;

  dom.bookingFees.textContent = `₹${total}`;
  dom.advanceAmount.textContent = `₹${advance}`;
  dom.totalPayable.textContent = `₹${advance}`;

  state.booking.totalFee = total;
  state.booking.advance = advance;
}


/* ===============================
   HELPERS
================================ */

function resetSummaryUI(label = "-") {
  dom.selectedTime.textContent = label;
  dom.bookingFees.textContent = "₹0";
  dom.advanceAmount.textContent = "₹0";
  dom.totalPayable.textContent = "₹0";
}
