import { dom } from "./dom.js";
import { state } from "./state.js";
import { showModal } from "./modal.js";

export function startCountdown(expiresAt) {
  if (!expiresAt) return;

  // Clear existing timer safely
  if (state.holdTimer) {
    clearInterval(state.holdTimer);
    state.holdTimer = null;
  }

  const expMs = new Date(expiresAt).getTime();

  function tick() {
    const diff = expMs - Date.now();

    // Hold expired
    if (diff <= 0) {
      clearInterval(state.holdTimer);
      state.holdTimer = null;

      if (!state.holdLockId) return;

      //Clear temp storage & state
      localStorage.removeItem("heldBooking");
      state.holdLockId = null;
      state.booking.paymentStatus = "IDLE";

      //Update UI safely
      if (dom.countdownTimer) dom.countdownTimer.textContent = "00:00";
      if (dom.paymentButton) dom.paymentButton.disabled = true;

      showModal(
        "Booking Expired",
        "Your held slot expired. Please select a slot again.",
        "error"
      );

      return;
    }

    //Update countdown display
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (dom.countdownTimer) {
      dom.countdownTimer.textContent = `${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
  }

  //Initial render + interval
  tick();
  state.holdTimer = setInterval(tick, 1000);
}
