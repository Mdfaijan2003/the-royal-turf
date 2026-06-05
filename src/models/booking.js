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
      enum: ["PAID", "CANCELLED", "PARTIAL"],
      required: true,
    },

    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },

    // 💰 MONEY (VERY IMPORTANT)
    totalAmount: {
      type: Number,
      required: true,
    },

    advanceAmount: {
      type: Number,
      required: true,
    },

    remainingAmount: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["ONLINE", "CASH"],
      default: "ONLINE",
    },

    paymentGateway: {
      type: String,
      default: "RAZORPAY",
    },

    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
    },

    razorpayPaymentId: {
      type: String,
      unique: true,
      sparse: true,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },
    //new added
    completed: { type: Boolean, default: false },
    completedAt: Date,
    cancelledAt: Date,
    manualPayments: [
      {
        amount: Number,
        method: String, // CASH | UPI | OTHER
        date: Date,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
