import { dom } from "./dom.js";
export async function loadSlots() {
  const selectedDate = dom.slotSelectedDate.value;

  if (!selectedDate) {
    alert("Please select a date first.");
    return;
  }

  // Get references to the UI elements for a better user experience.
  let loading = document.getElementById("slotsLoading");
  let empty = document.getElementById("slotsEmpty");
  const container = document.getElementById("slotsContainer");

  loading.classList.remove("hidden"); // Show the loading indicator.
  // empty.classList.add("hidden"); // Hide the 'empty' message.
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
      console.log("No booked slots found for the selected date.");
      empty.classList.remove("hidden");
      empty.classList.add("block", "w-full", "mt-6");

      empty.innerHTML = `
<div style="background-color: #ffffff; border: 1px solid #d1fae5; border-top: 6px solid #059669; border-radius: 12px; padding: 48px 24px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">

    <div style="width: 64px; height: 64px; margin: 0 auto 24px auto; border-radius: 50%; background-color: #ecfdf5; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 32px;">⚽</span>
    </div>

    <h3 style="font-family: 'Bebas Neue', sans-serif; font-size: 36px; color: #111827; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
        Entire Day <span style="color: #059669;">Available</span>
    </h3>

    <p style="font-family: 'DM Sans', sans-serif; color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 32px; max-width: 300px; margin-left: auto; margin-right: auto;">
        No bookings found for this date. All slots are currently available.
    </p>

    <a href="/booking.html" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 14px 32px; border-radius: 50px; font-family: 'Bebas Neue', sans-serif; font-size: 20px; text-decoration: none; text-transform: uppercase; letter-spacing: 2px; transition: all 0.3s ease; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.2);">
        Book Now
    </a>

</div>
`;

      return;
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
