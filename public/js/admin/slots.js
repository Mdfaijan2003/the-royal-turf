import { dom } from "./dom.dashboard.js";

const slotState = {
  currentDate: null,
  modal: null,
};

function formatTimeForInput(dateString) {
  const date = new Date(dateString);

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildDateTime(date, time) {
  return new Date(`${date}T${time}:00`);
}

function calculateAmount(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date)) {
    return {
      total: 0,
      advance: 0,
    };
  }

  // Handle next day booking
  if (end <= start) {
    end = new Date(end);
    end.setDate(end.getDate() + 1);
  }

  let total = 0;

  let current = new Date(start);

  while (current < end) {
    const nextHour = new Date(current);
    nextHour.setHours(current.getHours() + 1, 0, 0, 0);

    const segmentEnd = nextHour > end ? end : nextHour;

    const hours = (segmentEnd - current) / 36e5;

    const isWeekend = [0, 6].includes(current.getDay());

    const hour = current.getHours();

    let rate = 0;

    // Day Pricing
    if (hour >= 6 && hour < 17) {
      rate = isWeekend ? 1000 : 800;
    }

    // Evening/Night Pricing
    else {
      rate = isWeekend ? 1300 : 1100;
    }

    total += rate * hours;

    current = nextHour;
  }

  total = Math.round(total);

  return {
    total,
    advance: Math.round(total * 0.3),
  };
}

function startCountdowns() {
  const countdowns = document.querySelectorAll(".countdown");

  countdowns.forEach(countdown => {
    const expiryTime = new Date(countdown.dataset.expiry).getTime();

    function updateTimer() {
      const now = Date.now();

      const diff = expiryTime - now;

      if (diff <= 0) {
        countdown.textContent = "EXPIRED";

        countdown.classList.remove("text-yellow-600");

        countdown.classList.add("text-red-500");

        return;
      }

      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      countdown.textContent = `${String(minutes).padStart(
        2,
        "0"
      )}:${String(seconds).padStart(2, "0")}`;
    }

    updateTimer();

    setInterval(updateTimer, 1000);
  });
}

function createViewBookingModal() {
  const modal = document.createElement("div");

  modal.id = "view-booking-modal";

  modal.className =
    "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 hidden items-center justify-center p-4";

  modal.innerHTML = `
    <div class="w-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-2xl">

      <div class="flex items-center justify-between px-6 py-5 border-b">
        <h2 class="text-xl font-black text-slate-800">
          Booking Details
        </h2>

        <button
          id="close-view-booking-modal"
          class="w-10 h-10 rounded-xl bg-slate-100 hover:bg-red-100 hover:text-red-500 transition"
        >
          ✕
        </button>
      </div>

      <div class="p-6 space-y-5">

        <div class="space-y-3 bg-slate-50 rounded-2xl p-4">

          <div class="flex justify-between">
            <span class="text-slate-500 text-sm">Total Amount</span>
            <span id="view-total" class="font-black text-slate-800"></span>
          </div>

          <div class="flex justify-between">
            <span class="text-slate-500 text-sm">Advance Paid</span>
            <span id="view-advance" class="font-black text-emerald-600"></span>
          </div>

          <div class="flex justify-between">
            <span class="text-slate-500 text-sm">Remaining Amount</span>
            <span id="view-remaining" class="font-black text-red-500"></span>
          </div>

        </div>

        <div>
          <label class="block text-sm font-bold text-slate-700 mb-2">
            Paid On Spot
          </label>

          <input
            type="number"
            id="paid-on-spot"
            class="w-full h-12 border border-slate-200 rounded-xl px-4"
            placeholder="Enter amount"
          />
        </div>

        <div>

          <p class="text-sm font-bold text-slate-700 mb-3">
            Booking Completed?
          </p>

          <div class="grid grid-cols-2 gap-3">

            <label class="border rounded-2xl p-4 cursor-pointer">

              <input
                type="radio"
                name="booking-complete"
                value="YES"
                class="mr-2"
              />

              Completed

            </label>

            <label class="border rounded-2xl p-4 cursor-pointer">

              <input
                type="radio"
                name="booking-complete"
                value="NO"
                checked
                class="mr-2"
              />

              Not Completed

            </label>

          </div>

        </div>

        <div
          id="discount-note"
          class="hidden bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs p-3 rounded-xl"
        >
          Remaining amount will be treated as DISCOUNT.
        </div>

        <button
          id="save-booking-update"
          class="w-full h-12 rounded-xl bg-slate-900 text-white font-black"
        >
          Save Changes
        </button>

      </div>

    </div>
  `;

  document.body.appendChild(modal);

  return modal;
}

