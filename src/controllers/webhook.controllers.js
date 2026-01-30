import mongoose from 'mongoose';
import Booking from '../models/booking.js';
import SlotLock from '../models/slotlock.js';
import { sendEmailConfirmation, sendWhatsAppConfirmation } from '../utils/notifications.js';
import PaymentRequest from "../models/paymentRequest.js";
import { sendPaymentRequestEmail } from "../services/notification.service.js";

export async function handlePaymentWebhook(req, res) {
  res.sendStatus(200); // Quick response before processing

  // Example, adapt to your provider's payload/headers
  const { orderId, paymentId, signature } = req.body;

  // Optional: Verify signature here...

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findOne({ orderId }).session(session);
      if (!booking || booking.status === 'PAID') return;

      booking.status = 'PAID';
      booking.paymentId = paymentId;
      await booking.save({ session });

      await SlotLock.deleteMany({ start: booking.start, end: booking.end }).session(session);
    });
    // Trigger notifications (async)
    sendEmailConfirmation(booking).catch(console.error);
    sendWhatsAppConfirmation(booking).catch(console.error);
  } catch (err) {
    console.error('Webhook processing error:', err);
  } finally {
    session.endSession();
  }
}


export const razorpayWebhook = async (req, res) => {
  try {
    const payment = req.body.payload.payment.entity;

    const request = await PaymentRequest.findOne({
      orderId: payment.order_id,
    });

    if (!request) return res.json({ status: "ignored" });

    const booking = await Booking.findById(request.booking);

    booking.payments.push({
      amount: request.amount,
      method: "ONLINE",
      gatewayOrderId: payment.order_id,
      gatewayPaymentId: payment.id,
      date: new Date(),
    });

    booking.remainingAmount -= request.amount;

    if (booking.remainingAmount <= 0) {
      booking.remainingAmount = 0;
      booking.completed = true;
      booking.completedAt = new Date();
    }

    await booking.save();

    request.status = "PAID";
    await request.save();

    await sendPaymentRequestEmail({
      to: booking.customerEmail,
      name: booking.customerName,
      amount: request.amount,
    });

    return res.json({ status: "ok" });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ status: "failed" });
  }
};
