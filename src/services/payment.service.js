import mongoose from "mongoose";

import Booking from "../models/booking.js";
import SlotLock from "../models/slotlock.js";
import FinanceIncome from "../models/FinanceIncome.model.js";

import { ApiError } from "../utils/ApiError.js";
import { calculateBookingAmount } from "../utils/pricing.js";
import { sendBookingConfirmationNotifications } from "./notification.service.js";

export const completeSuccessfulPayment = async ({
  razorpayOrderId,
  razorpayPaymentId,
  lockId,
}) => {
  const existingBooking = await Booking.findOne({
    razorpayPaymentId,
  }).lean();

  if (existingBooking) {
    return {
      bookingId: existingBooking._id,
      advancePaid: existingBooking.advanceAmount,
      remainingToPay: existingBooking.remainingAmount,
      alreadyProcessed: true,
    };
  }

  const existingOrder = await Booking.findOne({
    razorpayOrderId,
  }).lean();

  if (existingOrder) {
    return {
      bookingId: existingOrder._id,
      advancePaid: existingOrder.advanceAmount,
      remainingToPay: existingOrder.remainingAmount,
      alreadyProcessed: true,
    };
  }

  // MongoDB transaction to ensure atomicity of operations using ACID properties.

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const lock = await SlotLock.findOne({
      _id: lockId,
      status: "HELD",
      expiresAt: { $gt: new Date() },
    }).session(session);

    if (!lock) {
      throw new ApiError(409, "Slot already consumed or expired");
    }

    if (lock.razorpayOrderId !== razorpayOrderId) {
      throw new ApiError(400, "Order does not belong to this slot lock");
    }

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
        session,
      }
    );

    if (!consumedLock) {
      throw new ApiError(409, "Slot already consumed");
    }

    const pricing = calculateBookingAmount(
      consumedLock.start,
      consumedLock.end
    );

    const totalAmount = pricing.total;
    const advanceAmount = pricing.advance;
    const remainingAmount = totalAmount - advanceAmount;

    const booking = new Booking({
      slotLock: consumedLock._id,

      start: consumedLock.start,
      end: consumedLock.end,

      status: "PAID",

      customerName: consumedLock.customerName,
      customerEmail: consumedLock.customerEmail,
      customerPhone: consumedLock.customerPhone,

      totalAmount,
      advanceAmount,
      remainingAmount,

      razorpayOrderId,
      razorpayPaymentId,

      paymentDate: new Date(),
    });

    await booking.save({ session });

    await FinanceIncome.create(
      [
        {
          bookingId: booking._id,
          amount: advanceAmount,
          paymentMethod: "RAZORPAY",
          status: "SUCCESS",
          transactionRef: razorpayPaymentId,
        },
      ],
      { session }
    );

    await session.commitTransaction();

    try {
      await sendBookingConfirmationNotifications(booking);
    } catch (notificationError) {
      console.error("Notification Error:", notificationError);
    }

    return {
      bookingId: booking._id,
      advancePaid: advanceAmount,
      remainingToPay: remainingAmount,
      alreadyProcessed: false,
    };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    throw error;
  } finally {
    await session.endSession();
  }
};
