import express from "express";
import {
  listBookings,
  cancelBooking,
  getBookingSuccess,
} from "../controllers/booking.controllers.js";
const bookingRouter = express.Router();
bookingRouter.get("/", listBookings);
bookingRouter.get("/success/:token", getBookingSuccess);
bookingRouter.post("/:id/cancel", cancelBooking);
export default bookingRouter;
