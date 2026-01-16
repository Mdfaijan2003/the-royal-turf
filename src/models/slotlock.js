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
    index: true, // important for TTL
  },

  status: {
    type: String,
    enum: ["HELD", "CONSUMED", "CANCELLED"],
    default: "HELD",
  },
});

// ⏱ Auto-delete expired locks
slotLockSchema.index(
  { expireAfterSeconds: 0 }
);

const SlotLock = mongoose.model("SlotLock", slotLockSchema);
export default SlotLock;
