import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import Booking from "../models/booking.js";
import SlotLock from "../models/slotlock.js";
import { computeSlotsForDate } from "../controllers/slots.controllers.js";
import FinanceIncome from "../models/FinanceIncome.model.js";
import { calculateBookingAmount } from "../utils/pricing.js";

import { completeSuccessfulPayment } from "../services/payment.service.js";
import { sendBookingConfirmationNotifications } from "../services/notification.service.js";

/**
 * ================================
 * CREATE RAZORPAY ORDER
 * POST /api/payments/create-order
 * ================================
 */
export const createOrder = async (req, res) => {
  try {
    const { lockId } = req.body;

    if (!lockId) {
      return res.status(400).json({
        error: "lockId is required",
      });
    }

    // Validate lock
    const lock = await SlotLock.findOne({
      _id: lockId,
      status: "HELD",
      expiresAt: { $gt: new Date() },
    });

    if (!lock) {
      return res.status(400).json({ error: "Slot lock expired or invalid" });
    }

    // 🧮 Calculate advance (30%)
    const pricing = calculateBookingAmount(lock.start, lock.end);

    const totalAmount = pricing.total;
    const advanceAmount = pricing.advance;

    if (lock.razorpayOrderId) {
      return res.json({
        orderId: lock.razorpayOrderId,
        advanceAmount,
        totalAmount,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID,
      });
    }

    // Razorpay order ONLY for advance
    const order = await razorpay.orders.create({
      amount: advanceAmount * 100, // paise
      currency: "INR",
      receipt: `advance_${lockId}`,
    });

    await SlotLock.findOneAndUpdate(
      {
        _id: lockId,
        razorpayOrderId: null,
      },
      {
        razorpayOrderId: order.id,
      }
    );

    res.json({
      orderId: order.id,
      advanceAmount,
      totalAmount,
      currency: "INR",
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: "Failed to create Razorpay order" });
  }
};

/**
 * ================================
 * VERIFY PAYMENT
 * POST /api/payments/verify
 * ================================
 */
export const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      lockId,
    } = req.body;

    // 🔐 Verify Razorpay signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(razorpay_signature, "utf8");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({
        error: "Payment verification failed",
      });
    }

    const result = await completeSuccessfulPayment({
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      lockId,
      // customerName,
      // customerEmail,
      // customerPhone,
    });

    console.log("Payment verification result:", result);

    return res.json({
      success: true,
      bookingId: result.bookingId,
      advancePaid: result.advancePaid,
      remainingToPay: result.remainingToPay,
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    if (err.code === 11000) {
      return res.status(409).json({
        error: "Payment already processed",
      });
    }
    res.status(500).json({ error: "Payment verification error" });
  }
};
