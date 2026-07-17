import jwt from "jsonwebtoken";

import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export const createBookingAccessToken = bookingId => {
  return jwt.sign(
    {
      bookingId,
      type: "booking",
    },
    env.BOOKING_ACCESS_TOKEN_SECRET,
    {
      expiresIn: "24h",
    }
  );
};

export const decodeBookingAccessToken = token => {
  try {
    return jwt.verify(token, env.BOOKING_ACCESS_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired booking link");
  }
};
