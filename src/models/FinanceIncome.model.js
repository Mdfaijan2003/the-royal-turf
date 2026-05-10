import mongoose from "mongoose";
const financeIncomeSchema = new mongoose.Schema({
  bookingId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  paymentMethod: String,
  status: String,
  transactionRef: String,
  receivedAt: { type: Date, default: Date.now }
});

export default mongoose.model("FinanceIncome", financeIncomeSchema);