function openViewBookingModal(slotCard) {
  console.log(slotCard.dataset);
  const total = Number(slotCard.dataset.total || 0);
  const advance = Number(slotCard.dataset.advance || 0);
  const remaining = Number(slotCard.dataset.remaining || 0);
  const bookingId = slotCard.dataset.bookingId;
  console.log(bookingId);

  document.getElementById("view-total").textContent = `₹${total}`;
  document.getElementById("view-advance").textContent = `₹${advance}`;
  document.getElementById("view-remaining").textContent = `₹${remaining}`;

  const modal = document.getElementById("view-booking-modal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");

  const paidInput = document.getElementById("paid-on-spot");
  paidInput.value = "";

  document.querySelector('input[name="booking-complete"][value="NO"]').checked =
    true;
  const radios = document.querySelectorAll('input[name="booking-complete"]');

  function checkDiscountLogic() {
    const paid = Number(paidInput.value || 0);

    const completed = document.querySelector(
      'input[name="booking-complete"]:checked'
    )?.value;

    const finalRemaining = remaining - paid;

    const note = document.getElementById("discount-note");

    if (completed === "YES" && finalRemaining > 0) {
      note.classList.remove("hidden");
    } else {
      note.classList.add("hidden");
    }
  }

  paidInput.oninput = checkDiscountLogic;

  radios.forEach(radio => {
    radio.onchange = checkDiscountLogic;
  });
}

function closeViewBookingModal() {
  const modal = document.getElementById("view-booking-modal");
  modal.classList.remove("flex");
  modal.classList.add("hidden");
}

/* ===============================
   SLOT CARDS
================================ */

function createSlotCard(slot) {
  const startTime = new Date(slot.start).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  console.log(slot);

  if (slot.status === "BOOKED") {
    const customerName = slot.customerName;
    const bookingId = `BT-${String(slot.bookingId).slice(-4).toUpperCase()}`;
    const status = slot.paymentStatus === "PARTIAL" ? "Adv Paid" : "Full Paid";
    const statusColor =
      slot.paymentStatus === "PARTIAL" ? "text-orange-400" : "text-emerald-400";

    return `
<div 
  class="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden bento-card border-slate-900"
  data-start="${slot.start}"
  data-end="${slot.end}"
  data-booking-id="${slot.bookingId || ""}"
  data-customer="${slot.customerName || ""}"
  data-phone="${slot.customerPhone || ""}"
  data-email="${slot.customerEmail || ""}"
  data-total="${slot.totalAmount || 0}"
  data-advance="${slot.advanceAmount || 0}"
  data-remaining="${slot.remainingAmount || 0}"
>
  <div class="flex justify-between items-start mb-4">
    <div>
      <p class="text-3xl font-black">${startTime}</p>
    </div>
    <span class="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-bold uppercase tracking-wider text-slate-300">
      Turf A
    </span>
  </div>

  <div class="space-y-1 mb-4">
    <p class="text-sm font-bold text-yellow-400">${customerName}</p>
    <p class="text-xs text-slate-400">
      #${bookingId} • <span class="${statusColor}">${status}</span>
    </p>
  </div>

  <!-- Always-visible action row, no hover needed -->
  <div class="flex gap-2 mt-2">
    <button class="view-booking-btn flex-1 bg-white/10 active:bg-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors">
      View
    </button>
    <button class="cancel-booking-btn flex-1 bg-red-500/10 active:bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors">
      Cancel
    </button>
  </div>
</div>
`;
  }

  if (slot.status === "AVAILABLE") {
    return `
      <div 
        class="bg-emerald-50/50 rounded-[2rem] p-6 border-2 border-emerald-500/30 relative bento-card shadow-md shadow-emerald-50/50 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-300 ease-in-out"
        data-start="${slot.start}"
        data-end="${slot.end}"
      >

        <span class="absolute top-4 right-4 flex items-center gap-1.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">

          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>

          Open
        </span>

        <div class="flex justify-between items-start mb-4 pt-1">
          <div>
            <p class="text-3xl font-black text-slate-800">${startTime}</p>

            <p class="text-xs font-semibold text-slate-400 mt-0.5">
              Ready to book
            </p>
          </div>
        </div>

        <div class="bg-white p-3 rounded-xl border border-emerald-100 mb-4 flex items-center justify-center gap-2">

          <button class="block-slot-btn text-xs font-bold text-red-600">
            Block / Unblock
          </button>

        </div>

        <div class="flex">
          <button class="hold-slot-btn w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-bold tracking-wide transition-colors duration-200 shadow-md shadow-emerald-200 active:scale-[0.98]">
            Hold / Book This Slot
          </button>
        </div>

      </div>
    `;
  }

  if (slot.status === "HELD") {
    return `
      <div 
        class="bg-yellow-50 rounded-[2rem] p-6 border-2 border-yellow-400 relative bento-card shadow-lg shadow-yellow-100"
        data-start="${slot.start}"
        data-end="${slot.end}"
      >

        <span class="absolute top-4 right-4 flex h-3 w-3">

          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>

          <span class="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>

        </span>

        <div class="flex justify-between items-start mb-2">
          <div>
            <p class="text-3xl font-black text-slate-800">${startTime}</p>
          </div>
        </div>

        <div class="bg-white p-3 rounded-xl border border-yellow-200 mb-3">

          <p class="text-[10px] font-bold text-slate-400 uppercase text-center">
            Expires In
          </p>

          <p 
            class="text-xl font-black text-center text-yellow-600 font-mono countdown"
            data-expiry="${slot.expiresAt}"
          >
            00:00
          </p>

        </div>

        <div class="flex gap-2">

          <button class="complete-booking-btn flex-1 bg-slate-900 text-white py-2 rounded-lg text-xs font-bold">
            Book
          </button>

          <button class="release-slot-btn flex-1 border border-slate-200 bg-white text-slate-500 py-2 rounded-lg text-xs font-bold hover:text-red-500">
            Release
          </button>

        </div>

      </div>
    `;
  }

  return "";
}

