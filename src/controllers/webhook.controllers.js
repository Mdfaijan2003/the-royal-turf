// src/controllers/webhook.controller.js

import crypto from "crypto";

import SlotLock from "../models/slotlock.js";
import WebhookEvent from "../models/webhookEvent.js";

import { completeSuccessfulPayment } from "../services/payment.service.js";

export const razorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(signature, "utf8");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const payload = JSON.parse(req.body.toString());

    if (payload.event !== "payment.captured") {
      return res.status(200).json({
        success: true,
        ignored: true,
      });
    }

    if (!payload?.payload?.payment?.entity) {
      return res.status(200).json({
        success: true,
        ignored: true,
      });
    }

    const eventId = payload.contains?.id;

    if (eventId) {
      const alreadyReceived = await WebhookEvent.findOne({
        eventId,
      });

      if (alreadyReceived) {
        console.log(`[Webhook] Duplicate Event: ${eventId}`);

        return res.status(200).json({
          success: true,
          duplicate: true,
        });
      }
    }

    const payment = payload.payload.payment.entity;

    const razorpayPaymentId = payment.id;
    const razorpayOrderId = payment.order_id;

    const lock = await SlotLock.findOne({
      razorpayOrderId,
    });

    if (!lock) {
      console.warn(
        `[Webhook] SlotLock not found for Order: ${razorpayOrderId}`
      );

      return res.status(200).json({
        success: true,
        ignored: true,
      });
    }

    const result = await completeSuccessfulPayment({
      lockId: lock._id,
      razorpayOrderId,
      razorpayPaymentId,
    });

    if (eventId) {
      await WebhookEvent.create({
        eventId,
      });
    }

    if (result.alreadyProcessed) {
      console.log(`[Webhook] Payment ${razorpayPaymentId} already processed`);
    } else {
      console.log(
        `[Webhook] Booking created successfully for payment ${razorpayPaymentId}`
      );
    }

    return res.status(200).json({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (err) {
    console.error("[Webhook Error]", err);

    return next(err);
  }
};
