export const dom = {};

// Ensure DOM is fully loaded before querying elements
document.addEventListener("DOMContentLoaded", () => {
  dom.fullNameInput = document.getElementById("name");
  dom.emailInput = document.getElementById("email");
  dom.phoneInput = document.getElementById("phone");
  dom.dateInput = document.getElementById("date");
  dom.fetchBookingBtn = document.getElementById("fetch-bookings-btn");
  dom.checkSlotsBtn = document.getElementById("check-slots");
  dom.slotSelectedDate = document.getElementById("slotDate");

  dom.bookingForm = document.getElementById("booking-form");
  dom.startTime = document.getElementById("start-time");
  dom.endTime = document.getElementById("end-time");
  
  dom.selectedTime = document.getElementById("selected-time");
  dom.bookingFees = document.getElementById("booking-fees");
  dom.advanceAmount = document.getElementById("advance-amount");
  dom.totalPayable = document.getElementById("total-payable");
  dom.confirmButton = document.getElementById("confirm-pay");
  
  dom.bookingSection = document.getElementById("booking-section");
  dom.paymentSection = document.getElementById("payment-section");
  dom.countdownTimer = document.getElementById("countdown-timer");

  dom.paymentButton = document.getElementById("payment-button");
  dom.cancelPaymentButton = document.getElementById("cancel-payment-button");

  dom.confirmationMessage = document.getElementById("confirmation-section");
  dom.downloadSlipButton = document.getElementById("download-slip");

  // DEV SAFETY CHECK (remove in production)
  Object.entries(dom).forEach(([key, value]) => {
    if (!value) {
      console.warn(`⚠️ DOM element missing: ${key}`);
    }
  });
});
