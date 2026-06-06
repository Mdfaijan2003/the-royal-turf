import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import Booking from "../models/booking.js";
import SlotLock from "../models/slotlock.js";
import { computeSlotsForDate } from "../controllers/slots.controllers.js";
import FinanceIncome from "../models/FinanceIncome.model.js";
import { calculateBookingAmount } from "../utils/pricing.js";

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
      customerName,
      customerEmail,
      customerPhone,
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

    const existingBooking = await Booking.findOne({
      razorpayPaymentId: razorpay_payment_id,
    });

    if (existingBooking) {
      return res.json({
        success: true,
        bookingId: existingBooking._id,
        advancePaid: existingBooking.advanceAmount,
        remainingToPay: existingBooking.remainingAmount,
        alreadyProcessed: true,
      });
    }

    const existingOrder = await Booking.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (existingOrder) {
      return res.json({
        success: true,
        bookingId: existingOrder._id,
        advancePaid: existingOrder.advanceAmount,
        remainingToPay: existingOrder.remainingAmount,
        alreadyProcessed: true,
      });
    }

    // Step 1: Find lock WITHOUT consuming it
    const lock = await SlotLock.findOne({
      _id: lockId,
      status: "HELD",
      expiresAt: { $gt: new Date() },
    });

    if (!lock) {
      return res.status(409).json({
        error: "Slot already consumed or expired",
      });
    }

    // Step 2: Verify order belongs to lock
    if (lock.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({
        error: "Order does not belong to this slot lock",
      });
    }

    // Step 3: Consume lock atomically
    const consumedLock = await SlotLock.findOneAndUpdate(
      {
        _id: lockId,
        status: "HELD",
        expiresAt: { $gt: new Date() },
      },
      {
        status: "CONSUMED",
      },
      {
        new: true,
      }
    );

    if (!consumedLock) {
      return res.status(409).json({
        error: "Slot already consumed",
      });
    }

    // Step 3: Check minimum remaining time
    // const MIN_TIME_LEFT_MS = 60 * 1000; // 1 minute
    // const timeLeft = lock.expiresAt - Date.now();

    // if (timeLeft < MIN_TIME_LEFT_MS) {
    //   return res.status(409).json({
    //     error:
    //       "Not enough time left to complete payment. Please retry booking.",
    //     timeLeft,
    //   });
    // }

    // Step 4: Check lock status
    // if (lock.status !== "HELD") {
    //   return res.status(409).json({
    //     error: "Slot already consumed or released",
    //   });
    // }

    // 🧮 Calculate amounts
    const pricing = calculateBookingAmount(
      consumedLock.start,
      consumedLock.end
    );
    const totalAmount = pricing.total;
    const advanceAmount = pricing.advance;
    const remainingAmount = totalAmount - advanceAmount;

    // ✅ Create booking AFTER advance payment
    const booking = await Booking.create({
      slotLock: consumedLock._id,
      start: consumedLock.start,
      end: consumedLock.end,
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

    // // 🔒 Consume lock
    // lock.status = "CONSUMED";
    // await lock.save();

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
    if (err.code === 11000) {
      return res.status(409).json({
        error: "Payment already processed",
      });
    }
    res.status(500).json({ error: "Payment verification error" });
  }
};