/* ===============================
   MODAL MANAGEMENT
================================ */

function createBookingModal() {
  const modal = document.createElement("div");

  modal.id = "booking-modal";

  modal.className =
    "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden items-center justify-center p-2 sm:p-4 transition-opacity duration-200";

  modal.innerHTML = `
    <div class="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col max-h-[96vh] sm:max-h-[92vh] overflow-hidden">

      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">

        <div>
          <h2 class="text-xl font-black text-slate-800">
            Manual Slot Booking
          </h2>
        </div>

        <button
          type="button"
          id="close-modal"
          class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors flex items-center justify-center font-bold"
        >
          ✕
        </button>

      </div>

      <form id="booking-form" class="p-4 sm:p-6 space-y-5 overflow-y-auto grow">

        <div class="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-4">

          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Start Time
            </label>

            <input
              type="time"
              id="modal-start-time"
              name="startTime"
              class="w-full bg-transparent text-base font-black outline-none"
              required
            />
          </div>

          <div>
            <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              End Time
            </label>

            <input
              type="time"
              id="modal-end-time"
              name="endTime"
              class="w-full bg-transparent text-base font-black outline-none"
              required
            />
          </div>

        </div>

        <div>
          <label class="block text-xs font-bold text-slate-600 mb-2">
            Customer Name
          </label>

          <input
            type="text"
            name="customerName"
            class="w-full h-12 rounded-xl border border-slate-200 px-4"
            required
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div>
            <label class="block text-xs font-bold text-slate-600 mb-2">
              Mobile Number
            </label>

            <input
              type="tel"
              name="phone"
              class="w-full h-12 rounded-xl border border-slate-200 px-4"
              required
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-600 mb-2">
              Email Address
            </label>

            <input
              type="email"
              name="email"
              class="w-full h-12 rounded-xl border border-slate-200 px-4"
            />
          </div>

        </div>

        <div>
          <label class="block text-xs font-bold text-slate-600 mb-2">
            Payment Status
          </label>

          <div class="grid grid-cols-2 gap-3">

            <label class="border-2 border-slate-200 rounded-2xl p-4 cursor-pointer">

              <input
                type="radio"
                name="paymentStatus"
                value="PARTIAL"
                checked
              />

              Advance Paid

            </label>

            <label class="border-2 border-slate-200 rounded-2xl p-4 cursor-pointer">

              <input
                type="radio"
                name="paymentStatus"
                value="FULL"
              />

              Full Paid

            </label>

          </div>
        </div>

        <div>

          <label class="block text-xs font-bold text-slate-600 mb-2">
            Amount Received
          </label>

          <input
            type="number"
            name="amount"
            class="w-full h-12 rounded-xl border border-slate-200 px-4"
            required
          />

        </div>

        <div>

          <label class="block text-xs font-bold text-slate-600 mb-2">
            Internal Notes
          </label>

          <textarea
            name="notes"
            rows="2"
            class="w-full rounded-xl border border-slate-200 p-4"
          ></textarea>

        </div>

        <div class="flex gap-3 pt-2">

          <button
            type="button"
            id="cancel-modal-btn"
            class="flex-1 h-12 rounded-xl border border-slate-200"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-black"
          >
            Confirm
          </button>

        </div>

      </form>
    </div>
  `;

  document.body.appendChild(modal);

  return modal;
}

