import mongoose from "mongoose";

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["director", "admin", "staff", "investor", "developer"],
      required: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },

    active: {
      type: Boolean,
      default: true, // soft-disable staff if needed
    },
  },
  { timestamps: true }
);

export default mongoose.model("Staff", staffSchema);
