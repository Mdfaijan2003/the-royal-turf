import { dom } from "./dom.js";
import { showModal } from "./modal.js";
import { state } from "./state.js";

export async function startPayment(lockId, bookingData) {
  try {
    if (!lockId) {
      showModal("Error", "Slot lock missing", "error");
      return;
    }

    dom.paymentButton.disabled = true;

    //CREATE ORDER (ADVANCE PAYMENT ONLY)
    const res = await fetch("/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lockId,
        totalAmount: bookingData.totalFee, // full amount
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Payment initiation failed");

    const options = {
      key: data.key,
      amount: data.amount,
      currency: data.currency,
      order_id: data.orderId,
      name: "The Royal Turf",
      description: "Turf Booking Advance Payment",

      handler: async response => {
        //VERIFY PAYMENT
        try {
          const verifyRes = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,

              lockId,
              customerName: bookingData.name,
              customerEmail: bookingData.email,
              customerPhone: bookingData.phone,
              totalAmount: bookingData.totalFee,
              paymentMethod: "ONLINE",
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok || !verifyData.success) {
            showModal("Verification Failed", verifyData.error, "error");
            dom.paymentButton.disabled = false;
            return;
          }

          //PAYMENT SUCCESS — TRANSITION LOCK → BOOKING

          // state.bookingId = verifyData.bookingId;
          // localStorage.setItem("bookingId", verifyData.bookingId);

          // state.booking.advance = verifyData.advancePaid;
          // state.booking.remainingToPay = verifyData.remainingToPay;

          state.holdLockId = null;
          localStorage.removeItem("heldLock");

          // UI transitions
          // dom.paymentSection.classList.add("hidden");
          // document
          //   .getElementById("confirmation-section")
          //   ?.classList.remove("hidden");

          // dom.downloadSlipButton.classList.remove("hidden");

          showModal("Success", "Booking confirmed!", "success");

          setTimeout(() => {
            window.location.href = `/booking-confirmation/${verifyData.bookingAccessToken}`;
          }, 1200);
        } catch (err) {
          dom.paymentButton.disabled = false;

          showModal("Payment Verification Failed", err.message, "error");
        }
      },

      modal: {
        ondismiss: () => {
          dom.paymentButton.disabled = false;

          showModal("Cancelled", "Payment cancelled", "warning");
        },
      },

      prefill: {
        name: bookingData.name,
        email: bookingData.email,
        contact: bookingData.phone,
      },
      redirect: false,
    };

    new Razorpay(options).open();
  } catch (err) {
    dom.paymentButton.disabled = false;
    showModal("Payment Error", err.message, "error");
  }
}
