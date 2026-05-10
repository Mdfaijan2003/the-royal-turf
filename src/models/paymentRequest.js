import mongoose from "mongoose";

const paymentRequestSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    orderId: { type: String, required: true },
    amount: { type: Number, required: true },
    note: String,
    status: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED"],
      default: "PENDING",
    },
    paidAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("PaymentRequest", paymentRequestSchema);
