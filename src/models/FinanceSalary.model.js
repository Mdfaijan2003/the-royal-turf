import mongoose from "mongoose";

const financeSalarySchema = new mongoose.Schema(
{
  staffName: { type: String, required: true },
  role: { type: String, required: true },

  paymentType: {
    type: String,
    enum: ["MONTHLY", "DAILY", "PER_MATCH"],
    required: true
  },

  salaryMonth: {
    type: String, // YYYY-MM
    required: true
  },

  amount: { type: Number, required: true },

  status: {
    type: String,
    enum: ["PAID", "PENDING"],
    default: "PENDING"
  },

  paidOn: Date,

  notes: String,

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true
  }
},
{ timestamps: true }
);

export default mongoose.model("FinanceSalary", financeSalarySchema);
