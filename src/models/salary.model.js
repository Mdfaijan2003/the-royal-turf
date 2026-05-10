import mongoose from "mongoose";

const salarySchema = new mongoose.Schema(
  {
    staff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
      index: true,
    },

    month: {
      type: String, // format: YYYY-MM (e.g. 2026-01)
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentType: {
      type: String,
      enum: ["Monthly", "Withdrawal", "Profit Share", "Daily Wage", "Other"],
      required: true,
    },

    status: {
      type: String,
      enum: ["Paid", "Pending"],
      default: "Pending",
      index: true,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

/**
 * 🔐 Prevent duplicate salary entry
 * One staff → one salary → per month
 */
salarySchema.index(
  { staff: 1, month: 1 },
  { unique: true }
);

export default mongoose.model("Salary", salarySchema);