// function createBookingModal() {
//   const modal = document.createElement("div");

//   modal.id = "booking-modal";

//   // Mobile: bottom-sheet backdrop, no padding (sheet is full-bleed)
//   // Desktop: centered modal with padding around it
//   modal.className =
//     "fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 hidden items-end sm:items-center justify-center sm:p-4 transition-opacity duration-200";

//   modal.innerHTML = `
//     <div class="w-full sm:max-w-lg bg-white rounded-t-[1.75rem] sm:rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col max-h-[94vh] sm:max-h-[88vh] overflow-hidden">

//       <!-- Drag handle, mobile only -->
//       <div class="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0">
//         <div class="w-10 h-1 rounded-full bg-slate-200"></div>
//       </div>

//       <div class="px-5 py-3 sm:px-6 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">

//         <h2 class="text-lg sm:text-xl font-black text-slate-800">
//           Manual Slot Booking
//         </h2>

//         <button
//           type="button"
//           id="close-modal"
//           class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 active:bg-red-50 transition-colors flex items-center justify-center font-bold text-sm"
//         >
//           ✕
//         </button>

//       </div>

//       <form id="booking-form" class="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto grow">

//         <div class="bg-slate-50 border border-slate-100 rounded-2xl p-3 sm:p-4 grid grid-cols-2 gap-3 sm:gap-4">

//           <div>
//             <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">
//               Start Time
//             </label>

//             <input
//               type="time"
//               id="modal-start-time"
//               name="startTime"
//               class="w-full bg-transparent text-sm sm:text-base font-black outline-none"
//               required
//             />
//           </div>

//           <div>
//             <label class="text-[10px] uppercase font-bold text-slate-400 block mb-1">
//               End Time
//             </label>

//             <input
//               type="time"
//               id="modal-end-time"
//               name="endTime"
//               class="w-full bg-transparent text-sm sm:text-base font-black outline-none"
//               required
//             />
//           </div>

//         </div>

//         <div>
//           <label class="block text-xs font-bold text-slate-600 mb-1.5 sm:mb-2">
//             Customer Name
//           </label>

//           <input
//             type="text"
//             name="customerName"
//             class="w-full h-11 sm:h-12 rounded-xl border border-slate-200 px-4 text-sm"
//             required
//           />
//         </div>

//         <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

//           <div>
//             <label class="block text-xs font-bold text-slate-600 mb-1.5 sm:mb-2">
//               Mobile Number
//             </label>

//             <input
//               type="tel"
//               name="phone"
//               class="w-full h-11 sm:h-12 rounded-xl border border-slate-200 px-4 text-sm"
//               required
//             />
//           </div>

//           <div>
//             <label class="block text-xs font-bold text-slate-600 mb-1.5 sm:mb-2">
//               Email Address
//             </label>

//             <input
//               type="email"
//               name="email"
//               class="w-full h-11 sm:h-12 rounded-xl border border-slate-200 px-4 text-sm"
//             />
//           </div>

//         </div>

//         <div>
//           <label class="block text-xs font-bold text-slate-600 mb-1.5 sm:mb-2">
//             Payment Status
//           </label>

//           <div class="grid grid-cols-2 gap-2 sm:gap-3">

