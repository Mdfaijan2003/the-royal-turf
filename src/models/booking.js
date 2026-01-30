import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    slotLock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SlotLock",
      required: true,
    },

    start: { type: Date, required: true },
    end: { type: Date, required: true },

    status: {
      type: String,
      enum: ["PAID", "PARTIAL", "CANCELLED"],
      required: true,
      default: "PARTIAL"
    },

    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },

    // MONEY HANDLING
    totalAmount: { type: Number, required: true },
    advanceAmount: { type: Number, required: true },
    remainingAmount: { type: Number, required: true },

    paymentMethod: {
      type: String,
      enum: ["ONLINE", "MANUAL"],
      default: "ONLINE",
    },

    paymentGateway: {
      type: String,
      default: "RAZORPAY",
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    // Completed booking
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },

    // Manual cash/upi payments
    manualPayments: {
      type: [
        {
          amount: Number,
          method: String, // CASH | UPI | OTHER
          date: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// VIRTUAL: totalPaid calculation
bookingSchema.virtual("totalPaid").get(function () {
  const manual = this.manualPayments.reduce((acc, p) => acc + p.amount, 0);
  return this.advanceAmount + manual;
});

// VIRTUAL: paymentStatus
bookingSchema.virtual("paymentStatus").get(function () {
  if (this.status === "CANCELLED") return "CANCELLED";
  if (this.remainingAmount === 0) return "PAID";
  return "PARTIAL";
});

export default mongoose.model("Booking", bookingSchema);
