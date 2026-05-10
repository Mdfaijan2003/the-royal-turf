import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: [
        "MAINTENANCE",
        "UTILITIES",
        "SALARY",
        "MARKETING",
        "RENT",
        "WATER",
        "INTERNET",
        "SUPPLIES",
        "EQUIPMENT",
        "MISC",
      ],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    paidVia: {
      type: String,
      enum: ["CASH", "UPI", "BANK"],
      required: true,
    },

    expenseDate: {
      type: Date,
      required: true,
    },

    notes: {
      type: String,
      trim: true,
    },

    linkedSalary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Salary",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

expenseSchema.index({ expenseDate: -1 });
expenseSchema.index({ category: 1 });

export default mongoose.model("Expense", expenseSchema);
