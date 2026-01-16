import { dom } from "./dom.js";
import { loadSlots } from "./loadSlots.js";

const mobileMenuButton = document.getElementById("mobile-menu-button");
const mobileMenu = document.getElementById("mobile-menu");

mobileMenuButton?.addEventListener("click", () => {
  mobileMenu?.classList.toggle("hidden");
});
const header = document.getElementById("site-header");
const inner = document.getElementById("header-inner");
const title = document.getElementById("header-title");

window?.addEventListener("scroll", () => {
  if (window.scrollY > 80) {
    // Shrink state
    header.classList.remove("top-4");
    header.classList.add("top-2");

    inner.classList.remove("px-6", "py-3");
    inner.classList.add("px-5", "py-2");

    title.classList.remove("text-lg");
    title.classList.add("text-base");
  } else {
    // Default state
    header.classList.add("top-4");
    header.classList.remove("top-2");

    inner.classList.add("px-6", "py-3");
    inner.classList.remove("px-5", "py-2");

    title.classList.add("text-lg");
    title.classList.remove("text-base");
  }
});

document?.addEventListener("DOMContentLoaded", () => {
  dom.checkSlotsBtn?.addEventListener("click", e => {
    loadSlots();
  });
  dom.fetchBookingBtn?.addEventListener("click", async () => {
    const email = document.getElementById("booking-email").value.trim();
    const results = document.getElementById("booking-results");
    const skeleton = document.getElementById("booking-skeleton");

    if (!email) {
      alert("Please enter an email");
      return;
    }

    results.innerHTML = "";
    results.classList.add("hidden");
    skeleton.classList.remove("hidden");

    try {
      const res = await fetch(`/api/bookings?email=${email}`);
      const bookings = await res.json();

      skeleton.classList.add("hidden");
      results.classList.remove("hidden");

      if (!res.ok || bookings.length === 0) {
        results.innerHTML =
          "<p class='text-center text-slate-400'>No bookings found</p>";
        return;
      }

      bookings.forEach(b => {
        const shortBookingId = b._id.slice(-6).toUpperCase();
        const div = document.createElement("div");
        div.className =
          "bg-slate-800 border-l-4 border-indigo-600 shadow-lg rounded-xl p-5";

        div.innerHTML = `
      <div class="flex justify-between items-center">
        <div>
          <p class="font-semibold text-slate-200">Royal Turf Booking</p>
          <p class="text-sm text-slate-300">
            ${new Date(b.start).toLocaleDateString()} •
            ${new Date(b.start).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })} –
            ${new Date(b.end).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <p class="text-xs text-slate-300 mt-1">
            Booking ID: ${shortBookingId}
          </p>
        </div>
    
        <span class="px-3 py-1 text-sm rounded-full ${
          b.status === "PAID"
            ? "bg-green-100 text-green-700"
            : b.status === "HELD"
            ? "bg-yellow-100 text-yellow-700"
            : "bg-gray-200 text-gray-700"
        }">
          ${b.status === "PAID" ? "Adv Paid" : b.status}
        </span>
      </div>

      <div class="mt-3 text-sm text-slate-400 space-y-1">
        <p>Total Amount: <span class="font-bold text-slate-300">₹${b.totalAmount}</span></p>
        <p>Advance Paid: <span class="font-bold text-slate-300">₹${b.advanceAmount}</span></p>
        <p>Remaining to Pay: <span class="font-bold text-slate-300">₹${b.remainingAmount}</span></p>
        <p class="text-xs text-slate-300">
          Payment Method: ${b.paymentMethod}
        </p>
      </div>
    `;

        results.appendChild(div);
      });
    } catch (err) {
      console.log("Fetch bookings error:", err);  
      skeleton.classList.add("hidden");
      results.classList.remove("hidden");
      results.innerHTML =
        "<p class='text-center text-red-500'>Failed to load bookings</p>";
    }
  });
});
