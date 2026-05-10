// models/FinanceSettings.js
import mongoose from "mongoose";

const financeSettingsSchema = new mongoose.Schema(
  {
    cashReserveAmount: {
      type: Number,
      required: true,
      default: 0,
    },

    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
    lastUpdatedOn: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("FinanceSettings", financeSettingsSchema);
