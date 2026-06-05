import { dom } from "./dom.dashboard.js";

let clampDate = () => {
  let start = new Date();
  let end = new Date();

  let status = dom.searchByStatusSelect.value;
  const filter = dom.searchForSelect.value;

  if (filter === "today") {
    start = new Date();
    end = new Date();
  } else if (filter === "tomorrow") {
    start = new Date();
    end = new Date();

    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  } else {
    start = new Date();
    end = new Date();

    start.setDate(start.getDate() - 7);
  }

  if (status === "confirmed" || status === "pending") {
    status = "PAID";
  } else if (status === "cancelled") {
    status = "CANCELLED";
  }

  return { start, end, status };
};
document.addEventListener("DOMContentLoaded", async () => {
  const { start, end, status } = clampDate();

  await fetchBookingsByDate(
    start.toISOString().split("T")[0],
    end.toISOString().split("T")[0],
    status
  );

  let debounceTimer;
  dom.searchInput.addEventListener("input", async e => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      let filters = {
        id: e.target.value,
      };
      fetchBookings(filters);
    }, 500);
  });
  dom.searchForSelect.addEventListener("change", async () => {
    const { start, end, status } = clampDate();

    await fetchBookingsByDate(
      start.toISOString().split("T")[0],
      end.toISOString().split("T")[0],
      status
    );
  });
  dom.searchByStatusSelect.addEventListener("change", async () => {
    const { start, end, status } = clampDate();

    await fetchBookingsByDate(
      start.toISOString().split("T")[0],
      end.toISOString().split("T")[0],
      status
    );
  });
});

