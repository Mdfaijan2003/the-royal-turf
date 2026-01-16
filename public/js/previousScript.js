const OPEN_HOUR = 9;
const CLOSE_HOUR = 21;
const BASE_PRICE = 1000;
const ADVANCE_PERCENT = 0.3;

// --- DOM ELEMENTS ---
const elements = {
  mobileMenuBtn: document.getElementById("mobile-menu-button"),
  mobileMenu: document.getElementById("mobile-menu"),
  inputs: {
    name: document.getElementById("name"),
    email: document.getElementById("email"),
    phone: document.getElementById("phone"),
    date: document.getElementById("date"),
    start: document.getElementById("start-time"),
    end: document.getElementById("end-time"),
  },
  sections: {
    booking: document.getElementById("booking-section"),
    payment: document.getElementById("payment-section"),
    confirmation: document.getElementById("confirmation-section"), // Ensure this ID exists in HTML
  },
  display: {
    time: document.getElementById("selected-time"),
    fees: document.getElementById("booking-fees"),
    advance: document.getElementById("advance-amount"),
    total: document.getElementById("total-payable"),
    timer: document.getElementById("countdown-timer"),
  },
  buttons: {
    pay: document.getElementById("payment-button"),
    download: document.getElementById("download-slip"),
  },
  modal: {
    self: document.getElementById("message-modal"),
    title: document.getElementById("modal-title"),
    msg: document.getElementById("modal-message"),
    icon: document.getElementById("modal-icon"),
    close: document.getElementById("modal-close-button"),
  },
};

// --- STATE MANAGEMENT ---
let state = {
  fetchedSlots: [],
  holdBookingId: null,
  holdTimer: null,
  bookingData: {}, // Stores temp data for receipt
};

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  loadSavedForm();
  restoreHeldSession();

  // Mobile Menu
  elements.mobileMenuBtn.addEventListener("click", () => {
    elements.mobileMenu.classList.toggle("hidden");
  });

  // Event Listeners
  elements.inputs.date.addEventListener("change", e => {
    saveForm();
    fetchDailySlots(e.target.value);
  });

  ["name", "email", "phone"].forEach(id => {
    elements.inputs[id].addEventListener("input", saveForm);
  });

  elements.inputs.start.addEventListener("change", updateSummary);
  elements.inputs.end.addEventListener("change", updateSummary);

  // Form Submit (HOLD)
  document
    .getElementById("booking-form")
    .addEventListener("submit", handleHoldRequest);

  // Payment Click
  elements.buttons.pay.addEventListener("click", initiateRazorpay);

  // Download Slip
  elements.buttons.download.addEventListener("click", generatePDF);

  // Modal Close
  elements.modal.close.addEventListener("click", () =>
    elements.modal.self.classList.add("hidden")
  );
});

