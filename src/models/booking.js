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
      enum: ["PAID", "CANCELLED"],
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
      enum: ["ONLINE"],
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
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
