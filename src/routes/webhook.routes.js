import express from "express";
import {
  handlePaymentWebhook,
  razorpayWebhook,
} from "../controllers/webhook.controllers.js";

// Use only one router
const webHookrouter = express.Router();

// Default webhook
webHookrouter.post("/", handlePaymentWebhook);

// Razorpay webhook
webHookrouter.post("/razorpay", razorpayWebhook);

export default webHookrouter;
