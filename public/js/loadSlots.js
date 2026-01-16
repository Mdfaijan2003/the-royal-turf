import { dom } from "./dom.js";
export async function loadSlots() {
  // Get the selected date from the input field.
  
  const selectedDate = dom.slotSelectedDate.value;
  
  if (!selectedDate) {
    alert("Please select a date first.");
    return;
  }

  // Get references to the UI elements for a better user experience.
  const loading = document.getElementById("slotsLoading");
  const empty = document.getElementById("slotsEmpty");
  const container = document.getElementById("slotsContainer");

  // Reset the UI to its initial state before fetching new data.
  loading.classList.remove("hidden"); // Show the loading indicator.
  empty.classList.add("hidden"); // Hide the 'empty' message.
  container.innerHTML = ""; // Clear any previously rendered slots.

  try {
    
    const res = await fetch(`/api/slots?date=${selectedDate}`);
    // Parse the JSON data from the response.
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to fetch slots");
    }

    const allSlots = data.slots;
    const bookedSlots = allSlots.filter(slot => slot.status === "BOOKED");

    if (!bookedSlots || bookedSlots.length === 0) {
      empty.classList.remove("hidden"); // Show the 'empty' message.
      // Update the message to be more engaging and add a "Book Now" button.
      empty.innerHTML = `
                <p class="text-gray-700 text-lg font-medium">✨ Great news! The whole day is available to book.</p>
                <a href="booking"
                        class="inline-block bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transition-all duration-300 transform hover:scale-105">
                        Book Now
                </a>
            `;
      return; // Stop the function here.
    }

    bookedSlots.forEach(slot => {
      // Format the start and end times into a readable format (e.g., 10:00 AM — 11:00 AM).
      const startTime = new Date(slot.start).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      const endTime = new Date(slot.end).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const card = document.createElement("div");
      card.className =
        "border rounded-lg p-4 shadow-md bg-red-100 border-red-300";

      card.innerHTML = `
                <h3 class="text-lg font-semibold">${startTime} — ${endTime}</h3>
                <p class="mt-2 text-red-600 font-medium">Status: BOOKED</p>
            `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading slots:", err);
    empty.classList.remove("hidden");
    empty.innerHTML = `<p class="text-red-500">⚠️ ${err.message}</p>`;
  } finally {
    loading.classList.add("hidden");
  }
}