async function fetchBookings(filter) {
  try {
    const queryParam = new URLSearchParams(filter);

    const response = await fetch(
      `/api/admin/V2/bookings?${queryParam.toString()}`
    );

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Raw API Response:", data);
    const bookings = data.bookings || [];
    console.log("Fetched Bookings:", bookings);

    dom.bookingDataContainer.innerHTML = "";

    if (bookings.length === 0) {
      dom.bookingDataContainer.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-10 text-slate-400">
            No bookings found
          </td>
        </tr>
      `;
      return;
    }

    bookings.forEach(booking => {
      const initials = booking.customerName
        .split(" ")
        .map(word => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      const statusColor =
        booking.status === "PAID"
          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
          : booking.status === "PARTIAL"
            ? "bg-yellow-50 text-yellow-700 border-yellow-100"
            : "bg-red-50 text-red-700 border-red-100";

      dom.bookingDataContainer.innerHTML += `
    <tr class="hover:bg-slate-50/60 transition-all duration-200 group">

      <td class="px-8 py-5">
        <div class="flex items-center gap-4">

          <div
            class="w-11 h-11 rounded-2xl bg-slate-100
            text-slate-700 flex items-center justify-center
            font-black text-xs"
          >
            ${initials}
          </div>

          <div>
            <p class="font-bold text-slate-800">
              ${booking.customerName}
            </p>

            <p class="text-xs text-slate-400 mt-1">
              ${booking.bookingId}
            </p>
          </div>

        </div>
      </td>

      <td class="px-6 py-5">
        <div class="font-bold text-slate-700">
          ${booking.date}
        </div>

        <div class="text-xs text-slate-500 mt-1">
          ${booking.startTime}
        </div>
      </td>

      <td class="px-6 py-5">
        <div class="font-black text-slate-800">
          ₹${booking.amountPaid.toLocaleString("en-IN")}
        </div>

        <div class="text-xs text-slate-400 mt-1 uppercase font-bold">
          ${booking.paymentMethod || "ONLINE"}
        </div>
      </td>

      <td class="px-6 py-5">
        <span
          class="
            inline-flex items-center
            px-3 py-1 rounded-full
            text-[10px] font-black uppercase tracking-wider
            border
            ${statusColor}
          "
        >
          ${booking.status}
        </span>
      </td>

      <td class="px-8 py-5 text-right">
        <button
          class="
            booking-action-btn
            px-4 py-2 rounded-2xl
            bg-slate-900 text-white
            hover:scale-105 active:scale-95
            transition-all duration-200
            text-xs font-black
          "
          data-booking='${JSON.stringify(booking)}'
        >
          View
        </button>
      </td>

    </tr>
  `;
      dom.mobileContainer.innerHTML += `
<div class="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">

  <div class="flex justify-between items-start mb-4">

    <div class="flex items-center gap-3">

      <div
        class="
          w-11 h-11 rounded-2xl
          bg-slate-100 text-slate-700
          flex items-center justify-center
          font-black text-xs
        "
      >
        ${initials}
      </div>

      <div>
        <p class="font-bold text-slate-800">
          ${booking.customerName}
        </p>

        <p class="text-xs text-slate-400">
          ${booking.bookingId}
        </p>
      </div>

    </div>

    <span class="
      px-3 py-1 rounded-full
      text-[10px] font-black uppercase
      border ${statusColor}
    ">
      ${booking.status}
    </span>

  </div>

  <div class="grid grid-cols-2 gap-3 mb-4">

    <div class="bg-white p-4 rounded-2xl border border-slate-100">
      <p class="text-[10px] text-slate-400 uppercase font-black">
        Slot
      </p>

      <p class="text-lg font-black text-slate-800 mt-1">
        ${booking.startTime}
      </p>
    </div>

    <div class="bg-white p-4 rounded-2xl border border-slate-100">
      <p class="text-[10px] text-slate-400 uppercase font-black">
        Payment
      </p>

      <p class="text-lg font-black text-emerald-600 mt-1">
        ₹${booking.amountPaid.toLocaleString("en-IN")}
      </p>
    </div>

  </div>

  <button
    class="
      booking-action-btn
      w-full py-4 rounded-2xl
      bg-slate-900 text-white
      font-black text-sm
      hover:scale-[1.01]
      active:scale-[0.99]
      transition-all
    "
    data-booking='${JSON.stringify(booking)}'
  >
    View Details
  </button>

</div>
`;
    });

    document.addEventListener("click", e => {
      const btn = e.target.closest(".booking-action-btn");

      if (!btn) return;

      const booking = JSON.parse(btn.dataset.booking);

      openBookingModal(booking);
    });
  } catch (error) {
    console.error("Fetch Booking Error:", error);
  }
}
async function fetchBookingsByDate(start, end, status) {
  try {
    const response = await fetch(
      `/api/admin/V2/bookings?start=${start}&end=${end}&status=${status}`
    );

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Raw API Response:", data);
    const bookings = data.bookings || [];
    console.log("Fetched Bookings:", bookings);

    dom.bookingDataContainer.innerHTML = "";

    if (bookings.length === 0) {
      dom.bookingDataContainer.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-10 text-slate-400">
            No bookings found
          </td>
        </tr>
      `;
      return;
    }

    bookings.forEach(booking => {
      const initials = booking.customerName
        .split(" ")
        .map(word => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      const statusColor =
        booking.status === "PAID"
          ? "bg-emerald-50 text-emerald-700 border-emerald-100"
          : booking.status === "PARTIAL"
            ? "bg-yellow-50 text-yellow-700 border-yellow-100"
            : "bg-red-50 text-red-700 border-red-100";

      dom.bookingDataContainer.innerHTML += `
    <tr class="hover:bg-slate-50/60 transition-all duration-200 group">

      <td class="px-8 py-5">
        <div class="flex items-center gap-4">

          <div
            class="w-11 h-11 rounded-2xl bg-slate-100
            text-slate-700 flex items-center justify-center
            font-black text-xs"
          >
            ${initials}
          </div>

          <div>
            <p class="font-bold text-slate-800">
              ${booking.customerName}
            </p>

            <p class="text-xs text-slate-400 mt-1">
              ${booking.bookingId}
            </p>
          </div>

        </div>
      </td>

      <td class="px-6 py-5">
        <div class="font-bold text-slate-700">
          ${booking.date}
        </div>

        <div class="text-xs text-slate-500 mt-1">
          ${booking.startTime}
        </div>
      </td>

      <td class="px-6 py-5">
        <div class="font-black text-slate-800">
          ₹${booking.amountPaid.toLocaleString("en-IN")}
        </div>

        <div class="text-xs text-slate-400 mt-1 uppercase font-bold">
          ${booking.paymentMethod || "ONLINE"}
        </div>
      </td>

      <td class="px-6 py-5">
        <span
          class="
            inline-flex items-center
            px-3 py-1 rounded-full
            text-[10px] font-black uppercase tracking-wider
            border
            ${statusColor}
          "
        >
          ${booking.status}
        </span>
      </td>

      <td class="px-8 py-5 text-right">
        <button
          class="
            booking-action-btn
            px-4 py-2 rounded-2xl
            bg-slate-900 text-white
            hover:scale-105 active:scale-95
            transition-all duration-200
            text-xs font-black
          "
          data-booking='${JSON.stringify(booking)}'
        >
          View
        </button>
      </td>

    </tr>
  `;
      dom.mobileContainer.innerHTML += `
<div class="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">

  <div class="flex justify-between items-start mb-4">

    <div class="flex items-center gap-3">

      <div
        class="
          w-11 h-11 rounded-2xl
          bg-slate-100 text-slate-700
          flex items-center justify-center
          font-black text-xs
        "
      >
        ${initials}
      </div>

      <div>
        <p class="font-bold text-slate-800">
          ${booking.customerName}
        </p>

        <p class="text-xs text-slate-400">
          ${booking.bookingId}
        </p>
      </div>

    </div>

    <span class="
      px-3 py-1 rounded-full
      text-[10px] font-black uppercase
      border ${statusColor}
    ">
      ${booking.status}
    </span>

  </div>

  <div class="grid grid-cols-2 gap-3 mb-4">

    <div class="bg-white p-4 rounded-2xl border border-slate-100">
      <p class="text-[10px] text-slate-400 uppercase font-black">
        Slot
      </p>

      <p class="text-lg font-black text-slate-800 mt-1">
        ${booking.startTime}
      </p>
    </div>

    <div class="bg-white p-4 rounded-2xl border border-slate-100">
      <p class="text-[10px] text-slate-400 uppercase font-black">
        Payment
      </p>

      <p class="text-lg font-black text-emerald-600 mt-1">
        ₹${booking.amountPaid.toLocaleString("en-IN")}
      </p>
    </div>

  </div>

  <button
    class="
      booking-action-btn
      w-full py-4 rounded-2xl
      bg-slate-900 text-white
      font-black text-sm
      hover:scale-[1.01]
      active:scale-[0.99]
      transition-all
    "
    data-booking='${JSON.stringify(booking)}'
  >
    View Details
  </button>

</div>
`;
    });

    document.addEventListener("click", e => {
      const btn = e.target.closest(".booking-action-btn");

      if (!btn) return;

      const booking = JSON.parse(btn.dataset.booking);

      openBookingModal(booking);
    });
  } catch (error) {
    console.error("Fetch Booking Error:", error);
  }
}

function openBookingModal(booking) {
  const modal = document.getElementById("booking-modal");
  const content = document.getElementById("booking-modal-content");
  const bookingId = document.getElementById("modal-booking-id");

  bookingId.textContent = booking.bookingId;

  content.innerHTML = `
    <div class="grid md:grid-cols-2 gap-6">

      <div class="bg-slate-50 rounded-3xl p-6 border border-slate-100">
        <p class="text-xs font-black uppercase text-slate-400 mb-4">
          Customer Information
        </p>

        <div class="space-y-4">

          <div>
            <p class="text-xs text-slate-400">Customer Name</p>
            <p class="font-bold text-slate-800">
              ${booking.customerName}
            </p>
          </div>

          <div>
            <p class="text-xs text-slate-400">Email</p>
            <p class="font-bold text-slate-800">
              ${booking.customerEmail || "N/A"}
            </p>
          </div>

        </div>
      </div>

      <div class="bg-slate-50 rounded-3xl p-6 border border-slate-100">
        <p class="text-xs font-black uppercase text-slate-400 mb-4">
          Booking Information
        </p>

        <div class="space-y-4">

          <div>
            <p class="text-xs text-slate-400">Date</p>
            <p class="font-bold text-slate-800">
              ${booking.date}
            </p>
          </div>

          <div>
            <p class="text-xs text-slate-400">Start Time</p>
            <p class="font-bold text-slate-800">
              ${booking.startTime}
            </p>
          </div>

          <div>
            <p class="text-xs text-slate-400">Status</p>
            <p class="font-bold text-slate-800">
              ${booking.status}
            </p>
          </div>

          <div>
            <p class="text-xs text-slate-400">Amount Paid</p>
            <p class="font-black text-emerald-600 text-xl">
              ₹${booking.amountPaid.toLocaleString("en-IN")}
            </p>
          </div>

          <div>
            <p class="text-xs text-slate-400">Amount Due</p>
            <p class="font-black text-emerald-600 text-xl">
              ₹${(booking.totalAmount - booking.amountPaid).toLocaleString("en-IN")}
            </p>
          </div>

        </div>
      </div>

    </div>
  `;

  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

document.getElementById("close-booking-modal").addEventListener("click", () => {
  const modal = document.getElementById("booking-modal");

  modal.classList.add("hidden");
  modal.classList.remove("flex");
});
