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
    index: true,
    // default: null,  // important for TTL
  },

  status: {
    type: String,
    enum: ["HELD", "CONSUMED", "CANCELLED"],
    default: "HELD",
  },

  blockedReason: String,

  blockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin"
  },
},
{ timestamps: true }
);

// ⏱ Auto-delete expired locks
// slotLockSchema.index(
//   { expireAfterSeconds: 0 }
// );

//new
slotLockSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
    partialFilterExpression: { status: "HELD" },
  }
);

const SlotLock = mongoose.model("SlotLock", slotLockSchema);
export default SlotLock;