// ------------------------------------------
// 1. DATA FETCHING (SLOTS)
// ------------------------------------------
async function fetchDailySlots(dateStr) {
  if (!dateStr) return;

  // Reset Selects
  elements.inputs.start.innerHTML = '<option value="">Start Time</option>';
  elements.inputs.end.innerHTML = '<option value="">End Time</option>';

  try {
    const res = await fetch(`/api/slots?date=${dateStr}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed to load slots");

    state.fetchedSlots = data.slots || [];
    populateTimeDropdowns(dateStr);
  } catch (err) {
    showModal("Error", err.message, "error");
  }
}

function populateTimeDropdowns(dateStr) {
  // Loop from Open Hour to Close Hour (Aligned with Backend)
  for (let i = OPEN_HOUR; i < CLOSE_HOUR; i++) {
    const hourStr = i.toString().padStart(2, "0");
    const nextHourStr = (i + 1).toString().padStart(2, "0");

    const timeValue = `${hourStr}:00`;
    const displayTxt = `${i > 12 ? i - 12 : i}:00 ${i >= 12 ? "PM" : "AM"}`;

    // Define strict boundaries for this specific hour slot
    const slotStart = new Date(`${dateStr}T${hourStr}:00:00.000Z`); // UTC assumption or local based on your backend
    const slotEnd = new Date(`${dateStr}T${nextHourStr}:00:00.000Z`);

    // Check Collision
    const isBlocked = state.fetchedSlots.some(s => {
      const bookedStart = new Date(s.startTime); // Ensure backend sends ISOString
      const bookedEnd = new Date(s.endTime);

      // Classic Overlap Check
      // (StartA < EndB) and (EndA > StartB)
      return (
        bookedStart < slotEnd &&
        bookedEnd > slotStart &&
        (s.status === "BOOKED" || s.status === "HELD")
      );
    });

    // Create Option
    const option = document.createElement("option");
    option.value = timeValue;
    option.textContent = displayTxt;

    if (isBlocked) {
      option.disabled = true;
      option.textContent += " (Booked)";
      option.classList.add("bg-red-100", "text-red-500");
    }

    // Append to both (Logic can be refined to block EndTime < StartTime later)
    elements.inputs.start.appendChild(option.cloneNode(true));
    elements.inputs.end.appendChild(option);
  }
}

// ------------------------------------------
// 2. LOGIC & CALCULATION
// ------------------------------------------
function updateSummary() {
  const startVal = elements.inputs.start.value;
  const endVal = elements.inputs.end.value;
  const dateVal = elements.inputs.date.value;

  if (!startVal || !endVal || !dateVal) return resetSummary();

  // Convert HH:MM to comparison numbers
  const startHour = parseInt(startVal.split(":")[0]);
  const endHour = parseInt(endVal.split(":")[0]);

  if (endHour <= startHour) {
    resetSummary();
    return showModal(
      "Invalid Time",
      "End time must be after start time",
      "error"
    );
  }

  // Check if any slot *between* start and end is blocked
  // (e.g. User selects 9 to 12, but 10-11 is booked)
  // This requires checking the intermediate hours
  // For simplicity here, we assume user picks 1 hour slots or valid ranges.
  // **Ideally, you should loop through the range here to re-validate against state.fetchedSlots**

  const hours = endHour - startHour;
  const total = hours * BASE_PRICE;
  const advance = total * ADVANCE_PERCENT;

  elements.display.time.textContent = `${startVal} - ${endVal}`;
  elements.display.fees.textContent = `₹${total}`;
  elements.display.advance.textContent = `₹${advance}`;
  elements.display.total.textContent = `₹${advance}`;

  // Store for submission
  state.bookingData = {
    date: dateVal,
    startTime: startVal,
    endTime: endVal,
    totalFee: total,
    advanceAmount: advance,
  };
}

function resetSummary() {
  elements.display.time.textContent = "-";
  elements.display.fees.textContent = "-";
  elements.display.advance.textContent = "-";
  elements.display.total.textContent = "-";
}

// ------------------------------------------
// 3. HOLD LOGIC
// ------------------------------------------
async function handleHoldRequest(e) {
  e.preventDefault();

  const { date, startTime, endTime } = state.bookingData;
  if (!date || !startTime || !endTime)
    return showModal("Error", "Please select a valid slot", "error");

  const payload = {
    start: `${date}T${startTime}:00.000Z`,
    end: `${date}T${endTime}:00.000Z`,
    customerName: elements.inputs.name.value,
    customerEmail: elements.inputs.email.value,
    customerPhone: elements.inputs.phone.value,
    paymentAmount: state.bookingData.advanceAmount, // Sending amount so backend knows
  };

  try {
    const res = await fetch("/api/slots/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Slot unavailable");

    // Success
    state.holdBookingId = data.bookingId;

    // Save Session
    const sessionData = {
      bookingId: data.bookingId,
      expiresAt: data.expiresAt,
      bookingData: { ...state.bookingData, ...payload }, // Merge form data
    };
    localStorage.setItem("heldBooking", JSON.stringify(sessionData));

    // Switch UI
    transitionToPayment(data.expiresAt);
  } catch (err) {
    showModal("Booking Failed", err.message, "error");
  }
}

// ------------------------------------------
// 4. PAYMENT (RAZORPAY)
// ------------------------------------------
async function initiateRazorpay() {
  if (!state.holdBookingId)
    return showModal("Error", "Session expired", "error");

  try {
    // 1. Create Order
    const res = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: state.holdBookingId }),
    });
    const orderData = await res.json();
    if (!res.ok) throw new Error(orderData.message || "Order creation failed");

    // 2. Open Razorpay
    const options = {
      key: orderData.key,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "Royal Turf",
      description: "Turf Booking Advance",
      order_id: orderData.orderId,
      handler: function (response) {
        verifyPayment(response);
      },
      prefill: {
        name: elements.inputs.name.value,
        email: elements.inputs.email.value,
        contact: elements.inputs.phone.value,
      },
      theme: { color: "#10B981" },
    };

    const rzp = new Razorpay(options);
    rzp.on("payment.failed", function (response) {
      showModal("Payment Failed", response.error.description, "error");
    });
    rzp.open();
  } catch (err) {
    showModal("Payment Error", err.message, "error");
  }
}

async function verifyPayment(paymentResponse) {
  try {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        bookingId: state.holdBookingId,
      }),
    });

    const data = await res.json();
    if (data.success) {
      // CLEANUP & SHOW SUCCESS
      localStorage.removeItem("heldBooking");
      clearInterval(state.holdTimer);

      elements.sections.payment.classList.add("hidden");

      // Show Confirmation Section (Ensure this exists in HTML)
      if (elements.sections.confirmation) {
        elements.sections.confirmation.classList.remove("hidden");
      } else {
        showModal("Success", "Booking Confirmed!", "success");
      }
    } else {
      throw new Error("Verification failed on server");
    }
  } catch (err) {
    showModal("Verification Error", err.message, "error");
  }
}

// ------------------------------------------
// 5. UTILITIES (Timer, PDF, Modals)
// ------------------------------------------
function transitionToPayment(expiresAt) {
  elements.sections.booking.classList.add("hidden");
  elements.sections.payment.classList.remove("hidden");

  // Start Timer
  if (state.holdTimer) clearInterval(state.holdTimer);

  const endMs = new Date(expiresAt).getTime();

  function tick() {
    const now = Date.now();
    const diff = endMs - now;

    if (diff <= 0) {
      clearInterval(state.holdTimer);
      localStorage.removeItem("heldBooking");
      showModal("Expired", "Your hold session has expired.", "error");
      setTimeout(() => location.reload(), 2000); // Reload page to reset
      return;
    }

    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    elements.display.timer.textContent = `${m}:${s
      .toString()
      .padStart(2, "0")}`;
  }

  tick();
  state.holdTimer = setInterval(tick, 1000);
}

function restoreHeldSession() {
  const saved = JSON.parse(localStorage.getItem("heldBooking"));
  if (saved && new Date(saved.expiresAt) > new Date()) {
    state.holdBookingId = saved.bookingId;
    state.bookingData = saved.bookingData;
    // Restore input values for PDF generation context
    elements.inputs.name.value = saved.bookingData.customerName || "";
    elements.inputs.email.value = saved.bookingData.customerEmail || "";
    elements.inputs.phone.value = saved.bookingData.customerPhone || "";

    transitionToPayment(saved.expiresAt);
  } else {
    localStorage.removeItem("heldBooking");
  }
}

function generatePDF() {
  // Ensure jspdf is loaded via CDN in your <head>
  // <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>

  if (!window.jspdf) return alert("PDF library not loaded");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const d = state.bookingData; // Use stored data
  // ... (Your existing PDF logic here, simplified for brevity) ...
  doc.text(`Booking Slip`, 10, 10);
  doc.text(`Name: ${elements.inputs.name.value}`, 10, 20);
  doc.text(`Amount Paid: ${d.advanceAmount}`, 10, 30);
  doc.save("booking.pdf");
}

function showModal(title, msg, type) {
  elements.modal.title.textContent = title;
  elements.modal.msg.textContent = msg;
  elements.modal.self.classList.remove("hidden");
  // Add color logic (green/red) here based on 'type'
}

// LocalStorage Form Data Persistence
function saveForm() {
  const data = {
    fullName: elements.inputs.name.value,
    email: elements.inputs.email.value,
    phone: elements.inputs.phone.value,
    date: elements.inputs.date.value,
  };
  localStorage.setItem("userFormData", JSON.stringify(data));
}

function loadSavedForm() {
  const saved = JSON.parse(localStorage.getItem("userFormData"));
  if (saved) {
    elements.inputs.name.value = saved.fullName || "";
    elements.inputs.email.value = saved.email || "";
    elements.inputs.phone.value = saved.phone || "";
    elements.inputs.date.value = saved.date || "";
    // If date exists, fetch slots immediately
    if (saved.date) fetchDailySlots(saved.date);
  }
}

// --- GLOBAL VARIABLES & STATE ---
let fetchedSlots = [];
let holdBookingId = null;
let holdTimer = null;
let bookingData = {}; // Stores form inputs
let confirmedBookingDetails = {}; // Stores final data from backend

// --- DOM ELEMENTS ---
const mobileMenuButton = document.getElementById("mobile-menu-button");
const mobileMenu = document.getElementById("mobile-menu");

// Sections
const bookingSection = document.getElementById("booking-section");
const paymentSection = document.getElementById("payment-section");
const confirmationSection = document.getElementById("confirmation-section"); // FIXED: Was missing

// Form Inputs
const fullNameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const dateInput = document.getElementById("date");
const bookingForm = document.getElementById("booking-form");

// Time Selection
const startTimeSelect = document.getElementById("start-time");
const endTimeSelect = document.getElementById("end-time");

// Display Elements
const selectedTimeDisplay = document.getElementById("selected-time");
const bookingFeesDisplay = document.getElementById("booking-fees");
const advanceAmountDisplay = document.getElementById("advance-amount");
const totalPayableDisplay = document.getElementById("total-payable");
const countdownTimerDisplay = document.getElementById("countdown-timer");

// Buttons
const paymentButton = document.getElementById("payment-button");
const downloadSlipButton = document.getElementById("download-slip");

// Modal Elements
const modal = document.getElementById("message-modal");
const modalTitle = document.getElementById("modal-title");
const modalMessage = document.getElementById("modal-message");
const modalIcon = document.getElementById("modal-icon");
const modalCloseButton = document.getElementById("modal-close-button");

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", function () {
  // Mobile Menu
  if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", () => {
      mobileMenu.classList.toggle("hidden");
    });
  }

  // Restore LocalStorage Data
  loadSavedFormData();
  checkExistingHold();

  // Initialize Slots if date is present
  if (dateInput.value) {
    updateAvailableSlots();
  }
});

// --- 1. FORM DATA HANDLING ---
function loadSavedFormData() {
  try {
    const savedForm = JSON.parse(localStorage.getItem("userFormData")) || {};
    if (savedForm.fullName) fullNameInput.value = savedForm.fullName;
    if (savedForm.email) emailInput.value = savedForm.email;
    if (savedForm.phone) phoneInput.value = savedForm.phone;
    if (savedForm.date) dateInput.value = savedForm.date;
  } catch (e) {
    console.error("Error loading form data", e);
  }
}

function saveForm() {
  localStorage.setItem(
    "userFormData",
    JSON.stringify({
      fullName: fullNameInput.value,
      email: emailInput.value,
      phone: phoneInput.value,
      date: dateInput.value,
    })
  );
}

[fullNameInput, emailInput, phoneInput].forEach(el =>
  el.addEventListener("input", saveForm)
);
dateInput.addEventListener("change", () => {
  saveForm();
  updateAvailableSlots();
});

// --- 2. SLOT LOGIC ---
async function updateAvailableSlots() {
  const selectedDate = dateInput.value;
  if (!selectedDate) return;

  // Reset UI
  startTimeSelect.innerHTML = '<option value="">Start Time</option>';
  endTimeSelect.innerHTML = '<option value="">End Time</option>';
  resetSummary();

  try {
    // Fetch from Backend
    const res = await fetch(`/api/slots?date=${selectedDate}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.message || "Failed to fetch slots");

    // Handle structure: { date: "...", slots: [...] }
    fetchedSlots = data.slots || [];

    // Generate Options (07:00 to 23:00)
    for (let i = 7; i <= 23; i++) {
      const hourStr = i < 10 ? `0${i}` : `${i}`;
      const timeValue = `${hourStr}:00`;
      const displayTime = formatTime(i); // Helper function

      // Create Date objects for comparison
      // We construct a local date object for this specific slot
      const slotStartCheck = new Date(`${selectedDate}T${timeValue}:00`);
      const slotEndCheck = new Date(slotStartCheck.getTime() + 60 * 60 * 1000);

      // Check overlap with backend data
      // Backend sends ISO strings. We convert them to timestamps for comparison.
      const isUnavailable = fetchedSlots.some(serverSlot => {
        const serverStart = new Date(serverSlot.startTime).getTime();
        const serverEnd = new Date(serverSlot.endTime).getTime();
        const localStart = slotStartCheck.getTime();
        const localEnd = slotEndCheck.getTime();

        // Standard Overlap Logic
        // (StartA < EndB) and (EndA > StartB)
        const isOverlapping = localStart < serverEnd && localEnd > serverStart;

        return (
          isOverlapping &&
          (serverSlot.status === "BOOKED" || serverSlot.status === "HELD")
        );
      });

      const option = document.createElement("option");
      option.value = timeValue;
      option.textContent = displayTime;

      if (isUnavailable) {
        option.disabled = true;
        option.textContent += " (Booked)";
        option.style.backgroundColor = "#fee2e2"; // light red
      }

      // Clone for End Time
      const endOption = option.cloneNode(true);

      startTimeSelect.appendChild(option);
      endTimeSelect.appendChild(endOption);
    }
  } catch (err) {
    showModal("Error", "Could not load slots: " + err.message, "error");
  }
}

