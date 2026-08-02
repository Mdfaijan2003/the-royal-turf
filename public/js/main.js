import { dom } from "./dom.js";
import { state } from "./state.js";
import { holdSlot } from "./api.js";
import { calculateAmount } from "./pricing.js";
import { showModal } from "./modal.js";
import { startCountdown } from "./timer.js";
import { startPayment } from "./payment.js";
import { updateAvailableSlots, populateEndTimes } from "./slots.js";
import loader from "./loader.js";

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
     RESTORE Payment Page
  ================================ */

  const paymentInProgress = localStorage.getItem("paymentInProgress");

  if (paymentInProgress) {
    const paymentState = JSON.parse(paymentInProgress);
    const elapsedTime = Date.now() - paymentState.timestamp;

    // If payment was successful, redirect
    if (paymentState.status === "success") {
      loader.show("Completing your booking...");
      setTimeout(() => {
        window.location.href = `/booking-confirmation/${paymentState.bookingAccessToken}`;
      }, 500);
      return;
    }

    // If still verifying after 30 seconds, something went wrong
    if (paymentState.status === "verifying" && elapsedTime > 30000) {
      localStorage.removeItem("paymentInProgress");
      showModal("Error", "Payment verification timeout", "error");
      return;
    }

    // If still verifying within 30 seconds, show loader
    if (paymentState.status === "verifying") {
      loader.show("Completing payment verification...");
    }
  }
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

  // Price toggle functionality
  const toggleBtns = document.querySelectorAll(".toggle-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  toggleBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;

      // Update active button
      toggleBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // Show/hide content
      tabContents.forEach(content => {
        if (content.dataset.tab === targetTab) {
          content.style.display = "block";
          content.classList.add("active");
        } else {
          content.style.display = "none";
          content.classList.remove("active");
        }
      });
    });
  });

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
  dom.dateInput.addEventListener("change", async () => {
    await loader.execute(async () => {
      state.booking.date = dom.dateInput.value;

      state.booking.startTime = "";
      state.booking.endTime = "";

      dom.startTime.value = "";
      dom.endTime.value = "";

      resetSummary();
      await updateAvailableSlots();
      saveForm();
    }, "Loading Slots please wait...");
  });

  /* ===============================
     TIME CHANGE
  ================================ */
  dom.startTime.addEventListener("change", async () => {
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

    const formattedDate = new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      weekday: "short",
      month: "short",
      year: "numeric",
    });

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
    dom.selectedDate.textContent = formattedDate;
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
    await loader.execute(async () => {
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
    }, "Processing your booking...");
  });

  /* ===============================
     PAYMENT
  ================================ */
  dom.paymentButton.addEventListener("click", async () => {
    await loader.execute(async () => {
      dom.paymentButton.disabled = true;
      dom.paymentButton.textContent = "Redirecting...";
      dom.cancelPaymentButton.disabled = true;

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
        dom.cancelPaymentButton.disabled = false;
      }
    }, "Opening Razorpay please wait...");
  });

  dom.cancelPaymentButton.addEventListener("click", async () => {
    dom.cancelPaymentButton.disabled = true;
    dom.cancelPaymentButton.textContent = "Cancelling...";
    dom.paymentButton.disabled = true;

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

  // dom.downloadSlipButton.addEventListener("click", () => {
  //   dom.downloadSlipButton.disabled = true;
  //   dom.downloadSlipButton.textContent = "Generating...";

  //   try {
  //     console.log("Download clicked — state.booking:", state.booking);
  //     generatePDF();
  //   } catch (error) {
  //     showModal("Error", error.message, "error");
  //   } finally {
  //     dom.downloadSlipButton.disabled = false;
  //     dom.downloadSlipButton.textContent = "Download Slip";
  //   }
  // });
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
