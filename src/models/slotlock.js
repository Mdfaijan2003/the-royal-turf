import mongoose from "mongoose";

const slotLockSchema = new mongoose.Schema({
  start: {
    type: Date,
    required: true,
  },

  end: {
    type: Date,
    required: true,
  },

  expiresAt: {
    type: Date,
    required: true,
  },

  status: {
    type: String,
    enum: ["HELD", "CONSUMED", "CANCELLED"],
    default: "HELD",
  },

  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, required: true },

  razorpayOrderId: {
    type: String,
    default: null,
  },

  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
  },
});

// TTL Index
slotLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SlotLock = mongoose.model("SlotLock", slotLockSchema);

export default SlotLock;