function formatTime(hour) {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:00 ${ampm}`;
}

// --- 3. UI UPDATES (COST CALCULATION) ---
startTimeSelect.addEventListener("change", updateSummary);
endTimeSelect.addEventListener("change", updateSummary);

function updateSummary() {
  const startVal = startTimeSelect.value;
  const endVal = endTimeSelect.value;

  if (!startVal || !endVal) return resetSummary();

  // Create Date Objects
  const startObj = new Date(`${dateInput.value}T${startVal}:00`);
  const endObj = new Date(`${dateInput.value}T${endVal}:00`);

  // Validation 1: End must be after Start
  if (endObj <= startObj) {
    showModal("Invalid Time", "End time must be after start time.", "error");
    endTimeSelect.value = "";
    return resetSummary();
  }

  // Validation 2: Check for booked slots in between
  // (Re-using fetchedSlots to ensure they didn't pick 9:00 to 12:00 when 10:00 is booked)
  const hasOverlap = fetchedSlots.some(serverSlot => {
    const sStart = new Date(serverSlot.startTime).getTime();
    const sEnd = new Date(serverSlot.endTime).getTime();
    const uStart = startObj.getTime();
    const uEnd = endObj.getTime();

    const isOverlapping = uStart < sEnd && uEnd > sStart;
    return (
      isOverlapping &&
      (serverSlot.status === "BOOKED" || serverSlot.status === "HELD")
    );
  });

  if (hasOverlap) {
    showModal("Unavailable", "Your selection includes a booked slot.", "error");
    endTimeSelect.value = "";
    return resetSummary();
  }

  // Calculate Cost
  const hours = (endObj - startObj) / (1000 * 60 * 60);
  const ratePerHour = 1000;
  const total = hours * ratePerHour;
  const advance = total * 0.3; // 30%

  selectedTimeDisplay.textContent = `${formatTime(
    startObj.getHours()
  )} - ${formatTime(endObj.getHours())}`;
  bookingFeesDisplay.textContent = `₹${total}`;
  advanceAmountDisplay.textContent = `₹${advance.toFixed(2)}`;
  totalPayableDisplay.textContent = `₹${advance.toFixed(2)}`;

  // Update global booking data object
  bookingData = {
    startTime: startVal,
    endTime: endVal,
    date: dateInput.value,
    name: fullNameInput.value,
    email: emailInput.value,
    phone: phoneInput.value,
    amount: advance,
  };
}

function resetSummary() {
  selectedTimeDisplay.textContent = "-";
  bookingFeesDisplay.textContent = "-";
  advanceAmountDisplay.textContent = "-";
  totalPayableDisplay.textContent = "-";
}

// --- 4. HOLD & BOOKING PROCESS ---
bookingForm.addEventListener("submit", async e => {
  e.preventDefault();

  if (!bookingData.startTime || !bookingData.endTime) {
    return showModal(
      "Required",
      "Please select valid start and end times.",
      "error"
    );
  }

  // Prepare proper ISO strings for backend
  const isoStart = new Date(
    `${bookingData.date}T${bookingData.startTime}:00`
  ).toISOString();
  const isoEnd = new Date(
    `${bookingData.date}T${bookingData.endTime}:00`
  ).toISOString();

  const payload = {
    start: isoStart,
    end: isoEnd,
    customerName: fullNameInput.value,
    customerEmail: emailInput.value,
    customerPhone: phoneInput.value,
    paymentAmount: bookingData.amount, // Send the calculated amount
  };

  try {
    const res = await fetch("/api/slots/hold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Hold failed");

    // Success: Switch UI
    holdBookingId = data.bookingId;

    // Save Hold to LocalStorage (Persist on refresh)
    const holdData = {
      bookingId: holdBookingId,
      expiresAt: data.expiresAt,
      bookingData: bookingData, // Save form inputs too
    };
    localStorage.setItem("heldBooking", JSON.stringify(holdData));

    showModal("Slot Held", "Please complete payment in 10 minutes.", "success");
    switchToPaymentMode(data.expiresAt);
  } catch (err) {
    showModal("Error", err.message, "error");
  }
});

function switchToPaymentMode(expiresAt) {
  bookingSection.classList.add("hidden");
  paymentSection.classList.remove("hidden");
  startCountdownTimer(expiresAt);
}

// --- 5. TIMER LOGIC ---
function startCountdownTimer(expiresAtString) {
  if (holdTimer) clearInterval(holdTimer);

  const expiresTime = new Date(expiresAtString).getTime();

  function update() {
    const now = Date.now();
    const diff = expiresTime - now;

    if (diff <= 0) {
      clearInterval(holdTimer);
      localStorage.removeItem("heldBooking");
      countdownTimerDisplay.textContent = "00:00";
      paymentButton.disabled = true;
      paymentButton.classList.add("opacity-50", "cursor-not-allowed");
      showModal(
        "Expired",
        "Your session has expired. Please book again.",
        "error"
      );
      setTimeout(() => location.reload(), 3000);
      return;
    }

    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    countdownTimerDisplay.textContent = `${m}:${s < 10 ? "0" + s : s}`;
  }

  update();
  holdTimer = setInterval(update, 1000);
}

function checkExistingHold() {
  const saved = JSON.parse(localStorage.getItem("heldBooking"));
  if (saved && new Date(saved.expiresAt) > new Date()) {
    // Restore state
    holdBookingId = saved.bookingId;
    bookingData = saved.bookingData;
    switchToPaymentMode(saved.expiresAt);
  } else {
    localStorage.removeItem("heldBooking");
  }
}

// --- 6. PAYMENT INTEGRATION (RAZORPAY) ---
paymentButton.addEventListener("click", async () => {
  if (!holdBookingId) return;

  try {
    // 1. Create Order
    const res = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: holdBookingId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Order creation failed");

    // 2. Open Razorpay
    const options = {
      key: data.key,
      amount: data.amount,
      currency: data.currency,
      order_id: data.orderId,
      name: "Royal Turf",
      description: "Turf Booking",
      handler: function (response) {
        // This triggers when user successfully pays on Razorpay popup
        verifyPaymentOnBackend(response);
      },
      prefill: {
        name: bookingData.name,
        email: bookingData.email,
        contact: bookingData.phone,
      },
      theme: { color: "#3399cc" },
    };

    const rzp = new Razorpay(options);
    rzp.on("payment.failed", function (response) {
      showModal("Payment Failed", response.error.description, "error");
    });
    rzp.open();
  } catch (err) {
    showModal("Payment Error", err.message, "error");
  }
});

async function verifyPaymentOnBackend(paymentResponse) {
  try {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        bookingId: holdBookingId,
      }),
    });

    const data = await res.json();
    if (data.success) {
      // Success Flow
      localStorage.removeItem("heldBooking");
      paymentSection.classList.add("hidden");
      confirmationSection.classList.remove("hidden");

      // Store confirmed details for the PDF
      confirmedBookingDetails = {
        ...bookingData,
        bookingId: holdBookingId, // The Mongo ID
        paymentId: paymentResponse.razorpay_payment_id,
      };

      showModal("Success!", "Booking Confirmed", "success");
    } else {
      throw new Error("Verification failed on server");
    }
  } catch (err) {
    showModal("Verification Error", err.message, "error");
  }
}

// --- 7. PDF GENERATION ---
downloadSlipButton.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const b = confirmedBookingDetails;

  doc.setFontSize(22);
  doc.text("Royal Turf - Booking Receipt", 105, 20, null, null, "center");

  doc.setFontSize(12);
  doc.text(`Booking Ref: ${b.bookingId || "N/A"}`, 20, 40);
  doc.text(`Payment ID: ${b.paymentId || "N/A"}`, 20, 50);
  doc.text("------------------------------------------------", 20, 55);

  doc.text(`Name: ${b.name}`, 20, 65);
  doc.text(`Phone: ${b.phone}`, 20, 75);
  doc.text(`Date: ${b.date}`, 20, 85);
  doc.text(`Time: ${b.startTime} - ${b.endTime}`, 20, 95);

  doc.setFontSize(16);
  doc.text(`Amount Paid: Rs. ${b.amount}`, 20, 115);

  doc.setFontSize(10);
  doc.text("Thank you for playing at Royal Turf!", 20, 140);

  doc.save(`Receipt_${b.bookingId}.pdf`);
});

// --- UTILITIES ---
modalCloseButton.addEventListener("click", () => modal.classList.add("hidden"));

function showModal(title, msg, type) {
  modalTitle.textContent = title;
  modalMessage.textContent = msg;
  modal.classList.remove("hidden");

  // Simple Icon Color Switch
  if (type === "error")
    modalIcon.className =
      "mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 text-red-600";
  else if (type === "success")
    modalIcon.className =
      "mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 text-green-600";
  else
    modalIcon.className =
      "mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 text-blue-600";
}
