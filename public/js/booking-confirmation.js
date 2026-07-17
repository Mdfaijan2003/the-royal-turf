import { showModal } from "/js/modal.js";
import { generateBookingPDF } from "/js/pdf.js";

const token = window.location.pathname.split("/").pop();

let booking = null;

/* ===========================================
   INIT
=========================================== */

document.addEventListener("DOMContentLoaded", init);

async function init() {
  document.getElementById("current-year").textContent =
    new Date().getFullYear();

  setupMobileMenu();

  try {
    booking = await fetchBooking();

    renderBooking();

    setupCalendar();

    setupWhatsapp();

    setupPDF();
  } catch (err) {
    showModal("Error", err.message, "error");
  }
}

/* ===========================================
   API
=========================================== */

async function fetchBooking() {
  const res = await fetch(`/api/bookings/success/${token}`);

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error || "Unable to load booking");
  }

  return data.booking;
}

/* ===========================================
   RENDER
=========================================== */

function renderBooking() {
  const start = new Date(booking.start);
  const end = new Date(booking.end);

  const isFullyPaid = booking.remainingAmount === 0;
  const bookingId = booking._id.slice(-6).toUpperCase();

  document.getElementById("success-name").textContent = booking.customerName;

  document.getElementById("success-booking-id").textContent = bookingId;

  document.getElementById("success-phone").textContent = booking.customerPhone;

  document.getElementById("success-date").textContent =
    start.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  document.getElementById("success-time").textContent =
    `${formatTime(start)} – ${formatTime(end)}`;

  document.getElementById("success-total-fee").textContent = formatCurrency(
    booking.totalAmount
  );

  document.getElementById("success-advance-paid").textContent = formatCurrency(
    booking.advanceAmount
  );

  document.getElementById("success-balance-due").textContent = formatCurrency(
    booking.remainingAmount
  );

  const status = document.getElementById("success-status");

  if (isFullyPaid) {
    status.textContent = "Paid in Full";
    status.classList.remove("partial");
    status.classList.add("full");
  } else {
    status.textContent = "Advance Paid";
  }
}

/* ===========================================
   PDF
=========================================== */

function setupPDF() {
  document.getElementById("download-slip").addEventListener("click", () => {
    generateBookingPDF(booking);
  });
}

/* ===========================================
   WHATSAPP
=========================================== */

function setupWhatsapp() {
  const start = new Date(booking.start);

  const text = encodeURIComponent(
    `🏟️ My Royal Turf booking is confirmed!

Booking ID: ${booking._id.slice(-6).toUpperCase()}

Date: ${start.toLocaleDateString("en-IN")}

Time: ${formatTime(start)}

See you on the pitch!`
  );

  document.getElementById("share-whatsapp").href =
    `https://wa.me/?text=${text}`;
}

/* ===========================================
   CALENDAR
=========================================== */

function setupCalendar() {
  document.getElementById("add-to-calendar").addEventListener("click", e => {
    e.preventDefault();

    const start = new Date(booking.start);
    const end = new Date(booking.end);

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${toICSDate(start)}`,
      `DTEND:${toICSDate(end)}`,
      `SUMMARY:Royal Turf Booking (${booking._id.slice(-6).toUpperCase()})`,
      "LOCATION:36 Topsia Road, Uttar Panchannogram, Kolkata - 39",
      "DESCRIPTION:The Royal Turf Booking",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([ics], {
      type: "text/calendar",
    });

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = `RoyalTurf_${booking._id.slice(-6).toUpperCase()}.ics`;

    link.click();
  });
}

/* ===========================================
   MOBILE MENU
=========================================== */

function setupMobileMenu() {
  const btn = document.getElementById("mobile-menu-button");

  const menu = document.getElementById("mobile-menu");

  btn?.addEventListener("click", () => {
    menu?.classList.toggle("hidden");
  });
}

/* ===========================================
   HELPERS
=========================================== */

function formatTime(date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function toICSDate(date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
