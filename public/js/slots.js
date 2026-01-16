import { dom } from "./dom.js";
import { state } from "./state.js";
import { showModal } from "./modal.js";

/* ===============================
   FETCH & RENDER SLOTS
================================ */

export async function updateAvailableSlots() {
  dom.startTime.innerHTML = '<option value="">Start Time</option>';
  dom.endTime.innerHTML = '<option value="">End Time</option>';

  const selectedDate = dom.dateInput.value;
  if (!selectedDate) return;

  state.booking.date = selectedDate;

  try {
    const res = await fetch(`/api/slots?date=${selectedDate}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to fetch slots");

    const rawSlots = data.slots.sort(
      (a, b) => new Date(a.start) - new Date(b.start)
    );

    console.log("Fetched slots:", rawSlots);
    // Save slots in state
    state.fetchedSlots = rawSlots.map(slot => ({
      start: new Date(slot.start),
      end: new Date(slot.end),
      status: slot.status,
    }));
    console.log(state.fetchedSlots);

    // Populate START TIME dropdown
    rawSlots.forEach(slot => {
      const startDate = new Date(slot.start);

      const startOption = document.createElement("option");
      startOption.value = formatTime(startDate);
      startOption.text = startDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      if (slot.status === "BOOKED") {
        startOption.disabled = true;
        startOption.style.backgroundColor = "#ffe4e6";
        startOption.style.color = "#be123c";
      } else if (slot.status === "HELD") {
        startOption.disabled = true;
        startOption.style.backgroundColor = "#fef3c7";
        startOption.style.color = "#92400e";
      } else {
        startOption.style.color = "#047857";
        startOption.style.backgroundColor = "#d1fae5";
      }

      dom.startTime.appendChild(startOption);
    });
  } catch (error) {
    showModal("Error loading slots", error.message, "error");
  }
}

/* ===============================
   END TIME POPULATION (ONE TIME)
================================ */

export function populateEndTimes() {
  dom.endTime.innerHTML = '<option value="">End Time</option>';

  const { date, startTime } = state.booking;
  if (!date || !startTime) return;

  console.log("Populating end times for", date, startTime);

  if (startTime === "00:00") {
    const option = document.createElement("option");
    option.value = "01:00";
    option.textContent = "01:00 AM";
    dom.endTime.appendChild(option);
    return;
  }

  const start = new Date(`${date}T${startTime}:00`);
  console.log("Fetched Slots are : ", state.fetchedSlots);

  for (const slot of state.fetchedSlots) {
    if (slot.end <= start) continue;

    if (slot.status === "BOOKED" || slot.status === "HELD") break;

    const option = document.createElement("option");
    option.value = formatTime(slot.end);
    option.textContent = slot.end.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    option.style.color = "#047857";
    option.style.backgroundColor = "#d1fae5";
    dom.endTime.appendChild(option);
  }
}

/* ===============================
   HELPERS
================================ */

function formatTime(date) {
  return date.toTimeString().slice(0, 5); // HH:mm (LOCAL, SAFE)
}
