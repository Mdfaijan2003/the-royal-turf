import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    unique: true,
  },

  receivedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("WebhookEvent", webhookEventSchema);