//             <label class="flex items-center gap-2 border-2 border-slate-200 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 cursor-pointer text-xs sm:text-sm font-bold text-slate-700 transition-colors">

//               <input
//                 type="radio"
//                 name="paymentStatus"
//                 value="PARTIAL"
//                 checked
//                 class="accent-emerald-600"
//               />

//               Advance Paid

//             </label>

//             <label class="flex items-center gap-2 border-2 border-slate-200 has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 cursor-pointer text-xs sm:text-sm font-bold text-slate-700 transition-colors">

//               <input
//                 type="radio"
//                 name="paymentStatus"
//                 value="FULL"
//                 class="accent-emerald-600"
//               />

//               Full Paid

//             </label>

//           </div>
//         </div>

//         <div>

//           <label class="block text-xs font-bold text-slate-600 mb-1.5 sm:mb-2">
//             Amount Received
//           </label>

//           <input
//             type="number"
//             name="amount"
//             class="w-full h-11 sm:h-12 rounded-xl border border-slate-200 px-4 text-sm"
//             required
//           />

//         </div>

//         <div>

//           <label class="block text-xs font-bold text-slate-600 mb-1.5 sm:mb-2">
//             Internal Notes
//           </label>

//           <textarea
//             name="notes"
//             rows="2"
//             class="w-full rounded-xl border border-slate-200 p-3 sm:p-4 text-sm"
//           ></textarea>

//         </div>

//         <div class="flex gap-3 pt-1 sm:pt-2 pb-1 sm:pb-0">

//           <button
//             type="button"
//             id="cancel-modal-btn"
//             class="flex-1 h-11 sm:h-12 rounded-xl border border-slate-200 text-sm font-bold active:bg-slate-50"
//           >
//             Cancel
//           </button>

//           <button
//             type="submit"
//             class="flex-1 h-11 sm:h-12 rounded-xl bg-emerald-600 text-white font-black text-sm active:bg-emerald-700"
//           >
//             Confirm
//           </button>

//         </div>

//       </form>
//     </div>
//   `;

//   document.body.appendChild(modal);

//   return modal;
// }

function openBookingModal(startTime, endTime) {
  document.getElementById("modal-start-time").value =
    formatTimeForInput(startTime);

  document.getElementById("modal-end-time").value = formatTimeForInput(endTime);

  slotState.modal.classList.remove("hidden");

  slotState.modal.classList.add("flex");
}

function closeBookingModal() {
  slotState.modal.classList.remove("flex");

  slotState.modal.classList.add("hidden");

  document.getElementById("booking-form").reset();
}

/* ===============================
   API CALLS
================================ */

async function submitBooking(formData) {
  try {
    const start = buildDateTime(
      slotState.currentDate,
      formData.get("startTime")
    );

    const end = buildDateTime(slotState.currentDate, formData.get("endTime"));

    const { total, advance } = calculateAmount(start, end);

    const paymentStatus = formData.get("paymentStatus");

    const paidAmount =
      paymentStatus === "FULL" ? total : Number(formData.get("amount"));

    const payload = {
      start: start.toISOString(),

      end: end.toISOString(),

      customerName: formData.get("customerName")?.trim(),

      customerPhone: formData.get("phone")?.trim(),

      customerEmail: formData.get("email")?.trim(),

      totalAmount: total,

      paidAmount,

      paymentMethod: "CASH",

      notes: formData.get("notes")?.trim(),
    };

    console.log("BOOKING PAYLOAD:", payload);

    const submitBtn = document.querySelector(
      '#booking-form button[type="submit"]'
    );

    submitBtn.disabled = true;

    submitBtn.textContent = "Processing...";

    submitBtn.classList.add("bg-slate-500");

    const res = await fetch("/api/admin/V2/bookings/create", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error(result);
      throw new Error(result.error || result.message || "Booking failed");
    }

    console.log("Booking created:", result);

    closeBookingModal();

    await renderSlots(slotState.currentDate);
  } catch (error) {
    console.error("Booking error:", error);

    alert(error.message);
  } finally {
    const submitBtn = document.querySelector(
      '#booking-form button[type="submit"]'
    );

    submitBtn.disabled = false;

    submitBtn.textContent = "Confirm";

    submitBtn.classList.remove("bg-slate-500");
  }
}

