import mongoose from 'mongoose';
import Booking from '../models/booking.js';
import SlotLock from '../models/slotlock.js';
import { sendEmailConfirmation, sendWhatsAppConfirmation } from '../utils/notifications.js';

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
