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

  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
  },
});

// TTL Index
slotLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SlotLock = mongoose.model("SlotLock", slotLockSchema);

export default SlotLock;