async function cancelBooking(bookingId) {
  try {
    const res = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Cancellation failed");
    }

    await renderSlots(slotState.currentDate);
  } catch (error) {
    console.error("Cancellation error:", error);
  }
}

async function releaseHeldSlot(slotId) {
  try {
    const res = await fetch(`/api/admin/slots/${slotId}/release`, {
      method: "PATCH",
    });

    if (!res.ok) {
      throw new Error("Release failed");
    }

    await renderSlots(slotState.currentDate);
  } catch (error) {
    console.error("Release error:", error);
  }
}

async function renderSlots(date) {
  try {
    if (!date) {
      throw new Error("Please enter a date");
    }

    const res = await fetch(`/api/admin/slots?date=${date}`);

    const data = await res.json();
    console.log(data);

    if (!data.slots) {
      throw new Error("Invalid Date");
    }

    const slotsHTML = data.slots.map(slot => createSlotCard(slot)).join("");

    dom.slotContainer.innerHTML = slotsHTML;

    startCountdowns();
  } catch (error) {
    console.error("Failed to fetch slots:", error);

    dom.slotContainer.innerHTML = `
      <p class="text-red-500">
        Error loading slots.
      </p>
    `;
  }
}

/* ===============================
   EVENT DELEGATION
================================ */

function handleSlotAction(e) {
  const target = e.target;

  const slotCard = target.closest("[data-start]");
  console.log(slotCard);

  if (!slotCard) return;

  const startTime = slotCard.dataset.start;

  const endTime = slotCard.dataset.end;

  if (
    target.classList.contains("hold-slot-btn") ||
    target.classList.contains("complete-booking-btn")
  ) {
    openBookingModal(startTime, endTime);
  }
  if (target.classList.contains("view-booking-btn")) {
    openViewBookingModal(slotCard);
  }

  if (target.classList.contains("cancel-booking-btn")) {
    console.log("Cancel Booking");
  }

  if (target.classList.contains("release-slot-btn")) {
    console.log("Release Slot");
  }
}

async function saveChanges(bookingId, paidOn, isCompleted) {
  try {
    if (!bookingId || paidOn === null || paidOn === undefined) {
      throw new Error("Booking ID or Paid Amount is missing");
    }

    const payload = {
      bookingId,
      paidOn,
      isCompleted,
    };

    const res = await fetch("/api/admin/V2/bookings/update", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || data.message || "Update failed");
    }

    closeViewBookingModal();

    await renderSlots(slotState.currentDate);

    return data;
  } catch (error) {
    console.error("Update Error:", error);

    throw error;
  }
}

/* ===============================
   INITIALIZATION
================================ */

document.addEventListener("DOMContentLoaded", () => {
  slotState.modal = createBookingModal();

  document
    .getElementById("close-modal")
    ?.addEventListener("click", closeBookingModal);

  document
    .getElementById("cancel-modal-btn")
    ?.addEventListener("click", closeBookingModal);

  slotState.modal.addEventListener("click", e => {
    if (e.target === slotState.modal) {
      closeBookingModal();
    }
  });

  slotState.modal = createBookingModal();

  createViewBookingModal();

  document
    .getElementById("close-view-booking-modal")
    ?.addEventListener("click", closeViewBookingModal);

  document.getElementById("booking-form")?.addEventListener("submit", e => {
    e.preventDefault();

    submitBooking(new FormData(e.target));
  });

  document
    .getElementById("save-booking-update")
    ?.addEventListener("click", async () => {
      const modal = document.getElementById("view-booking-modal");
      const bookingId = modal.dataset.currentBookingId;
      const paidAmount = Number(
        document.getElementById("paid-on-spot").value || 0
      );
      const isCompleted = document.querySelector(
        'input[name="booking-complete"]:checked'
      )?.value;

      if (!bookingId) {
        alert("Error: No booking ID found");
        return;
      }

      if (paidAmount < 0) {
        alert("Paid amount cannot be negative");
        return;
      }

      const date = await saveChanges(bookingId, paidAmount, isCompleted);
    });

  dom.slotContainer.addEventListener("click", handleSlotAction);

  const today = new Date();

  const localDate = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  dom.datePicker.value = localDate;

  slotState.currentDate = localDate;

  renderSlots(localDate);

  dom.datePicker.addEventListener("change", e => {
    slotState.currentDate = e.target.value;

    renderSlots(e.target.value);
  });
});
