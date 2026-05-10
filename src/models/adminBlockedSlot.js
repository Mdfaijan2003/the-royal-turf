import mongoose from "mongoose";

const adminBlockedSlotSchema = new mongoose.Schema(
  {
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    reason: { type: String, default: "ADMIN_BLOCK" },
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

adminBlockedSlotSchema.index({ start: 1, end: 1 });

export default mongoose.model("AdminBlockedSlot", adminBlockedSlotSchema);
