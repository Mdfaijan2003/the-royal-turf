import { dom } from "./dom.js";
import { showModal } from "./modal.js";
import { state } from "./state.js";
import loader from "./loader.js";

const message = [
  "Please wait while we verify your payment...",
  "Creating your booking...",
  "Please don't refresh or close this page.",
];
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
        loader.show(message);
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
            loader.hide();
            return;
          }
          dom.paymentButton.disabled = true;

          //PAYMENT SUCCESS — TRANSITION LOCK → BOOKING

          // state.bookingId = verifyData.bookingId;
          // localStorage.setItem("bookingId", verifyData.bookingId);

          // state.booking.advance = verifyData.advancePaid;
          // state.booking.remainingToPay = verifyData.remainingToPay;

          state.holdLockId = null;
          localStorage.removeItem("heldLock");
          loader.hide();

          // UI transitions
          // dom.paymentSection.classList.add("hidden");
          // document
          //   .getElementById("confirmation-section")
          //   ?.classList.remove("hidden");

          // dom.downloadSlipButton.classList.remove("hidden");

          showModal("Success", "Booking confirmed!", "success");

          setTimeout(() => {
            dom.paymentButton.disabled = false;
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

// export async function startPayment(lockId, bookingData) {
//   try {
//     if (!lockId) {
//       showModal("Error", "Slot lock missing", "error");
//       return;
//     }

//     dom.paymentButton.disabled = true;

//     // CREATE ORDER
//     const res = await fetch("/api/payments/create-order", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         lockId,
//         totalAmount: bookingData.totalFee,
//       }),
//     });

//     const data = await res.json();
//     if (!res.ok) throw new Error(data.error || "Payment initiation failed");

//     const options = {
//       key: data.key,
//       amount: data.amount,
//       currency: data.currency,
//       order_id: data.orderId,
//       name: "The Royal Turf",
//       description: "Turf Booking Advance Payment",

//       handler: async response => {
//         // ✅ STORE PAYMENT STATE BEFORE VERIFICATION
//         localStorage.setItem(
//           "paymentInProgress",
//           JSON.stringify({
//             status: "verifying",
//             orderId: data.orderId,
//             timestamp: Date.now(),
//           })
//         );

//         loader.show("Processing payment...");

//         try {
//           // VERIFY PAYMENT
//           const verifyRes = await fetch("/api/payments/verify", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({
//               razorpay_order_id: response.razorpay_order_id,
//               razorpay_payment_id: response.razorpay_payment_id,
//               razorpay_signature: response.razorpay_signature,
//               lockId,
//               customerName: bookingData.name,
//               customerEmail: bookingData.email,
//               customerPhone: bookingData.phone,
//               totalAmount: bookingData.totalFee,
//               paymentMethod: "ONLINE",
//             }),
//           });

//           const verifyData = await verifyRes.json();

//           if (!verifyRes.ok || !verifyData.success) {
//             // ✅ CLEAR PAYMENT STATE ON ERROR
//             localStorage.removeItem("paymentInProgress");
//             loader.hide();
//             showModal("Verification Failed", verifyData.error, "error");
//             dom.paymentButton.disabled = false;
//             return;
//           }

//           // ✅ UPDATE STATE TO SUCCESS BEFORE REDIRECT
//           localStorage.setItem(
//             "paymentInProgress",
//             JSON.stringify({
//               status: "success",
//               bookingAccessToken: verifyData.bookingAccessToken,
//               timestamp: Date.now(),
//             })
//           );

//           loader.show("Payment successful! Redirecting...");

//           // Clear old booking data
//           state.holdLockId = null;
//           localStorage.removeItem("heldLock");
//           dom.paymentSection.classList.add("hidden");

//           // Wait 1 second before redirecting
//           await new Promise(resolve => setTimeout(resolve, 1000));

//           // REDIRECT
//           window.location.href = `/booking-confirmation/${verifyData.bookingAccessToken}`;
//         } catch (err) {
//           // ✅ CLEAR PAYMENT STATE ON ERROR
//           localStorage.removeItem("paymentInProgress");
//           loader.hide();
//           dom.paymentButton.disabled = false;
//           showModal("Payment Verification Failed", err.message, "error");
//         }
//       },

//       modal: {
//         ondismiss: () => {
//           // ✅ CLEAR PAYMENT STATE IF USER CLOSES RAZORPAY
//           localStorage.removeItem("paymentInProgress");
//           dom.paymentButton.disabled = false;
//           showModal("Cancelled", "Payment cancelled", "warning");
//         },
//       },

//       prefill: {
//         name: bookingData.name,
//         email: bookingData.email,
//         contact: bookingData.phone,
//       },
//       redirect: false,
//     };

//     new Razorpay(options).open();
//   } catch (err) {
//     dom.paymentButton.disabled = false;
//     showModal("Payment Error", err.message, "error");
//   }
// }
