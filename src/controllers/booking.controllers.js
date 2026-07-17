import Booking from "../models/booking.js";
import SlotLock from "../models/slotlock.js";
import dayjs from "dayjs";
import mongoose from "mongoose";
import { getBookingFromAccessToken } from "../services/bookingSuccess.service.js";

export async function listBookings(req, res) {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const now = new Date();
  const bookings = await Booking.find({
    customerEmail: email,
    start: { $gt: now },
    status: "PAID",
  })
    .sort({ start: 1 })
    .lean();
  // We can add cancelled bookings if needed

  res.json(bookings);
}

export async function cancelBooking(req, res) {
  const { id } = req.params;

  const booking = await Booking.findById(id);
  if (!booking) {
    return res.status(404).json({ error: "Booking not found" });
  }

  if (booking.status !== "PAID") {
    return res
      .status(400)
      .json({ error: "Only paid bookings can be cancelled" });
  }

  if (dayjs(booking.start).isBefore(dayjs())) {
    return res.status(400).json({
      error: "Cannot cancel past or ongoing booking",
    });
  }

  booking.status = "CANCELLED";
  await booking.save();

  res.json({
    message: "Booking cancelled successfully",
    booking,
  });
}

export const getBookingSuccess = async (req, res, next) => {
  try {
    const booking = await getBookingFromAccessToken(req.params.token);

    return res.status(200).json({
      success: true,
      booking,
    });
  } catch (err) {
    next(err);
  }
};
