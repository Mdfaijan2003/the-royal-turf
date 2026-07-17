import Booking from "../models/booking.js";
import { ApiError } from "../utils/ApiError.js";

export const getBookingById = async bookingId => {
  const booking = await Booking.findById(bookingId)
    .select(
      `
      customerName
      customerEmail
      customerPhone
      start
      end
      totalAmount
      advanceAmount
      remainingAmount
      paymentMethod
      paymentGateway
      paymentDate
      createdAt
      `
    )
    .lean();

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  return booking;
};
