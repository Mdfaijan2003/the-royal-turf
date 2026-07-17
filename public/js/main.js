import { dom } from "./dom.js";
import { state } from "./state.js";
import { holdSlot } from "./api.js";
import { calculateAmount } from "./pricing.js";
import { showModal } from "./modal.js";
import { startCountdown } from "./timer.js";
import { startPayment } from "./payment.js";
import { updateAvailableSlots, populateEndTimes } from "./slots.js";

/* ===============================
   MOBILE MENU
================================ */
const mobileMenuButton = document.getElementById("mobile-menu-button");
const mobileMenu = document.getElementById("mobile-menu");

mobileMenuButton?.addEventListener("click", () => {
  mobileMenu?.classList.toggle("hidden");
});

/* ===============================
   DOM READY
================================ */
document.addEventListener("DOMContentLoaded", () => {
  /* ===============================
     RESTORE USER FORM
  ================================ */
  const year = document.getElementById("current-year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  const savedForm = JSON.parse(localStorage.getItem("userFormData")) || {};

  dom.fullNameInput.value = savedForm.fullName || "";
  dom.emailInput.value = savedForm.email || "";
  dom.phoneInput.value = savedForm.phone || "";
  dom.dateInput.value = savedForm.date || "";

  const today = new Date();
  const minDate = today.toISOString().split("T")[0];

  // Max date = today + 30 days
  const max = new Date();
  max.setDate(max.getDate() + 7);

  const maxDate = max.toISOString().split("T")[0];

  dom.dateInput.min = minDate;
  dom.dateInput.max = maxDate;

  state.booking.name = dom.fullNameInput.value;
  state.booking.email = dom.emailInput.value;
  state.booking.phone = dom.phoneInput.value;
  state.booking.date = dom.dateInput.value;

  function saveForm() {
    localStorage.setItem(
      "userFormData",
      JSON.stringify({
        fullName: dom.fullNameInput.value,
        email: dom.emailInput.value,
        phone: dom.phoneInput.value,
        date: dom.dateInput.value,
      })
    );
  }

  dom.fullNameInput.addEventListener("input", e => {
    state.booking.name = e.target.value;
    saveForm();
  });

  dom.emailInput.addEventListener("input", e => {
    state.booking.email = e.target.value;
    saveForm();
  });

  dom.phoneInput.addEventListener("input", e => {
    state.booking.phone = e.target.value;
    saveForm();
  });

  /* ===============================
     DATE CHANGE
  ================================ */
  dom.dateInput.addEventListener("change", () => {
    state.booking.date = dom.dateInput.value;

    state.booking.startTime = "";
    state.booking.endTime = "";

    dom.startTime.value = "";
    dom.endTime.value = "";

    resetSummary();
    updateAvailableSlots();
    saveForm();
  });

  /* ===============================
     TIME CHANGE
  ================================ */
  dom.startTime.addEventListener("change", () => {
    state.booking.startTime = dom.startTime.value;
    state.booking.endTime = "";
    dom.endTime.value = "";

    populateEndTimes();

    resetSummary();
  });

  dom.endTime.addEventListener("change", () => {
    console.log("End time changed to:", dom.endTime.value);
    state.booking.endTime = dom.endTime.value;
    if (state.booking.startTime) {
      updateSummary();
    }
  });

  /* ===============================
     SUMMARY
  ================================ */

  function updateSummary() {
    console.log("Updating summary with booking:", state.booking);

    const { date, startTime, endTime } = state.booking;

    if (!date || !startTime || !endTime) {
      resetSummary();
      return;
    }

    // parse start/end into real Date objects
    const [sh, sm] = startTime.split(":").map(Number);
    let start = new Date(date);
    start.setHours(sh, sm, 0, 0);

    const [eh, em] = endTime.split(":").map(Number);
    let end = new Date(date);
    end.setHours(eh, em, 0, 0);

    // handle next day crossing
    if (end <= start) end.setDate(end.getDate() + 1);

    const { total, advance } = calculateAmount(start, end);
    console.log("Calculated amount:", { total, advance });

    if (total <= 0) {
      resetSummary();
      return;
    }

    // calculate total hours
    const hours = (end - start) / (1000 * 60 * 60);

    dom.selectedTime.textContent = `${startTime} - ${endTime} (${hours.toFixed(
      2
    )} hrs)`;
    dom.bookingFees.textContent = `₹${total}`;
    dom.advanceAmount.textContent = `₹${advance}`;
    dom.totalPayable.textContent = `₹${advance}`;

    state.booking.totalFee = total;
    state.booking.advance = advance;
  }

  function resetSummary() {
    dom.selectedTime.textContent = "-";
    dom.bookingFees.textContent = "₹0";
    dom.advanceAmount.textContent = "₹0";
    dom.totalPayable.textContent = "₹0";
  }

  /* ===============================
     RESTORE HELD BOOKING
  ================================ */
  (function restoreHeld() {
    const saved = JSON.parse(localStorage.getItem("heldLock"));
    console.log("Restoring held lock from LS:", saved);

    if (!saved) return;

    if (new Date(saved.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem("heldLock");
      return;
    }

    state.holdLockId = saved.lockId;
    console.log("State holdLockId set to:", state.holdLockId);

    Object.assign(state.booking, saved.bookingData);

    dom.bookingSection.classList.add("hidden");
    dom.paymentSection.classList.remove("hidden");

    startCountdown(saved.expiresAt);
  })();

  /* ===============================
     HOLD SLOT
  ================================ */
  dom.bookingForm.addEventListener("submit", async e => {
    e.preventDefault();

    if (!validateBookingForm()) {
      return;
    }
    if (dom.confirmButton) {
      dom.confirmButton.disabled = true;
      dom.confirmButton.classList.add("opacity-50", "cursor-not-allowed");
      dom.confirmButton.textContent = "Please wait...";
    }

    let { date, startTime, endTime } = state.booking;

    if (!startTime || !endTime) {
      showModal("Error", "Select valid time range", "error");
      return;
    }

    try {
      // ✅ ISO ONLY for backend — SAFE VERSION
      const OPENING_HOUR = 6;

      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);

      // Start datetime
      const startDateTime = new Date(date);
      startDateTime.setHours(sh, sm, 0, 0);

      // End datetime
      const endDateTime = new Date(date);
      endDateTime.setHours(eh, em, 0, 0);

      //Edge Case - If end time is less than or equal to start time, it means the booking crosses midnight. In that case, we add 1 day to the end date.
      if (sh < OPENING_HOUR) {
        startDateTime.setDate(startDateTime.getDate() + 1);
      }

      console.log("Parsed startDateTime:", startDateTime);

      // Handle cross-midnight correctly
      if (endDateTime <= startDateTime) {
        endDateTime.setDate(endDateTime.getDate() + 1);
      }

      const startISO = startDateTime.toISOString();
      const endISO = endDateTime.toISOString();

      console.log("Holding slot with:", { startISO, endISO });

      const payload = {
        start: startISO,
        end: endISO,
        customerName: state.booking.name,
        customerEmail: state.booking.email,
        customerPhone: state.booking.phone,
      };

      console.log("Payload for holdSlot:", payload);

      const { lockId, expiresAt } = await holdSlot(payload);

      state.holdLockId = lockId;

      localStorage.setItem(
        "heldLock",
        JSON.stringify({
          lockId,
          expiresAt,
          bookingData: state.booking,
        })
      );

      dom.bookingSection.classList.add("hidden");
      dom.paymentSection.classList.remove("hidden");

      showModal("Slot Held for 15 Minutes", "Proceed to payment", "success");
      dom.confirmButton.textContent = "Confirm & Pay";
      dom.confirmButton.disabled = false;
      dom.confirmButton.classList.remove("opacity-50", "cursor-not-allowed");
      startCountdown(expiresAt);
    } catch (err) {
      dom.confirmButton.textContent = "Confirm & Pay";
      dom.confirmButton.disabled = false;
      dom.confirmButton.classList.remove("opacity-50", "cursor-not-allowed");
      showModal("Error", err.message, "error");
    }
  });

  /* ===============================
     PAYMENT
  ================================ */
  dom.paymentButton.addEventListener("click", async () => {
    dom.paymentButton.disabled = true;
    dom.paymentButton.textContent = "Redirecting...";

    if (!state.holdLockId) {
      showModal("Error", "No active booking", "error");
      return;
    }
    try {
      await startPayment(state.holdLockId, {
        ...state.booking,
        totalAmount: state.booking.totalFee,
      });
    } catch (error) {
      showModal("Error", error.message, "error");
    } finally {
      dom.paymentButton.disabled = false;
      dom.paymentButton.textContent = "Pay Now";
    }
  });

  dom.cancelPaymentButton.addEventListener("click", async () => {
    dom.cancelPaymentButton.disabled = true;
    dom.cancelPaymentButton.textContent = "Cancelling...";

    try {
      //Stop countdown
      if (state.holdTimer) {
        clearInterval(state.holdTimer);
        state.holdTimer = null;
      }

      //ALWAYS resolve lockId safely
      const lockId =
        state.holdLockId ||
        JSON.parse(localStorage.getItem("heldLock"))?.lockId;

      console.log("Cancelling lockId:", lockId);

      if (!lockId) {
        throw new Error("No active slot lock found");
      }

      //Release slot lock
      const res = await fetch(`/api/slots/release/${lockId}`, {
        method: "PATCH",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to release slot lock");
      }

      //Cleanup frontend state
      localStorage.removeItem("heldLock");
      state.holdLockId = null;
      state.booking = {};

      dom.paymentSection.classList.add("hidden");
      dom.bookingSection.classList.remove("hidden");

      resetSummary();
      showModal("Cancelled", "Slot released successfully", "info");
    } catch (error) {
      showModal("Error", error.message, "error");
    } finally {
      dom.cancelPaymentButton.disabled = false;
      dom.cancelPaymentButton.textContent = "Cancel";
    }
  });

  /* ===============================
     INIT
  ================================ */
  updateAvailableSlots();

  dom.downloadSlipButton.addEventListener("click", () => {
    dom.downloadSlipButton.disabled = true;
    dom.downloadSlipButton.textContent = "Generating...";

    try {
      console.log("Download clicked — state.booking:", state.booking);
      generatePDF();
    } catch (error) {
      showModal("Error", error.message, "error");
    } finally {
      dom.downloadSlipButton.disabled = false;
      dom.downloadSlipButton.textContent = "Download Slip";
    }
  });
});

function validateBookingForm() {
  const name = state.booking.name?.trim();
  const email = state.booking.email?.trim();
  const phone = state.booking.phone?.trim();

  if (!name || name.length < 3) {
    showModal(
      "Invalid Name",
      "Name must contain at least 3 characters",
      "error"
    );
    return false;
  }

  const nameRegex = /^[A-Za-z\s]+$/;

  if (!nameRegex.test(name)) {
    showModal(
      "Invalid Name",
      "Name can only contain letters and spaces",
      "error"
    );
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    showModal("Invalid Email", "Please enter a valid email address", "error");
    return false;
  }

  const phoneRegex = /^[6-9]\d{9}$/;

  if (!phoneRegex.test(phone)) {
    showModal(
      "Invalid Phone Number",
      "Enter a valid 10 digit mobile number",
      "error"
    );
    return false;
  }

  return true;
}

// function generatePDF() {
//   if (!window.jspdf) return alert("PDF library not loaded");

//   const { jsPDF } = window.jspdf;
//   const doc = new jsPDF({ unit: "pt", format: "A4" });

//   const b = state.booking;

//   const bookingId = state.bookingId
//     ? state.bookingId.slice(-6).toUpperCase()
//     : "XXXXXX";

//   let y = 50;

//   /* ================= BRAND HEADER ================= */
//   doc.setFont("helvetica", "bold");
//   doc.setFontSize(26);
//   doc.setTextColor("#145531");
//   doc.text("THE ROYAL TURF", 40, y);

//   doc.setFont("helvetica", "italic");
//   doc.setFontSize(12);
//   doc.setTextColor("#555");
//   doc.text("Where Kings Play", 40, y + 18);

//   doc.setDrawColor("#D4AF37");
//   doc.setLineWidth(1.5);
//   doc.line(40, y + 40, 555, y + 40);

//   /* ================= INVOICE META ================= */
//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(11);
//   doc.setTextColor("#000");

//   doc.text(`Invoice No: RT-${bookingId}`, 400, 55);
//   doc.text(`Invoice Date: ${new Date().toLocaleDateString("en-IN")}`, 400, 70);
//   doc.text(`Payment Status: Adv PAID`, 400, 85);

//   /* ================= CUSTOMER DETAILS ================= */
//   y = 120;
//   doc.setFont("helvetica", "bold");
//   doc.text("BILLED TO", 40, y);

//   doc.setFont("helvetica", "normal");
//   doc.text(`Name: ${b.name || "N/A"}`, 40, y + 18);
//   doc.text(`Email: ${b.email || "N/A"}`, 40, y + 34);
//   doc.text(`Phone: ${b.phone || "N/A"}`, 40, y + 50);

//   /* ================= BOOKING DETAILS ================= */
//   y = 200;
//   doc.setFont("helvetica", "bold");
//   doc.text("BOOKING DETAILS", 40, y);

//   doc.setFont("helvetica", "normal");
//   doc.text(`Date: ${b.date}`, 40, y + 20);
//   doc.text(`Time Slot: ${b.startTime} – ${b.endTime}`, 40, y + 36);

//   /* ================= AMOUNT SUMMARY ================= */
//   y = 270;
//   doc.setDrawColor("#E5E7EB");
//   doc.rect(350, y - 30, 185, 120);

//   doc.setFont("helvetica", "normal");
//   doc.text("Booking Fee", 360, y);
//   doc.text(`₹${b.totalFee.toLocaleString("en-IN")}`, 520, y, {
//     align: "right",
//   });

//   doc.text("Advance Paid", 360, y + 25);
//   doc.text(`₹${b.advance.toLocaleString("en-IN")}`, 520, y + 25, {
//     align: "right",
//   });

//   doc.setFont("times", "bold");
//   doc.text("Total Amount", 360, y + 60);
//   doc.text(`₹${b.totalFee.toLocaleString("en-IN")}`, 520, y + 60, {
//     align: "right",
//   });

//   /* ================= FOOTER ================= */
//   y = 420;
//   doc.setFontSize(9);
//   doc.setFont("helvetica", "italic");
//   doc.setTextColor("#666");

//   doc.text(
//     "This is a system-generated invoice and does not require a signature.",
//     40,
//     y
//   );

//   doc.text(
//     "The Royal Turf | Contact: +91 8272952122 / 7044385501 | info@royalturf.com",
//     40,
//     y + 15
//   );

//   doc.save(`RoyalTurf_Invoice_${bookingId}.pdf`);
// }

function generatePDF() {
  if (!window.jspdf) return alert("PDF library not loaded");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "pt", format: "A4" });

  const b = state.booking;
  const bookingId = state.bookingId
    ? state.bookingId.slice(-6).toUpperCase()
    : "XXXXXX";

  // ---- brand palette ----
  const GREEN = "#145531";
  const GOLD = "#B8912F";
  const INK = "#1a1a1a";
  const MUTED = "#6b7280";
  const LINE = "#e5e7eb";
  const PAGE_W = 595.28; // A4 width in pt
  const MARGIN_L = 40;
  const MARGIN_R = 40;
  const CONTENT_R = PAGE_W - MARGIN_R;

  const money = n => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;

  const advance = Number(b.advance || 0);
  const totalFee = Number(b.totalFee || 0);
  const balanceDue = Math.max(totalFee - advance, 0);
  const isFullyPaid = balanceDue === 0;

  // ---- number to words (Indian numbering system) ----
  const numberToWords = num => {
    num = Math.round(Number(num) || 0);
    if (num === 0) return "Zero Rupees Only";

    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const twoDigits = n => {
      if (n < 20) return ones[n];
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    };
    const threeDigits = n => {
      if (n < 100) return twoDigits(n);
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + twoDigits(n % 100) : "")
      );
    };

    let n = num;
    const crore = Math.floor(n / 10000000);
    n %= 10000000;
    const lakh = Math.floor(n / 100000);
    n %= 100000;
    const thousand = Math.floor(n / 1000);
    n %= 1000;
    const hundred = n;

    let parts = [];
    if (crore) parts.push(threeDigits(crore) + " Crore");
    if (lakh) parts.push(threeDigits(lakh) + " Lakh");
    if (thousand) parts.push(threeDigits(thousand) + " Thousand");
    if (hundred) parts.push(threeDigits(hundred));

    return parts.join(" ") + " Rupees Only";
  };

  let y = 46;

  /* ================= BRAND HEADER ================= */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(GREEN);
  doc.text("THE ROYAL TURF", MARGIN_L, y);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10.5);
  doc.setTextColor(MUTED);
  doc.text("Where Kings Play", MARGIN_L, y + 16);

  // Invoice badge, top right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(INK);
  doc.text("INVOICE", CONTENT_R, y - 4, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(MUTED);
  doc.text(`No. RT-${bookingId}`, CONTENT_R, y + 10, { align: "right" });
  doc.text(
    `Date: ${new Date().toLocaleDateString("en-IN")}`,
    CONTENT_R,
    y + 22,
    { align: "right" }
  );

  y += 34;
  doc.setDrawColor(GOLD);
  doc.setLineWidth(1.25);
  doc.line(MARGIN_L, y, CONTENT_R, y);

  /* ================= STATUS PILL ================= */
  y += 22;
  const pillLabel = isFullyPaid ? "PAID IN FULL" : "PARTIALLY PAID";
  const pillColor = isFullyPaid ? [20, 85, 49] : [184, 145, 47];
  doc.setFillColor(...pillColor);
  const pillW = doc.getTextWidth(pillLabel) + 20;
  doc.roundedRect(CONTENT_R - pillW, y - 12, pillW, 18, 9, 9, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor("#ffffff");
  doc.text(pillLabel, CONTENT_R - pillW / 2, y, {
    align: "center",
    baseline: "middle",
  });

  /* ================= BILLED TO / BOOKING DETAILS (two columns) ================= */
  const colGap = 20;
  const colW = (CONTENT_R - MARGIN_L - colGap) / 2;
  const col1X = MARGIN_L;
  const col2X = MARGIN_L + colW + colGap;

  const sectionTop = y + 14;

  const writeLabel = (text, x, yy) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(MUTED);
    doc.text(text.toUpperCase(), x, yy);
  };

  const writeRow = (label, value, x, yy) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(MUTED);
    doc.text(label, x, yy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(INK);
    doc.text(String(value || "N/A"), x, yy + 13);
  };

  writeLabel("Billed To", col1X, sectionTop);
  writeRow("Customer Name", b.name, col1X, sectionTop + 16);
  writeRow("Phone", b.phone, col1X, sectionTop + 44);
  writeRow("Email", b.email, col1X, sectionTop + 72);

  writeLabel("Booking Details", col2X, sectionTop);
  writeRow("Date", b.date, col2X, sectionTop + 16);
  writeRow(
    "Time Slot",
    `${b.startTime || "--"} - ${b.endTime || "--"}`,
    col2X,
    sectionTop + 44
  );
  writeRow("Booking ID", `RT-${bookingId}`, col2X, sectionTop + 72);

  y = sectionTop + 100;
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.75);
  doc.line(MARGIN_L, y, CONTENT_R, y);

  /* ================= CHARGES TABLE ================= */
  y += 24;
  const tableTop = y;
  const rowH = 26;

  doc.setFillColor(GREEN);
  doc.rect(MARGIN_L, tableTop, CONTENT_R - MARGIN_L, rowH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor("#ffffff");
  doc.text("DESCRIPTION", MARGIN_L + 12, tableTop + rowH / 2 + 3);
  doc.text("AMOUNT", CONTENT_R - 12, tableTop + rowH / 2 + 3, {
    align: "right",
  });

  const chargeRows = [
    ["Turf Booking Fee", money(totalFee)],
    ["Advance Paid", `- ${money(advance)}`],
  ];

  let rowY = tableTop + rowH;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  chargeRows.forEach(([label, value], i) => {
    if (i % 2 === 1) {
      doc.setFillColor("#f9fafb");
      doc.rect(MARGIN_L, rowY, CONTENT_R - MARGIN_L, rowH, "F");
    }
    doc.setTextColor(INK);
    doc.text(label, MARGIN_L + 12, rowY + rowH / 2 + 3);
    doc.text(value, CONTENT_R - 12, rowY + rowH / 2 + 3, { align: "right" });
    rowY += rowH;
  });

  // Balance due row, emphasized
  doc.setFillColor(isFullyPaid ? "#ecfdf5" : "#fffbeb");
  doc.rect(MARGIN_L, rowY, CONTENT_R - MARGIN_L, rowH + 4, "F");
  doc.setDrawColor(GOLD);
  doc.setLineWidth(1);
  doc.line(MARGIN_L, rowY, CONTENT_R, rowY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(GREEN);
  doc.text(
    isFullyPaid ? "Balance Due" : "Balance Due (Pay at venue)",
    MARGIN_L + 12,
    rowY + (rowH + 4) / 2 + 4
  );
  doc.text(money(balanceDue), CONTENT_R - 12, rowY + (rowH + 4) / 2 + 4, {
    align: "right",
  });

  y = rowY + rowH + 4;
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.75);
  doc.rect(MARGIN_L, tableTop, CONTENT_R - MARGIN_L, y - tableTop);

  /* ================= AMOUNT IN WORDS ================= */
  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text("TOTAL AMOUNT IN WORDS", MARGIN_L, y);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(INK);
  const amountWordsLines = doc.splitTextToSize(
    numberToWords(totalFee),
    CONTENT_R - MARGIN_L
  );
  doc.text(amountWordsLines, MARGIN_L, y + 14);
  y += 14 + amountWordsLines.length * 13;

  /* ================= BOOKING POLICY ================= */
  y += 18;
  const policyTop = y;
  const policyLines = [
    "\u2022 Cancellations must be made at least 4 hours before the slot time; no refunds for no-shows.",
    "\u2022 Please arrive 10 minutes before your slot with a valid ID.",
    "\u2022 Remaining balance is payable in cash or UPI directly at the venue before play begins.",
  ];
  const policyPad = 12;
  const policyLineH = 13;
  const policyBoxH = policyPad * 2 + 14 + policyLines.length * policyLineH;

  doc.setFillColor("#f9fafb");
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.75);
  doc.roundedRect(
    MARGIN_L,
    policyTop,
    CONTENT_R - MARGIN_L,
    policyBoxH,
    6,
    6,
    "FD"
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(GREEN);
  doc.text("BOOKING POLICY", MARGIN_L + policyPad, policyTop + policyPad + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  policyLines.forEach((line, i) => {
    doc.text(
      line,
      MARGIN_L + policyPad,
      policyTop + policyPad + 18 + i * policyLineH
    );
  });

  y = policyTop + policyBoxH;

  /* ================= FOOTER ================= */
  const footerY = 760;
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.75);
  doc.line(MARGIN_L, footerY - 34, CONTENT_R, footerY - 34);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(GREEN);
  doc.text("Thank you for choosing The Royal Turf!", MARGIN_L, footerY - 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text(
    "Follow us: @theroyalturf  |  www.royalturf.com",
    MARGIN_L,
    footerY - 3
  );

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text(
    "This is a system-generated invoice and does not require a signature.",
    MARGIN_L,
    footerY
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    "The Royal Turf  |  +91 82729 52122 / 70443 85501  |  info@royalturf.com",
    MARGIN_L,
    footerY + 13
  );

  doc.save(`RoyalTurf_Invoice_${bookingId}.pdf`);
}
