import { decodeBookingAccessToken } from "./bookingToken.service.js";
import { getBookingById } from "./booking.service.js";

export const getBookingFromAccessToken = async token => {
  const payload = decodeBookingAccessToken(token);

  return getBookingById(payload.bookingId);
};
