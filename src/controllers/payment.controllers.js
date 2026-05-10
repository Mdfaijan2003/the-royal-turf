import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import Booking from "../models/booking.js";
import SlotLock from "../models/slotlock.js";
import { computeSlotsForDate } from "../controllers/slots.controllers.js";
import FinanceIncome from "../models/FinanceIncome.model.js";


import { sendBookingConfirmationNotifications } from "../services/notification.service.js";

/**
 * ================================
 * CREATE RAZORPAY ORDER
 * POST /api/payments/create-order
 * ================================
 */
export const createOrder = async (req, res) => {
  try {
    const { lockId, totalAmount } = req.body;

    if (!lockId || !totalAmount) {
      return res.status(400).json({
        error: "lockId and totalAmount are required",
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
    const advanceAmount = Math.round(totalAmount * 0.3);

    // Razorpay order ONLY for advance
    const order = await razorpay.orders.create({
      amount: advanceAmount * 100, // paise
      currency: "INR",
      receipt: `advance_${lockId}`,
    });

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
      customerName,
      customerEmail,
      customerPhone,
      totalAmount,
    } = req.body;

    // 🔐 Verify Razorpay signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    /*
    // Validate lock
    const lock = await SlotLock.findOne({//
      _id: lockId,
      status: "HELD",
      expiresAt: { $gt: new Date() },
    });

    if (!lock) {
      return res.status(400).json({ error: "Slot lock expired or invalid" });
    }
    */

    // Step 1: Find lock (NO status filter here yet)
    const lock = await SlotLock.findById(lockId);

    if (!lock) {
      return res.status(404).json({ error: "Slot lock not found" });
    }

    // Step 2: Check expired
    if (lock.expiresAt < new Date()) {
      return res.status(410).json({
        error: "Slot time expired before payment completion",
      });
    }

    // Step 3: Check minimum remaining time
    const MIN_TIME_LEFT_MS = 60 * 1000; // 1 minute
    const timeLeft = lock.expiresAt - Date.now();

    if (timeLeft < MIN_TIME_LEFT_MS) {
      return res.status(409).json({
        error:
          "Not enough time left to complete payment. Please retry booking.",
        timeLeft,
      });
    }

    // Step 4: Check lock status
    if (lock.status !== "HELD") {
      return res.status(409).json({
        error: "Slot already consumed or released",
      });
    }

    // 🧮 Calculate amounts
    const advanceAmount = Math.round(totalAmount * 0.3);
    const remainingAmount = totalAmount - advanceAmount;

    // ✅ Create booking AFTER advance payment
    const booking = await Booking.create({
      slotLock: lock._id,
      start: lock.start,
      end: lock.end,
      status: "PAID",
      customerName,
      customerEmail,
      customerPhone,
      totalAmount,
      advanceAmount,
      remainingAmount,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paymentDate: new Date(),
    });

    // 🔒 Consume lock
    lock.status = "CONSUMED";
    await lock.save();

    // Notifications
    sendBookingConfirmationNotifications(booking).catch(console.error);

    await FinanceIncome.create({
      bookingId: booking._id,
      amount: advanceAmount,
      paymentMethod: "RAZORPAY",
      status: "SUCCESS",
      transactionRef: razorpay_payment_id,
    });

    res.json({
      success: true,
      bookingId: booking._id,
      advancePaid: advanceAmount,
      remainingToPay: remainingAmount,
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ error: "Payment verification error" });
  }
};
